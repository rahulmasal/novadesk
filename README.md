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
    A modern, high-performance IT Helpdesk Dashboard with role-based authentication, ticket management, and automated reporting built with Next.js, React, and Tailwind CSS.
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-16.2.4-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19.2.4-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind-v4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Zustand-State-yellow?style=for-the-badge" alt="Zustand" />
    <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript" alt="TypeScript" />
  </p>
</div>

---

## 🎯 About NovaDesk

**NovaDesk** is a comprehensive IT ticket management system designed for organizations of all sizes. It provides separate interfaces and capabilities for **End Users** (employees submitting tickets), **Support Agents** (IT staff managing tickets), and **Administrators** (system managers with full access).

Whether you're handling hardware requests, network issues, software access, or general IT support, NovaDesk delivers an elegant, efficient, and secure experience.

---

## ✨ Key Features

### 🔐 Role-Based Authentication

- **End Users**: Submit tickets, track their own tickets, receive updates
- **Agents**: Manage ticket queue, update ticket status, view analytics, access activity feeds
- **Administrators**: Full system access, delete tickets, manage settings, view all tickets

### 🎫 Ticket Management

- Create, view, update, and close support tickets
- Priority levels: Low, Medium, High, Urgent
- Categories: Hardware, Software, Network, Access
- Detailed metadata tracking (hostname, laptop serial, department)
- Auto-calculated due dates based on priority

### 📊 Analytics Dashboard

- Real-time scorecards showing ticket statistics
- Visual charts for ticket distribution and trends
- Activity feed tracking all system events

### 📥 Export & Reporting

- Export tickets to CSV format instantly
- Automated Daily (11:59 PM) and Monthly CSV email reports
- Configurable SMTP settings for email delivery

### 🎨 Premium UI/UX

- Stunning dark-mode glassmorphic design
- Smooth micro-animations and transitions
- Fully responsive layout
- Role-specific UI elements and navigation

---

## 🛠️ Tech Stack

| Category           | Technology                                                  |
| ------------------ | ----------------------------------------------------------- |
| **Core**           | Next.js 16, React 19, TypeScript                            |
| **Styling**        | Tailwind CSS v4, Lucide React (Icons), clsx, tailwind-merge |
| **State**          | Zustand (with persistence)                                  |
| **Backend**        | Next.js API Routes (Serverless Functions)                   |
| **Authentication** | Custom session-based auth with Bearer tokens                |
| **Automation**     | Node-Cron, Nodemailer                                       |
| **Data Storage**   | Local JSON File System                                      |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- npm or yarn package manager

### 1. Clone the Repository

```bash
git clone https://github.com/rahulmasal/novadesk.git
cd novadesk
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# SMTP Configuration for Email Reports
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password

# Email Destination
REPORT_RECIPIENT=manager@yourcompany.com

# Security Secret for Cron API
CRON_SECRET=your_secret_key
```

> **Note:** If using Gmail, generate an [App Password](https://support.google.com/accounts/answer/185833?hl=en) if 2-Step Verification is enabled.

### 4. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Start the Automated Scheduler (Optional)

For automated Daily and Monthly email reports:

```bash
npm run schedule
```

---

## 🔑 Demo Accounts

| Role              | Email              | Password |
| ----------------- | ------------------ | -------- |
| **Administrator** | admin@novadesk.com | admin123 |
| **Agent**         | sarah@novadesk.com | agent123 |
| **End User**      | mike@example.com   | user123  |

---

## 📂 Project Structure

```text
novadesk/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/login/route.ts    # Authentication API
│   │   │   ├── cron/route.ts           # Report generation API
│   │   │   └── tickets/route.ts       # Ticket CRUD API
│   │   ├── layout.tsx                  # App layout
│   │   └── page.tsx                   # Main dashboard
│   ├── components/
│   │   ├── ActivityFeed.tsx           # Activity timeline
│   │   ├── Charts.tsx                 # Analytics charts
│   │   ├── Login.tsx                  # Login form
│   │   ├── Scorecards.tsx             # KPI cards
│   │   ├── Sidebar.tsx                # Navigation
│   │   ├── TicketDetail.tsx           # Ticket details
│   │   ├── TicketForm.tsx             # Create ticket
│   │   └── TicketTable.tsx            # Ticket list
│   ├── data/
│   │   ├── sessions.json               # Active sessions
│   │   ├── tickets.json               # Ticket database
│   │   └── users.json                # User database
│   └── lib/
│       ├── csv.ts                      # CSV export utility
│       ├── email.ts                    # SMTP service
│       ├── store.ts                    # Zustand store
│       └── utils.ts                    # Utilities
├── public/                             # Static assets
├── scheduler.mjs                       # Cron job worker
├── next.config.ts                     # Next.js config
├── package.json                        # Dependencies
└── README.md                          # This file
```

---

## 🔒 API Permissions

| Endpoint          | Method | End User         | Agent       | Admin       |
| ----------------- | ------ | ---------------- | ----------- | ----------- |
| `/api/tickets`    | GET    | Own tickets only | All tickets | All tickets |
| `/api/tickets`    | POST   | ✅ Create        | ✅ Create   | ✅ Create   |
| `/api/tickets`    | PATCH  | ❌               | ✅ Update   | ✅ Update   |
| `/api/tickets`    | DELETE | ❌               | ❌          | ✅ Delete   |
| `/api/auth/login` | POST   | ✅               | ✅          | ✅          |
| `/api/auth/login` | DELETE | ✅               | ✅          | ✅          |

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
