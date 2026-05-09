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
- Added `flex-shrink-0` to all four action buttons (Assign dropdown, Assign to me, Status dropdown, Delete)
- Unified button styling with `gap-1.5`, `px-3 py-1.5`, `min-w-[100px]`, `text-xs font-medium`
- Fixed indentation of Quick Actions section
- Committed and pushed changes to GitHub
- Updated knowledge graph with graphify
- Created database backup scripts using `pg_dump` with Prisma fallback
- Created database restore scripts supporting SQL file uploads
- Added `/api/backup/database` API endpoint for SQL dumps with fallback
- Added database backup UI (Generate SQL Dump button)
- Added SQL database restore functionality in Backup.tsx
- Enhanced ticket search to include username, hostname, serial, createdBy, and priority
- Added "Created" column to ticket table showing creation date

### In Progress
- (none)

### Blocked
- (none)

## Key Decisions
- Added `flex-shrink-0` class to prevent buttons from shrinking in flex containers when window width is large
- Database backup uses `pg_dump` when available, falls back to Prisma JSON export for portability
- Ticket search now searches across 6 fields for comprehensive results

## Next Steps
- (none)

## Critical Context
- Original issue: status button had different padding (`px-2.5`) and gap (`gap-1`) compared to other buttons
- Database backup requires PostgreSQL client tools (pg_dump/psql) for native SQL dumps; Prisma fallback generates compatible SQL

## Relevant Files
- `src/components/TicketDetail.tsx`: Contains the action buttons that needed sizing fixes
- `src/components/Backup.tsx`: Database backup/restore interface with both JSON and SQL options
- `src/components/TicketTable.tsx`: Ticket table with enhanced search
- `src/app/api/backup/database/route.ts`: Database backup API endpoint (GET/POST)
- `scripts/db-backup.js`: CLI script for database backup
- `scripts/db-restore.js`: CLI script for database restore
