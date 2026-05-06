<div align="center">
  <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="80" height="80" rx="16" fill="url(#gradient)"/>
    <circle cx="40" cy="32" r="16" stroke="white" stroke-width="4" fill="none"/>
    <path d="M40 48 L40 56" stroke="white" stroke-width="4" stroke-linecap="round"/>
    <path d="M32 56 L48 56" stroke="white" stroke-width="4" stroke-linecap="round"/>
    <circle cx="40" cy="32" r="6" fill="white"/>
    <defs>
      <linearGradient id="gradient" x1="0" y1="0" x2="80" y2="80">
        <stop offset="0%" stop-color="#3B82F6"/>
        <stop offset="100%" stop-color="#8B5CF6"/>
      </linearGradient>
    </defs>
  </svg>
  <h1 align="center">NovaDesk: IT Ticket Management System</h1>
  <p align="center">
    A modern, enterprise-grade IT Helpdesk Dashboard with role-based authentication, ticket management, real-time updates, and automated reporting built with Next.js 16, React 19, TypeScript, and Tailwind CSS v4.
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-16.2.4-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19.2.4-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind-v4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Prisma-7.8.0-2D3A4A?style=for-the-badge&logo=prisma" alt="Prisma" />
    <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  </p>
</div>

---

## 🎯 About NovaDesk

> **Your All-in-One IT Support Command Center** 🚀

**NovaDesk** is a comprehensive, open-source IT ticket management system designed for organizations of all sizes. Born from the need for a simple yet powerful helpdesk solution, NovaDesk provides separate interfaces and capabilities for **End Users** (employees submitting tickets), **Support Agents** (IT staff managing tickets), and **Administrators** (system managers with full access).

Whether you're handling hardware requests, network issues, software access, or general IT support, NovaDesk delivers an elegant, efficient, and secure experience built with modern web technologies.

### 🌍 Why NovaDesk?

| Feature               | Benefit                                                       |
| --------------------- | ------------------------------------------------------------- |
| **Open Source**       | Free to use, modify, and distribute under MIT License         |
| **Self-Hosted**       | Full control over your data - no vendor lock-in               |
| **Role-Based Access** | Secure multi-tenant architecture with granular permissions    |
| **Real-Time Updates** | Live ticket updates via Supabase subscriptions                |
| **Enterprise Ready**  | SLA tracking, audit logging, and compliance features          |

---

## ✨ Key Features (13 Total)

### 1. 🗄️ Prisma + PostgreSQL Database
- **ORM**: Prisma 7.8.0 with type-safe database access
- **Provider**: PostgreSQL (local or Supabase cloud)
- **Migrations**: Version-controlled schema migrations via Prisma Migrate
- **Models**: User, Ticket, Comment, Attachment, AuditLog, Session, Notification, KnowledgeBaseArticle, SlaEscalation, DashboardLayout

### 2. ☁️ Supabase Integration
- **Cloud Database**: Full PostgreSQL database hosted on Supabase
- **Real-time Subscriptions**: Live updates via Supabase postgres_changes
- **File Storage**: Bucket for ticket attachments with signed URLs
- **RLS Policies**: Row-level security for multi-tenant data isolation

### 3. ✅ Zod Validation
- **Input Validation**: All API endpoints validated with Zod 4.4.3 schemas
- **Type Inference**: Compile-time type safety from schema definitions
- **Error Handling**: Consistent error responses across all endpoints
- **Schemas**: User, Ticket, Comment, and Attachment input validation

### 4. 🔐 bcrypt Password Hashing
- **Secure Storage**: Passwords hashed with bcryptjs 3.0.3 (cost factor 10)
- **Login Verification**: Constant-time comparison to prevent timing attacks
- **Migration Ready**: Support for legacy plain-text password migration

### 5. 📡 Real-time Subscriptions
- **Live Updates**: Tickets, comments, and status changes in real-time
- **Supabase Integration**: WebSocket-based subscriptions via @supabase/supabase-js
- **Optimistic UI**: Instant feedback while maintaining data consistency
- **React Hooks**: Custom `useRealtime` hook for subscription management

### 6. 📎 File Attachments
- **Upload Support**: Attach files to tickets up to 50MB
- **Supabase Storage**: Organized bucket structure with signed URLs
- **Metadata Tracking**: filename, mimeType, size, uploader, timestamps
- **Cascade Delete**: Attachments removed when parent ticket is deleted

### 7. 📋 Audit Logging
- **Complete Trail**: All ticket changes logged with user, action, old/new values
- **Compliance**: AuditLog model with indexed queries for reporting
- **Service Layer**: `audit.ts` utility for programmatic audit entries
- **User Attribution**: Every change traced to the responsible user

