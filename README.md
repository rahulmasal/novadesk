<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/ticket.svg" alt="NovaDesk Logo" width="80" height="80" />
  <h1 align="center">NovaDesk: IT Ticket Logging System</h1>
  <p align="center">
    A modern, high-performance, and visually stunning IT Helpdesk Dashboard built with Next.js, React, and Tailwind CSS.
  </p>
  <p align="center">
    <img src="https://img.shields.io/badge/Next.js-16.2.4-black?style=for-the-badge&logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19.2.4-blue?style=for-the-badge&logo=react" alt="React" />
    <img src="https://img.shields.io/badge/Tailwind-v4-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Zustand-State-yellow?style=for-the-badge" alt="Zustand" />
  </p>
</div>

---

## 🌟 Overview

**NovaDesk** is a state-of-the-art IT ticket management system designed for both End Users and IT Support Agents. It features a stunning glassmorphic UI, real-time ticket tracking, automated role-based views, and powerful background task scheduling for generating comprehensive CSV reports.

Whether you're managing hardware requests, network drops, or software access, NovaDesk provides an elegant and seamless user experience.

## ✨ Key Features

- 🌗 **Premium UI/UX:** A stunning dark-mode dashboard featuring glassmorphism, dynamic gradients, and smooth micro-animations.
- 👥 **Role-Based Access:** Instantly toggle between **End User** and **Agent** views, revealing contextual tools like scorecards and activity feeds.
- 🎫 **Ticket Management:** Fully functional CRUD operations mapped to a local file-based persistence layer.
- 📊 **Detailed Metadata Tracking:** Automatically logs hardware details (`hostname`, `laptopSerial`), organizational data (`department`), and identity (`username`).
- 📥 **Export to CSV:** Built-in utility to export your ticket queues instantly to a `.csv` format.
- ⏰ **Automated SMTP Reporting:** A standalone Node-Cron worker that generates Daily and Monthly CSV reports and emails them directly to stakeholders.

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| **Core** | Next.js 16, React 19, TypeScript |
| **Styling** | Tailwind CSS v4, Lucide React (Icons), clsx, tailwind-merge |
| **State** | Zustand (with persistence) |
| **Backend** | Next.js API Routes (Serverless Functions) |
| **Automation** | Node-Cron, Nodemailer |
| **Data Storage** | Local JSON File System (`src/data/tickets.json`) |

---

## 🚀 Getting Started

Follow these steps to get your local environment up and running!

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18 or higher) and `npm` installed on your machine.

### 1. Clone the repository

```bash
git clone https://github.com/your-username/it-ticket-system.git
cd it-ticket-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env` (or `.env.local`) file in the root directory and add the following variables. This is required for the automated SMTP mail trigger to function properly:

```env
# SMTP Configuration for Email Reports
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password

# Email Destination
REPORT_RECIPIENT=manager@yourcompany.com

# Security Secret for Cron API
CRON_SECRET=secret123
```
> **Note:** If using Gmail, you will need to generate an [App Password](https://support.google.com/accounts/answer/185833?hl=en) if 2-Step Verification is enabled.

### 4. Run the Development Server

Start the Next.js frontend and API:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to view the application.

### 5. Start the Automated Scheduler (Background Worker)

To enable the automated Daily (11:59 PM) and Monthly (Last day of the month) email reports, open a **separate terminal window** and run the scheduler script:

```bash
npm run schedule
```
*The terminal will confirm that the scheduler is running and actively listening for its designated execution times.*

---

## 📂 Project Structure

```text
📦 it-ticket-system
 ┣ 📂 src
 ┃ ┣ 📂 app
 ┃ ┃ ┣ 📂 api               # Next.js API Routes (CRUD & Cron trigger)
 ┃ ┃ ┣ 📜 layout.tsx        # Global app layout
 ┃ ┃ ┗ 📜 page.tsx          # Main Dashboard View
 ┃ ┣ 📂 components          # Reusable UI components (Sidebar, TicketTable, Forms)
 ┃ ┣ 📂 data                # Local storage (tickets.json)
 ┃ ┗ 📂 lib                 # Utilities (Zustand store, CSV exporter, Email service)
 ┣ 📜 scheduler.mjs         # Standalone Cron Job Worker
 ┣ 📜 next.config.ts        # Next.js Configuration
 ┣ 📜 tailwind.config.mjs   # Tailwind Configuration
 ┗ 📜 package.json          # Dependencies & NPM Scripts
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check out the [issues page](../../issues).

## 📝 License

This project is licensed under the [MIT License](LICENSE).
