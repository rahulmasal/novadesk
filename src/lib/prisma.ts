/**
 * ============================================================================
 * PRISMA CLIENT - Database Connection Singleton
 * ============================================================================
 *
 * This file creates and exports a single Prisma Client instance that can be
 * used throughout the application to interact with the PostgreSQL database.
 *
 * WHY USE A SINGLETON?
 * - Creating multiple Prisma clients can lead to connection pool exhaustion
 * - In development, we store the client in globalThis to prevent hot-reload issues
 * - In production, each serverless function gets its own instance
 *
 * BEGINNER NOTES:
 * - Prisma is an ORM (Object-Relational Mapper) - it maps database tables to TypeScript objects
 * - Instead of writing raw SQL, you use methods like prisma.user.findMany()
 * - The .prisma file in the project root defines your database schema
 * - Run `npx prisma generate` after changing the schema to update the client
 *
 * @module /lib/prisma
 */

import { PrismaClient } from "@prisma/client";

/**
 * Global variable to store Prisma client across hot-reloads in development
 * This prevents creating multiple connections during development
 */
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

/**
 * Creates or reuses the Prisma client instance
 * - In production: Creates new client
 * - In development: Reuses existing client from global to avoid connection exhaustion
 */
export const prisma = globalForPrisma.prisma || new PrismaClient();

/**
 * Store the client globally in development to prevent reconnections on file changes
 * This is crucial for Next.js hot-reloading during development
 */
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Default export - Use this in API routes to access the database
 *
 * @example
 * // In an API route:
 * import prisma from '@/lib/prisma';
 *
 * // Fetch all users
 * const users = await prisma.user.findMany();
 *
 * // Create a new ticket
 * const ticket = await prisma.ticket.create({
 *   data: { title: 'New Issue', priority: 'HIGH' }
 * });
 */
export default prisma;