### 8. 💬 Comments Threading
- **Nested Discussions**: Comment threads on each ticket
- **Author Tracking**: Comments linked to User model
- **Timestamps**: createdAt and updatedAt for all comments
- **Cascade Delete**: Comments removed when parent ticket is deleted

### 9. 📧 Email Notifications
- **SLA Alerts**: Automatic emails when tickets near breach
- **Assignment Notifications**: Agents notified when tickets assigned
- **Comment Alerts**: Users notified of new comments on their tickets
- **SMTP Integration**: Configurable via Nodemailer with TLS support

### 10. 📚 Knowledge Base
- **Self-Service**: Users can search existing solutions before submitting tickets
- **Categories & Tags**: Organize articles for easy discovery
- **View Tracking**: Count views to identify popular articles
- **Publishing Workflow**: Draft/published status for article management

### 11. ⏱️ SLA Escalation
- **Breach Tracking**: SlaEscalation model tracks warning and breach levels
- **Priority-Based SLA**: Auto-calculated due dates based on priority (Urgent: 4h, High: 8h, Medium: 24h, Low: 48h)
- **Escalation Timestamps**: Track when warning sent and when breached
- **Visual Indicators**: Progress bars showing time remaining

### 12. 🎨 Dashboard Customization
- **Drag-and-Drop**: @dnd-kit for widget reordering
- **Layout Persistence**: User-specific layouts stored in DashboardLayout model
- **Widget Visibility**: Toggle widgets on/off per user preference
- **Saved Layouts**: Layouts persist across sessions

### 13. 📱 PWA Support
- **Offline Capable**: Service worker for offline ticket viewing
- **Installable**: Add to home screen on mobile devices
- **Push Ready**: Web Push API integration structure
- **Manifest**: PWA manifest with app icons and theme colors

---

## 🛠️ Tech Stack

| Category           | Technology                                                  | Version    |
| ------------------ | ----------------------------------------------------------- | ---------- |
| **Core**           | Next.js                                                     | 16.2.4     |
|                     | React                                                       | 19.2.4     |
|                     | TypeScript                                                  | 5          |
| **Styling**        | Tailwind CSS                                                | v4         |
|                     | Lucide React (Icons)                                        | 1.14.0     |
|                     | Framer Motion                                               | 12.38.0    |
|                     | clsx, tailwind-merge                                        | Latest     |
| **State**          | Zustand (with localStorage persistence)                     | 5.0.13     |
| **Database**       | Prisma ORM                                                  | 7.8.0      |
|                     | PostgreSQL                                                  | 15+        |
|                     | Supabase (Cloud)                                            | 2.105.3    |
| **Validation**     | Zod (Input validation)                                       | 4.4.3      |
| **Security**       | bcryptjs (Password hashing)                                 | 3.0.3      |
| **Backend**        | Next.js API Routes (Serverless Functions)                   |            |
| **Automation**     | Node-Cron (Scheduled tasks)                                 | 4.2.1      |
|                     | Nodemailer (Email sending)                                  | 8.0.7      |
| **UI Components**  | @dnd-kit (Drag-and-drop)                                    | 6.3.1      |
|                     | Recharts (Analytics charts)                                 | 3.8.1      |
| **Utilities**      | date-fns (Date formatting)                                  | 4.1.0      |
|                     | uuid (ID generation)                                        | 14.0.0     |

---

## 🚀 Getting Started

### Option A: Cloud Setup with Supabase (Recommended)

#### 1. Create a Supabase Project

