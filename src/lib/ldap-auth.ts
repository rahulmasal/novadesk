/**
 * ============================================================================
 * LDAP AUTHENTICATION MODULE - Active Directory / LDAP Integration
 * ============================================================================
 *
 * This module handles authentication against LDAP/Active Directory servers.
 * It allows users to log in using their AD credentials instead of local passwords.
 *
 * WHAT IT DOES:
 * 1. Connects to LDAP server using configured credentials
 * 2. Searches for the user in the directory
 * 3. Validates their password by binding with their DN
 * 4. Optionally creates the user in local database if not exists
 * 5. Creates a session token for the authenticated user
 *
 * BEGINNER NOTES:
 * - LDAP (Lightweight Directory Access Protocol) is used by Active Directory
 * - ldapjs is a Node.js library for LDAP client connections
 * - "Bind" in LDAP means authenticating/connecting with credentials
 * - DN (Distinguished Name) is like a full path to a user in the directory
 * - "Search" finds users, "Bind" verifies passwords
 *
 * ENVIRONMENT VARIABLES (set in .env.local):
 * - LDAP_ENABLED=true - Enable LDAP authentication
 * - LDAP_URL=ldap://your-ad-server:389 - LDAP server address
 * - LDAP_BASE_DN=dc=example,dc=com - Base DN for searches
 * - LDAP_BIND_DN - Admin DN to search for users
 * - LDAP_BIND_PASSWORD - Admin password
 * - LDAP_USER_SEARCH_BASE - Where to search for users
 * - LDAP_USER_SEARCH_FILTER - Filter to find users (use {{username}} placeholder)
 * - LDAP_AUTO_CREATE=true - Create users in DB if not found
 * - LDAP_DEFAULT_ROLE=END_USER - Default role for new LDAP users
 *
 * @module /lib/ldap-auth
 */

import ldap from "ldapjs";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

/**
 * LDAP Configuration interface - defines all configurable LDAP options
 */
export interface LdapConfig {
  url: string;                 // LDAP server URL (e.g., ldap://192.168.1.100:389)
  baseDn: string;              // Base Distinguished Name for all operations
  bindDn: string;              // DN of service account for searching
  bindPassword: string;        // Password for service account
  userSearchBase: string;      // OU to search for users (e.g., ou=users,dc=company,dc=com)
  userSearchFilter: string;    // LDAP filter to find user (e.g., "(uid={{username}})")
  usernameAttribute: string;   // Attribute containing username (e.g., "uid" or "sAMAccountName")
  emailAttribute: string;      // Attribute containing email (e.g., "mail")
  nameAttribute: string;       // Attribute containing display name (e.g., "cn" or "displayName")
  departmentAttribute: string; // Attribute containing department (e.g., "department")
  enabled: boolean;            // Whether LDAP auth is enabled
  autoCreateUsers: boolean;    // Whether to create users in DB if not found
  defaultRole: string;         // Default role for new LDAP users
}

/**
 * Default LDAP configuration values
 * Used when environment variables are not set
 */
export const LDAP_DEFAULTS: LdapConfig = {
  url: "ldap://localhost:389",
  baseDn: "dc=example,dc=com",
  bindDn: "cn=admin,dc=example,dc=com",
  bindPassword: "",
  userSearchBase: "ou=users,dc=example,dc=com",
  userSearchFilter: "(uid={{username}})",
  usernameAttribute: "uid",
  emailAttribute: "mail",
  nameAttribute: "cn",
  departmentAttribute: "department",
  enabled: false,
  autoCreateUsers: true,
  defaultRole: "END_USER",
};

/**
 * Session expiry in milliseconds = 24 hours
 * Same as local authentication
 */
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

/**
 * Get LDAP configuration from environment variables
 * Falls back to defaults if not set
 *
 * @returns LdapConfig object with settings from env or defaults
 */
function getLdapConfig(): LdapConfig {
  return {
    url: process.env.LDAP_URL || LDAP_DEFAULTS.url,
    baseDn: process.env.LDAP_BASE_DN || LDAP_DEFAULTS.baseDn,
    bindDn: process.env.LDAP_BIND_DN || LDAP_DEFAULTS.bindDn,
    bindPassword: process.env.LDAP_BIND_PASSWORD || LDAP_DEFAULTS.bindPassword,
    userSearchBase: process.env.LDAP_USER_SEARCH_BASE || LDAP_DEFAULTS.userSearchBase,
    userSearchFilter: process.env.LDAP_USER_SEARCH_FILTER || LDAP_DEFAULTS.userSearchFilter,
    usernameAttribute: process.env.LDAP_USERNAME_ATTR || LDAP_DEFAULTS.usernameAttribute,
    emailAttribute: process.env.LDAP_EMAIL_ATTR || LDAP_DEFAULTS.emailAttribute,
    nameAttribute: process.env.LDAP_NAME_ATTR || LDAP_DEFAULTS.nameAttribute,
    departmentAttribute: process.env.LDAP_DEPT_ATTR || LDAP_DEFAULTS.departmentAttribute,
    enabled: process.env.LDAP_ENABLED === "true",
    autoCreateUsers: process.env.LDAP_AUTO_CREATE !== "false",
    defaultRole: process.env.LDAP_DEFAULT_ROLE || LDAP_DEFAULTS.defaultRole,
  };
}

