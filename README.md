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
  <h1 align="center">NovaDesk</h1>
  <p align="center">
    Open Source IT Ticket Management System — Full control, no vendor lock-in.
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-16.2.4-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19.2.4-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind-v4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Prisma-5.22.0-2D3A4A?style=for-the-badge&logo=prisma" alt="Prisma" />
    <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
    <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="MIT License" />
  </p>
</div>

---

## ✨ Why NovaDesk?

| Feature | Description |
| -------------------------------- | ------------------------------------------------------------ |
| 🟢 **Open Source & Self-Hosted** | Full control over your data with no vendor lock-in |
| 🟢 **No Per-Agent Pricing** | Add unlimited agents without extra cost |
| 🟢 **Modern Stack** | Built with Next.js 16, React 19, TypeScript, Tailwind CSS v4 |

---

## 🎯 Features

### 1. Open Source & Self-Hosted

Customize, extend, and deploy the helpdesk the way you want. Full control over your data with no vendor lock-in. Your server, your rules.

### 2. No Per-Agent Pricing

Add as many agents as you need without worrying about license costs. Scale your support team freely as your organization grows.

### 3. Centralized Ticketing

Manage tickets from email, portal, and forms in one unified workspace. Clear assignments, full conversation history, and real-time status updates.

### 4. SLA Rules & Escalations

Set response and resolution targets with automated alerts and escalations. Keep your team on track with visual SLA progress indicators.

### 5. Customer Portal & Knowledge Base

Let users raise tickets and find answers on their own. A self-service portal with searchable knowledge base reduces ticket volume.

### 6. Custom Workflows & Automation

Auto-assign tickets based on rules, add custom fields, and extend features with the modular architecture. Tailor the system to your workflow.

### 7. Dashboards & Reporting

Monitor performance with real-time dashboards and analytics charts. Export detailed reports in CSV format for stakeholder updates. Customize report columns with 14 available fields and filter by status, priority, category, or department.

### 8. User Management

Manage users with bulk operations, page size selection, and row selection for efficient administration. Delete multiple users at once with progress tracking.

### 9. Settings & Customization

Configure notifications, appearance (light/dark theme), backup options, and advanced settings. All settings stored in database for consistency across sessions.

### 10. LDAP / Active Directory Authentication

Seamlessly integrate with your organization's Active Directory. Users can authenticate using their corporate LDAP credentials with auto-provisioning support. Toggle between Local and LDAP authentication on the login page when enabled.

### 11. Software Updates

Check for software updates directly from the admin Settings page. Configure an update server URL to enable automatic version checking and receive notifications about new releases.

### 12. Backup & Restore

Full system backup and restore with JSON export/import. Database-level SQL dump for PostgreSQL direct restore. Both automated scheduled backups and manual exports available.

### 13. Mobile Ready (PWA)

Use it like an app on your phone with offline support, push notifications, and installable Progressive Web App (PWA).

---

## ⚡ Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ (local or Supabase cloud)

### 1. Clone & Install

```bash
git clone https://github.com/rahulmasal/novadesk.git
cd novadesk
npm install
```

### 2. Configure Environment

Create a `.env` file with your database connection string:

```env
# Database Connection (PostgreSQL)
DATABASE_URL=postgresql://postgres:password@localhost:5432/novadesk

# Security - Generate with: openssl rand -hex 32
CRON_SECRET=your-secure-random-string-here

# Application
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=NovaDesk

# SMTP Email (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
REPORT_RECIPIENT=admin@company.com

# LDAP / Active Directory (optional)
NEXT_PUBLIC_LDAP_ENABLED=false
LDAP_ENABLED=false
LDAP_URL=ldap://localhost:389
LDAP_BIND_DN=cn=admin,dc=company,dc=com
LDAP_BIND_PASSWORD=your-password
LDAP_SEARCH_BASE=dc=company,dc=com
LDAP_SEARCH_FILTER=(sAMAccountName={{username}})

# Software Updates (optional)
UPDATE_SERVER_URL=https://updates.example.com/version.json
```

### 3. Initialize Database

```bash
npx prisma generate
npx prisma db push
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The Setup Wizard will guide you through initial configuration.

---

## 🐳 Docker Setup (Recommended for Production)

### Using Docker Compose

Docker Compose includes PostgreSQL for a complete, self-contained setup.

```bash
# Create environment file with secure password
cp .env.example .env

# Edit .env with your settings (especially POSTGRES_PASSWORD and CRON_SECRET)
nano .env

# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Using Docker Manually

```bash
# Build the image
docker build -t novadesk:latest .

# Run with environment variables
docker run -d \
  --name novadesk \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e CRON_SECRET="your-secure-secret" \
  novadesk:latest
```

---

## 📦 All Installation Options

### Option 1: Supabase Cloud (Recommended for Quick Setup)

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your connection string from **Settings > API**
3. Run migrations:

```bash
npx prisma generate
npx prisma db push
```

4. (Optional) Create a storage bucket named `attachments` in Supabase Dashboard

### Option 2: Local PostgreSQL

**macOS:**

```bash
brew install postgresql@15
brew services start postgresql@15
```

**Ubuntu/Debian:**