1. Sign up at [supabase.com](https://supabase.com)
2. Create a new project (choose a region close to your users)
3. Wait for the database to be provisioned

#### 2. Get Your Supabase Credentials

From your project dashboard, go to **Settings > API** and copy:

```env
# Supabase Connection
DATABASE_URL=postgresql://postgres.[project-ref]:[your-password]@db.[project-ref].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 3. Run Database Migrations

```bash
# Install Supabase CLI (if not already installed)
npm install -g supabase

# Generate Prisma Client
npx prisma generate

# Push schema to Supabase
npx prisma db push
```

#### 4. Set Up Storage Bucket

1. In Supabase Dashboard, go to **Storage**
2. Create a new bucket named `attachments`
3. Set public permissions for the bucket
4. Add RLS policies for authenticated access

#### 5. Enable Real-time (Optional)

1. Go to **Database > Replication** in Supabase Dashboard
2. Enable replication for tables: `tickets`, `comments`, `notifications`
3. Note: This requires a Pro plan

---

### Option B: Local PostgreSQL Setup

#### 1. Install PostgreSQL

**macOS:**
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:**
Download and install from [postgresql.org/download](https://www.postgresql.org/download/windows/)

#### 2. Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE novadesk;

# Create user (optional)
CREATE USER novadesk_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE novadesk TO novadesk_user;
```

#### 3. Configure Environment

```env
# Local PostgreSQL Connection
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/novadesk
```

#### 4. Generate Client & Push Schema

```bash
npx prisma generate
npx prisma db push
```

---

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================

# Option A: Supabase Cloud (recommended)
DATABASE_URL=postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# Option B: Local PostgreSQL (uncomment if using local DB)
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/novadesk

# ============================================
# SMTP CONFIGURATION (for Email Reports)
# ============================================
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password

# ============================================
# EMAIL DESTINATION
# ============================================
REPORT_RECIPIENT=manager@yourcompany.com

# ============================================
# SECURITY
# ============================================
# Secret key for authenticated cron endpoints
CRON_SECRET=your-secret-key-min-32-chars
# Generate with: openssl rand -base64 32

# ============================================
# APPLICATION
# ============================================
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note:** If using Gmail, generate an [App Password](https://support.google.com/accounts/answer/185833?hl=en) if 2-Step Verification is enabled.

---

### 4. Install Dependencies

```bash
git clone https://github.com/rahulmasal/novadesk.git
cd novadesk
npm install
```

---

### 5. Run Database Seeding (Optional)

```bash
# Seed demo data
npx prisma db seed

# Or create users manually via admin UI
```

---

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### 7. Start the Automated Scheduler (Optional)

For automated Daily and Monthly email reports:

```bash
npm run schedule
```

This runs two cron jobs:
- **Daily Report**: Every day at 23:59 (11:59 PM)
- **Monthly Report**: Last day of each month at 23:50 (11:50 PM)

---

## 🔑 Demo Accounts

After seeding, you can login with these accounts:

| Role              | Email                | Password        | Permissions                              |
| ----------------- | -------------------  | --------------- | ---------------------------------------- |
| **Administrator** | admin@novadesk.com   | Admin123!       | Full access, user management, delete     |
| **Agent**         | sarah@novadesk.com    | Sarah123!       | All tickets, no delete                    |
| **End User**      | mike@example.com      | Mike123!        | Own tickets only                         |

> **Password Requirements**: 8+ characters with uppercase, lowercase, and number

---

## 📂 Project Structure

```text
novadesk/
├── prisma/
│   ├── schema.prisma          # Database schema (Prisma models)
│   └── migrations/            # Database migrations
├── public/
│   └── manifest.json         # PWA manifest
├── scheduler.mjs              # Cron job scheduler for reports
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── attachments/route.ts      # File upload API
│   │   │   ├── audit/route.ts             # Audit logs API
│   │   │   ├── auth/login/route.ts        # Login/logout API
│   │   │   ├── cron/route.ts              # Report generation API
│   │   │   ├── dashboard/route.ts         # Dashboard layout API
│   │   │   ├── knowledge/route.ts         # Knowledge base API
│   │   │   ├── reports/route.ts           # Report export API
│   │   │   ├── tickets/
│   │   │   │   ├── route.ts              # Ticket CRUD API
│   │   │   │   └── [id]/comments/route.ts # Comments API
│   │   │   └── users/
│   │   │       ├── route.ts              # User management API
│   │   │       └── import/route.ts       # Bulk user import API
│   │   ├── layout.tsx                    # Root layout
│   │   └── page.tsx                      # Main dashboard page
│   ├── components/
│   │   ├── ActivityFeed.tsx             # Activity timeline
│   │   ├── Charts.tsx                   # Analytics visualizations
│   │   ├── DashboardBuilder.tsx         # Drag-drop dashboard
│   │   ├── KnowledgeBase.tsx             # Knowledge base UI
│   │   ├── Login.tsx                    # Authentication form
│   │   ├── Reports.tsx                   # CSV export UI
│   │   ├── Scorecards.tsx               # KPI summary cards
│   │   ├── Sidebar.tsx                  # Navigation sidebar
│   │   ├── TicketDetail.tsx             # Ticket view/edit
│   │   ├── TicketForm.tsx                # Create/edit ticket form
│   │   ├── TicketTable.tsx              # Paginated ticket list
│   │   └── UserManagement.tsx           # Admin user management
│   ├── hooks/
│   │   └── useRealtime.ts               # Real-time subscription hook
│   └── lib/
│       ├── audit.ts                     # Audit logging service
│       ├── csv.ts                       # CSV export utilities
│       ├── email.ts                     # SMTP email service
│       ├── prisma.ts                    # Prisma client singleton
│       ├── schemas.ts                   # Zod validation schemas
│       ├── store.ts                     # Zustand state management
│       ├── supabase.ts                  # Supabase client + storage
│       └── utils.ts                     # Helper functions
├── .env.local                          # Environment variables (gitignored)
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript config
└── README.md                           # This file
```

---

## 🔒 API Permissions

| Endpoint                         | Method | End User  | Agent     | Admin     |
| -------------------------------- | ------ | --------- | --------- | --------- |
| `/api/tickets`                   | GET    | Own only  | All       | All       |
| `/api/tickets`                   | POST   | ✅ Create | ✅ Create | ✅ Create |
| `/api/tickets`                   | PATCH  | ❌        | ✅ Update | ✅ Update |
| `/api/tickets`                   | DELETE | ❌        | ❌        | ✅ Delete |
| `/api/tickets/[id]/comments`     | GET    | Own only  | All       | All       |
| `/api/tickets/[id]/comments`     | POST   | ✅ Create | ✅ Create | ✅ Create |
| `/api/attachments`              | POST   | ✅ Upload | ✅ Upload | ✅ Upload |
| `/api/audit`                     | GET    | ❌        | ✅ View   | ✅ View   |
| `/api/auth/login`               | POST   | ✅ Login  | ✅ Login  | ✅ Login  |
| `/api/auth/login`               | DELETE | ✅ Logout | ✅ Logout | ✅ Logout |
| `/api/dashboard`                | GET    | ✅        | ✅        | ✅        |
| `/api/dashboard`                | PATCH  | ✅        | ✅        | ✅        |
| `/api/knowledge`                 | GET    | ✅        | ✅        | ✅        |
| `/api/knowledge`                | POST   | ❌        | ✅ Create | ✅ Create |
| `/api/users`                    | GET    | ❌        | ❌        | ✅ List   |
| `/api/users`                    | POST   | ❌        | ❌        | ✅ Create |
| `/api/users/import`             | POST   | ❌        | ❌        | ✅ Bulk   |
| `/api/reports`                  | GET    | ❌        | ✅ Export | ✅ Export |
| `/api/cron`                     | POST   | ❌        | ❌        | ✅ Secret |

---

## 🗄️ Database Models

### Core Models

| Model                 | Description                                              |
| --------------------- | -------------------------------------------------------- |
| **User**             | System users with roles (ADMIN/AGENT/END_USER)           |
| **Ticket**           | IT support tickets with full metadata tracking           |
| **Session**          | Authentication sessions with Bearer token expiry          |

### Extended Models

| Model                     | Description                                      |
| ------------------------- | ------------------------------------------------ |
| **Comment**               | Threaded discussions on tickets                   |
| **Attachment**            | File attachments with metadata                   |
| **AuditLog**              | Complete change audit trail                      |
| **KnowledgeBaseArticle**  | Self-service knowledge articles                  |
| **SlaEscalation**         | SLA breach tracking and alerts                  |
| **DashboardLayout**       | User-specific dashboard widget layouts           |
| **Notification**          | Queued email/web notifications                   |

### Enums

| Enum                | Values                                           |
| ------------------- | ------------------------------------------------ |
| **Role**            | ADMINISTRATOR, AGENT, END_USER                   |
| **Priority**        | LOW, MEDIUM, HIGH, URGENT                        |
| **Category**        | HARDWARE, SOFTWARE, NETWORK, ACCESS               |
| **Status**          | NEW, IN_PROGRESS, PENDING_VENDOR, RESOLVED, CLOSED|
| **NotificationType**| TICKET_CREATED, TICKET_UPDATED, TICKET_ASSIGNED, SLA_WARNING, SLA_BREACH, COMMENT_ADDED |

---

## 📊 SLA Configuration

SLA due dates are automatically calculated based on priority:

| Priority | Response Time | Description            |
| -------- | ------------- | ---------------------- |
| **URGENT** | 4 hours      | Critical system down   |
| **HIGH**   | 8 hours      | Major functionality impaired |
| **MEDIUM** | 24 hours     | Minor functionality impacted |
| **LOW**    | 48 hours     | General inquiries      |

---

## 🧑‍💻 For Contributors

We welcome contributions from developers of all skill levels! Whether you're:

- 🆕 **New to open source** - Found a bug? Open an issue!
- 🎓 **Learning React/Next.js** - Explore our clean, well-commented codebase
- 🛠️ **Experienced developer** - Submit PRs with new features or improvements

Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting PRs.

---

## 📈 Built for Real-World Use

NovaDesk isn't just a demo project - it's designed to handle real IT support workflows including:

- **Hardware Issues** - Laptop crashes, peripheral failures, equipment requests
- **Software Problems** - Application errors, installation requests, licensing
- **Network Issues** - Connectivity problems, VPN access, firewall rules
- **Access Management** - Password resets, account provisioning, permissions

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check the [issues page](https://github.com/rahulmasal/novadesk/issues).

---

<p align="center">
  Built with ❤️ by NovaDesk Team
</p>
