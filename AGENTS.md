<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## graphify

This project has a graphify knowledge graph at graphify-out/.

Rules:
- Before answering architecture or codebase questions, read graphify-out/GRAPH_REPORT.md for god nodes and community structure
- If graphify-out/wiki/index.md exists, navigate it instead of reading raw files
- For cross-module "how does X relate to Y" questions, prefer `graphify query "<question>"`, `graphify path "<A>" "<B>"`, or `graphify explain "<concept>"` over grep — these traverse the graph's EXTRACTED + INFERRED edges instead of scanning files
- After modifying code files in this session, run `graphify update .` to keep the graph current (AST-only, no API cost)

## Progress
### Done
- Added file attachment support to TicketForm for creating tickets with initial files
- Fixed JSON backup/restore format mismatch - backup now includes all required user/ticket fields
- Fixed JSON backup restore to handle nested comments and auditLogs from ticket objects
- Fixed backup API to include password, hostname, laptopSerial, updatedAt for users
- Fixed backup API to include createdById, assignedTo, username, department for tickets
- Fixed Backup component to properly wrap restored data in { data: ... } format
- Fixed `any` types in database backup route by using Prisma generics
- Added custom column selection for reports with 14 available columns
- Added report type filtering (All, By Status, By Priority, By Category, By Department)
- Fixed SQL restore parser to handle multi-row INSERT statements
- Added Settings component with notifications, appearance, backup, advanced settings
- SettingsContext now loads settings from DB on mount (DB only, no localStorage)
- Added notification permission request when push notifications enabled
- Added ticket assignment notification in API route
- Added CSS `.dark` and `.light` class support for theme switching with proper background colors
- Digital clock displayed in sidebar below NovaDesk logo with gradient styling
- Updated seed-tickets.js to generate 5000 end-users and 10000 tickets with unique hostnames and laptop serials
- Fixed Settings component light theme styling with proper white backgrounds and dark text
- Added page size selection (10/25/50/100/200/500/All) to UserManagement
- Added row selection checkboxes and bulk delete for UserManagement
- Added progress modal for bulk delete operations
- Fixed dual title issue in UserManagement and Reports components
- Added LDAP/Active Directory authentication support with ldapjs
- LDAP users auto-created in DB with `source: "ldap"` flag
- Login component has provider toggle (Local/LDAP) when LDAP enabled
- Light theme now properly renders with light gray background (#f8fafc) and slate text colors
- ThemeLoader component loads theme from DB before initial render
- All settings cards now use proper white backgrounds with borders and shadows in light mode
- Settings page uses proper padding with space-y-6 between sections

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- Light theme uses `#f8fafc` background (slate-50), `#1e293b` text (slate-800)
- Components use solid white cards with `shadow-md` and `border-slate-200` for light theme
- Settings cards use proper padding (p-6) and gap (space-y-6) for spacing
- ThemeLoader component handles loading theme from DB before rendering
- Background now properly shows light gray (#f8fafc) instead of black in light mode

## Next Steps
- (none)

## Key Decisions
- Added `flex-shrink-0` class to prevent buttons from shrinking in flex containers when window width is large
- Database backup uses `pg_dump` when available, falls back to Prisma JSON export for portability
- Ticket search now searches across 6 fields for comprehensive results
- Report type filters: status=NEW, priority=URGENT/HIGH, category=Hardware, department=IT
- Default selected columns include: ID, Title, Status, Priority, Category, Department, Created At
- SQL restore parser now properly handles multi-row INSERT statements with correct value parsing
- UserManagement page size selection matches TicketTable format (10/25/50/100/200/500/All)

## Critical Context
- Settings now store to DB only (no localStorage). Loads from `/api/settings` on mount
- Theme changes apply via `html.dark`/`html.light` class toggling with CSS variable overrides
- Push notification permission triggers via browser Notification API when toggle is enabled
- Ticket assignment creates DB notification when `assignedTo` differs from current assignment
- Digital clock displayed in sidebar below NovaDesk logo with gradient styling
- Progress modal shows deletion progress for bulk user operations
- LDAP authentication supports both LDAP and Active Directory servers
- LDAP users are auto-created in local DB when `LDAP_AUTO_CREATE=true`
- Settings component uses `glass-light` utility class for light theme with white backgrounds and dark text

## Relevant Files
- `src/components/Settings.tsx`: Comprehensive Settings component with notifications, appearance, backup, and advanced settings
- `src/contexts/SettingsContext.tsx`: Settings provider loading from DB only, notification permission handling
- `src/app/api/settings/route.ts`: Settings API endpoint for saving/loading from database
- `src/app/api/tickets/route.ts`: Ticket API with assignment notification trigger
- `src/app/layout.tsx`: Root layout with theme class support
- `src/app/globals.css`: Dark/light theme CSS
- `src/components/Sidebar.tsx`: Sidebar with NovaDesk logo and embedded DigitalClock
- `src/lib/ldap-auth.ts`: LDAP authentication module with config and user sync
- `src/app/api/auth/login/route.ts`: Login route with LDAP provider support
- `src/components/Login.tsx`: Login component with auth provider toggle
- `src/app/api/backup/route.ts`: Backup API with complete user/ticket fields
- `src/app/api/backup/restore/route.ts`: Restore API handling nested comments/auditLogs
- `src/components/Backup.tsx`: Backup component with proper data wrapping
