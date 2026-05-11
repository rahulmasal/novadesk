import ldap from "ldapjs";
import prisma from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export interface LdapConfig {
  url: string;
  baseDn: string;
  bindDn: string;
  bindPassword: string;
  userSearchBase: string;
  userSearchFilter: string;
  usernameAttribute: string;
  emailAttribute: string;
  nameAttribute: string;
  departmentAttribute: string;
  enabled: boolean;
  autoCreateUsers: boolean;
  defaultRole: string;
}

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

const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000;

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

export async function authenticateWithLdap(
  username: string,
  password: string
): Promise<{ success: boolean; user?: unknown; error?: string }> {
  const config = getLdapConfig();

  if (!config.enabled) {
    return { success: false, error: "LDAP authentication is disabled" };
  }

  return new Promise((resolve) => {
    const client = ldap.createClient({
      url: config.url,
      timeout: 10000,
      connectTimeout: 10000,
    });

    client.on("error", (err: Error) => {
      console.error("[LDAP] Connection error:", err.message);
      resolve({ success: false, error: "LDAP connection failed" });
    });

    client.bind(config.bindDn, config.bindPassword, (bindErr) => {
      if (bindErr) {
        console.error("[LDAP] Bind error:", bindErr.message);
        client.destroy();
        resolve({ success: false, error: "LDAP bind failed" });
        return;
      }

      const searchFilter = config.userSearchFilter.replace("{{username}}", username);
      const opts: ldap.SearchOptions = {
        filter: searchFilter,
        scope: "sub",
        attributes: [config.usernameAttribute, config.emailAttribute, config.nameAttribute, config.departmentAttribute],
      };

      client.search(config.userSearchBase, opts, (searchErr, res) => {
        if (searchErr) {
          console.error("[LDAP] Search error:", searchErr.message);
          client.destroy();
          resolve({ success: false, error: "LDAP search failed" });
          return;
        }

        let userEntry: ldap.SearchEntry | null = null;

        res.on("searchEntry", (entry) => {
          userEntry = entry;
        });

        res.on("error", (err: Error) => {
          console.error("[LDAP] Search result error:", err.message);
          client.destroy();
          resolve({ success: false, error: "LDAP search failed" });
        });

        res.on("end", async () => {
          if (!userEntry) {
            client.destroy();
            resolve({ success: false, error: "User not found in LDAP directory" });
            return;
          }

          const userDn = userEntry.dn.toString();

          client.bind(userDn, password, async (authErr) => {
            if (authErr) {
              console.error("[LDAP] Auth error:", authErr.message);
              client.destroy();
              resolve({ success: false, error: "Invalid credentials" });
              return;
            }

            const attrs = userEntry!.attributes || [];
            const getAttr = (name: string): string => {
              const attr = attrs.find((a: { type: string }) => a.type === name);
              return attr?.values?.[0]?.toString() || "";
            };

            const ldapEmail = getAttr(config.emailAttribute);
            const ldapName = getAttr(config.nameAttribute);
            const ldapDepartment = getAttr(config.departmentAttribute);
            const ldapUsername = getAttr(config.usernameAttribute);

            console.log(`[LDAP] User authenticated: ${ldapUsername}`);

            if (config.autoCreateUsers) {
              try {
                const existingUser = await prisma.user.findUnique({
                  where: { email: ldapEmail || `${ldapUsername}@ldap.local` },
                });

                let user;
                if (existingUser) {
                  user = existingUser;
                } else {
                  user = await prisma.user.create({
                    data: {
                      email: ldapEmail || `${ldapUsername}@ldap.local`,
                      password: "LDAP_AUTH",
                      name: ldapName || ldapUsername,
                      department: ldapDepartment || "General",
                      role: (config.defaultRole as "ADMINISTRATOR" | "AGENT" | "END_USER") || "END_USER",
                    },
                  });
                }

                const sessionToken = uuidv4();
                await prisma.session.create({
                  data: {
                    userId: user.id,
                    token: sessionToken,
                    expiresAt: new Date(Date.now() + SESSION_EXPIRY_MS),
                  },
                });

                client.destroy();
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { password: _pw, ...safeUser } = user;
                resolve({ success: true, user: { ...safeUser, source: "ldap" } });
              } catch (dbErr) {
                console.error("[LDAP] Database error:", dbErr);
                client.destroy();
                resolve({ success: false, error: "Failed to create session" });
              }
            } else {
              client.destroy();
              resolve({ success: false, error: "Auto-create users is disabled" });
            }
          });
        });
      });
    });
  });
}