/**
 * Authenticate a user against LDAP/Active Directory
 *
 * This is the main function called by the login API route.
 * It performs the full LDAP authentication flow:
 *
 * 1. Check if LDAP is enabled
 * 2. Connect to LDAP server (create client)
 * 3. Bind with service account (to search for users)
 * 4. Search for the user in the directory
 * 5. Extract user's DN and attributes
 * 6. Try to bind with user's credentials (password verification)
 * 7. Create/find user in local database
 * 8. Create session token
 * 9. Return user info and token
 *
 * @param username - The username (without domain) to authenticate
 * @param password - The user's password
 * @returns Promise resolving to success/failure with user object or error
 *
 * @example
 * const result = await authenticateWithLdap("john.doe", "secretPassword");
 * if (result.success) {
 *   console.log("Logged in as:", result.user.name);
 * }
 */
export interface LdapUser {
  id: string;
  email: string;
  name: string;
  role: string;
  department: string;
  source: string;
}

export async function authenticateWithLdap(
  username: string,
  password: string
): Promise<{ success: boolean; user?: LdapUser; error?: string }> {
  // Get configuration from env or defaults
  const config = getLdapConfig();

  // Check if LDAP is enabled
  if (!config.enabled) {
    return { success: false, error: "LDAP authentication is disabled" };
  }

  // Return a Promise to support async/await
  return new Promise((resolve) => {
    // Step 1: Create LDAP client with timeout settings
    const client = ldap.createClient({
      url: config.url,
      timeout: 10000,       // 10 second timeout for operations
      connectTimeout: 10000, // 10 second timeout for connection
    });

    // Handle connection errors
    client.on("error", (err: Error) => {
      console.error("[LDAP] Connection error:", err.message);
      resolve({ success: false, error: "LDAP connection failed" });
    });

    // Step 2: Bind to LDAP server with service account credentials
    // This allows us to search the directory for users
    client.bind(config.bindDn, config.bindPassword, (bindErr) => {
      if (bindErr) {
        console.error("[LDAP] Bind error:", bindErr.message);
        client.destroy();
        resolve({ success: false, error: "LDAP bind failed" });
        return;
      }

      // Step 3: Search for the user in the directory
      // Replace {{username}} placeholder with actual username
      const searchFilter = config.userSearchFilter.replace("{{username}}", username);

      const opts: ldap.SearchOptions = {
        filter: searchFilter,
        scope: "sub", // Search all subtrees
        attributes: [
          config.usernameAttribute,
          config.emailAttribute,
          config.nameAttribute,
          config.departmentAttribute
        ],
      };

      client.search(config.userSearchBase, opts, (searchErr, res) => {
        if (searchErr) {
          console.error("[LDAP] Search error:", searchErr.message);
          client.destroy();
          resolve({ success: false, error: "LDAP search failed" });
          return;
        }

        let userEntry: ldap.SearchEntry | null = null;

        // Capture the search result entry
        res.on("searchEntry", (entry) => {
          userEntry = entry;
        });

        // Handle search errors
        res.on("error", (err: Error) => {
          console.error("[LDAP] Search result error:", err.message);
          client.destroy();
          resolve({ success: false, error: "LDAP search failed" });
        });

        // Step 4: Process search results
        res.on("end", async () => {
          // Check if user was found
          if (!userEntry) {
            client.destroy();
            resolve({ success: false, error: "User not found in LDAP directory" });
            return;
          }

          // Get user's Distinguished Name for binding
          const userDn = userEntry.dn.toString();

          // Step 5: Try to bind with user's credentials (verify password)
          client.bind(userDn, password, async (authErr) => {
            if (authErr) {
              console.error("[LDAP] Auth error:", authErr.message);
              client.destroy();
              resolve({ success: false, error: "Invalid credentials" });
              return;
            }

            // Step 6: Extract user attributes from the entry
            const attrs = userEntry!.attributes || [];

            // Helper function to get attribute value
            const getAttr = (name: string): string => {
              const attr = attrs.find((a: { type: string }) => a.type === name);
              return attr?.values?.[0]?.toString() || "";
            };

            const ldapEmail = getAttr(config.emailAttribute);
            const ldapName = getAttr(config.nameAttribute);
            const ldapDepartment = getAttr(config.departmentAttribute);
            const ldapUsername = getAttr(config.usernameAttribute);

            console.log(`[LDAP] User authenticated: ${ldapUsername}`);

            // Step 7: Handle user creation in local database
            if (config.autoCreateUsers) {
              try {
                // Check if user already exists in local DB
                const existingUser = await prisma.user.findUnique({
                  where: { email: ldapEmail || `${ldapUsername}@ldap.local` },
                });

                let user;
                if (existingUser) {
                  // Use existing user
                  user = existingUser;
                } else {
                  // Create new user in database
                  user = await prisma.user.create({
                    data: {
                      email: ldapEmail || `${ldapUsername}@ldap.local`,
                      password: "LDAP_AUTH", // Marker indicating LDAP user
                      name: ldapName || ldapUsername,
                      department: ldapDepartment || "General",
                      role: (config.defaultRole as "ADMINISTRATOR" | "AGENT" | "END_USER") || "END_USER",
                    },
                  });
                }

                // Step 8: Create session token for the user
                const sessionToken = uuidv4();
                await prisma.session.create({
                  data: {
                    userId: user.id,
                    token: sessionToken,
                    expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS),
                  },
                });

                client.destroy();

                // Remove password from response
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { password: _pw, ...safeUser } = user;
                resolve({ success: true, user: { ...safeUser, source: "ldap" } });
              } catch (dbErr) {
                console.error("[LDAP] Database error:", dbErr);
                client.destroy();
                resolve({ success: false, error: "Failed to create session" });
              }
            } else {
              // Auto-create is disabled
              client.destroy();
              resolve({ success: false, error: "Auto-create users is disabled" });
            }
          });
        });
      });
    });
  });
}