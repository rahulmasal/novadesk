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
- Added custom column selection for reports with 14 available columns
- Added report type filtering (All, By Status, By Priority, By Category, By Department)
- Fixed SQL restore parser to handle multi-row INSERT statements
- Added Settings component with notifications, appearance, backup, advanced settings
- SettingsContext now loads settings from DB on mount (DB only, no localStorage)
- Added notification permission request when push notifications enabled
- Added ticket assignment notification in API route
- Added CSS `.dark` and `.light` class support for theme switching with proper background colors
- Digital clock displayed in sidebar below NovaDesk logo with gradient styling
- Updated seed-tickets.js to generate 1000 random end-users with sample tickets
- Added page size selection (10/25/50/100/200/500/All) to UserManagement
- Added row selection checkboxes and bulk delete for UserManagement
- Added progress modal for bulk delete operations
- Fixed dual title issue in UserManagement and Reports components
- Added LDAP/Active Directory authentication support with ldapjs
- LDAP users auto-created in DB with `source: "ldap"` flag
- Login component has provider toggle (Local/LDAP) when LDAP enabled

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- Added `flex-shrink-0` class to prevent buttons from shrinking in flex containers when window width is large
- Database backup uses `pg_dump` when available, falls back to Prisma JSON export for portability
- Ticket search now searches across 6 fields for comprehensive results
- Report type filters: status=NEW, priority=URGENT/HIGH, category=Hardware, department=IT
- Default selected columns include: ID, Title, Status, Priority, Category, Department, Created At
- SQL restore parser now properly handles multi-row INSERT statements with correct value parsing
- UserManagement page size selection matches TicketTable format (10/25/50/100/200/500/All)
- LDAP authentication uses ldapjs library with auto-create users feature
- LDAP users get `source: "ldap"` flag in user object for identification
- Login component shows provider toggle only when LDAP_ENABLED=true in environment

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