```bash
sudo apt update && sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:** Download from [postgresql.org/download](https://www.postgresql.org/download/windows/)

Create the database:

```bash
psql -U postgres
CREATE DATABASE novadesk;
```

Then update `DATABASE_URL` in `.env` and run migrations.

### Option 3: Docker with External Database

Point to any PostgreSQL 15+ instance:

```bash
docker run -d \
  --name novadesk \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@external-host:5432/db" \
  -e CRON_SECRET="your-secure-secret" \
  novadesk:latest
```

---

## 🔑 Initial Setup & Demo Accounts

On first run, the **Setup Wizard** will guide you through creating the first admin user. After setup:

| Role              | Email                 | Password      | Access                               |
| ----------------- | --------------------- | ------------- | ------------------------------------ |
| **Administrator** | admin@novadesk.com    | (your choice) | Full access, user management, delete |
| **Agent**         | (create during setup) |               | All tickets, no delete               |
| **End User**      | (self-register)       |               | Own tickets only                     |

> **Password Requirements:** 8+ characters with uppercase, lowercase, and number

---

## 🛠️ Tech Stack

| Category       | Technology                                        |
| -------------- | ------------------------------------------------- |
| **Frontend**   | Next.js 16.2.4, React 19.2.4, TypeScript 5, Tailwind CSS v4 |
| **Database**   | Prisma ORM 5.22.0, PostgreSQL 15+                 |
| **State**      | Zustand 5 with localStorage persistence           |
| **UI**         | Lucide Icons, Framer Motion 12, Recharts 3, @dnd-kit  |
| **Backend**    | Next.js API Routes, Node-cron, Nodemailer         |
| **Validation** | Zod 4.4.3                                         |
| **Security**   | bcryptjs 3.0.3, ldapjs 3.0.7                       |

---

## 📂 Project Structure

```
novadesk/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── logo.svg           # App logo
│   └── icon.svg           # PWA icon
├── scheduler.mjs          # Cron job scheduler for reports
├── scripts/               # Utility scripts
│   ├── seed-tickets.js    # Generate test data
│   ├── db-backup.js       # Database backup
│   └── db-restore.js       # Database restore
├── src/
│   ├── app/
│   │   ├── api/           # API routes
│   │   │   ├── auth/       # Login, password
│   │   │   ├── tickets/    # Ticket CRUD
│   │   │   ├── users/      # User management
│   │   │   ├── backup/     # Backup/restore
│   │   │   ├── updates/    # Software updates
│   │   │   └── ...
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Main dashboard
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks
│   ├── contexts/          # React contexts
│   └── lib/               # Utilities (prisma, auth, store)
├── docker-compose.yml     # Docker production setup
├── Dockerfile             # Multi-stage Docker build
└── .env.example           # Environment template
```

---

## 🏗️ Architecture

```mermaid
graph TB
    subgraph "Client"
        UI[React Frontend]
        PWA[PWA Service Worker]
    end
    
    subgraph "Next.js Server"
        API[API Routes]
        Auth[Auth Middleware]
        Store[Zustand State]
    end
    
    subgraph "Database"
        PG[(PostgreSQL)]
        Prisma[Prisma ORM]
    end
    
    subgraph "External Services"
        LDAP[LDAP/AD]
        SMTP[Email Service]
        Supabase[Supabase Storage]
    end
    
    UI --> API
    PWA --> API
    API --> Auth
    API --> Prisma
    Prisma --> PG
    Auth --> LDAP
    API --> SMTP
    API --> Supabase
    Store --> UI
```

---

## 🧑‍💻 For Contributors
novadesk/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── public/
│   └── manifest.json      # PWA manifest
├── scheduler.mjs          # Cron job scheduler for reports
├── src/
│   ├── app/
│   │   ├── api/           # API routes (auth, tickets, users, reports)
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Main dashboard
│   ├── components/        # React components
│   ├── hooks/             # Custom hooks (useRealtime)
│   └── lib/               # Utilities (prisma, email, schemas)
├── docker-compose.yml     # Docker production setup
├── Dockerfile             # Multi-stage Docker build
└── .env.example           # Environment template
```

---

## 📊 SLA Configuration

SLA due dates are automatically calculated based on priority:

| Priority   | Resolution Time | Use Case                     |
| ---------- | --------------- | ---------------------------- |
| **URGENT** | 2 hours         | Critical system down         |
| **HIGH**   | 8 hours         | Major functionality impaired |
| **MEDIUM** | 24 hours        | Minor functionality impacted |
| **LOW**    | 72 hours        | General inquiries            |

---

## 🧑‍💻 For Contributors

We welcome contributions from developers of all skill levels!

- 🆕 **New to open source** — Found a bug? Open an issue!
- 🎓 **Learning React/Next.js** — Explore our clean, well-commented codebase
- 🛠️ **Experienced developer** — Submit PRs with new features or improvements

Please read our [Contributing Guide](./CONTRIBUTING.md) before submitting PRs.

---

## 📝 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check the [issues page](https://github.com/rahulmasal/novadesk/issues).

---

<p align="center">
  Built with ❤️ by NovaDesk Team
</p>
