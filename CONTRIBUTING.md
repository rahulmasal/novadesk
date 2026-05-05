# Contributing to NovaDesk

Thank you for your interest in contributing to NovaDesk! 🎉

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Code Style](#code-style)
- [Making Changes](#making-changes)
- [Submitting Changes](#submitting-changes)
- [Questions?](#questions)

## Getting Started

Welcome, new contributor! This document will help you get started with contributing to NovaDesk.

**Prerequisites:**

- Node.js v18 or higher
- npm or yarn
- Git basics

## Development Setup

1. **Fork the repository** on GitHub

2. **Clone your fork:**

   ```bash
   git clone https://github.com/YOUR_USERNAME/novadesk.git
   cd novadesk
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Start the development server:**

   ```bash
   npm run dev
   ```

5. **Open in browser:**
   Navigate to http://localhost:3000

## Project Structure

```
novadesk/
├── src/
│   ├── app/                  # Next.js app directory
│   │   ├── api/            # API routes (backend endpoints)
│   │   │   ├── auth/       # Authentication (login/logout)
│   │   │   ├── cron/       # Scheduled report generation
│   │   │   └── tickets/    # Ticket CRUD operations
│   │   └── page.tsx        # Main dashboard page
│   ├── components/          # React UI components
│   │   ├── TicketForm.tsx   # Create ticket form
│   │   ├── TicketTable.tsx # Display tickets list
│   │   └── ...
│   ├── lib/                 # Utility functions and state
│   │   ├── store.ts        # Zustand state management
│   │   ├── csv.ts          # CSV export utility
│   │   └── email.ts        # Email service
│   └── data/               # JSON data files (simulated database)
├── public/                  # Static assets
└── README.md               # Project documentation
```

## Code Style

### JavaScript/TypeScript Guidelines

1. **Use TypeScript** - All new code should be TypeScript
2. **Use JSDoc comments** - Document functions with explanations
3. **Meaningful names** - Use descriptive variable and function names

### Example JSDoc Comment

```typescript
/**
 * Adds a new ticket to the system
 *
 * WHAT IT DOES:
 * 1. Generates a unique ID for the ticket
 * 2. Creates a ticket object with timestamps
 * 3. Adds it to the tickets array
 *
 * @param ticketData - Ticket data without id or timestamps
 */
function addTicket(ticketData) {
  // ... implementation
}
```

## Making Changes

### Finding Issues to Work On

1. Check the [issues page](https://github.com/rahulmasal/novadesk/issues)
2. Look for issues labeled `good first issue` or `help wanted`
3. Comment on the issue before starting work

### Creating a Feature Branch

```bash
# Create a new branch for your changes
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### Running Tests

```bash
# Run linter
npm run lint

# Run development server
npm run dev
```

## Submitting Changes

### Commit Messages

Use clear, descriptive commit messages:

```
feat: add dark mode toggle

fix: resolve ticket status update bug

docs: update README with setup instructions
```

### Pull Request Process

1. **Push your changes:**

   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub

3. **Describe your changes:**
   - What does this PR do?
   - Why is this change needed?
   - How did you test it?

4. **Wait for review** - We'll get back to you as soon as possible!

## Project Architecture Notes

### How Authentication Works

1. User submits email/password to `/api/auth/login`
2. Server validates credentials against `src/data/users.json`
3. Server creates session in `src/data/sessions.json`
4. Client receives token and stores in Zustand state
5. All subsequent requests include `Authorization: Bearer <token>`

### How Tickets are Stored

- Tickets are stored in `src/data/tickets.json`
- Each ticket has: id, title, description, priority, category, status, timestamps
- New tickets get status "New" by default
- Agents/Admins can update status: New → In Progress → Pending Vendor → Resolved → Closed

### State Management with Zustand

The app uses Zustand for React state management:

```typescript
// Reading state
const tickets = useTicketStore((state) => state.tickets);

// Updating state
const addTicket = useTicketStore((state) => state.addTicket);
```

## Questions?

Feel free to:

- Open an issue for bugs or feature requests
- Check existing issues before creating new ones
- Star the repo if you find it useful! ⭐

## Code of Conduct

Please be respectful and constructive in all interactions. We're all here to learn and build together!
