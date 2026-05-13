/**
 * ============================================================================
 * ZOD VALIDATION SCHEMAS - Input Validation for All API Routes
 * ============================================================================
 *
 * This file defines Zod schemas for validating all API request inputs.
 * Zod is a TypeScript-first schema declaration and validation library.
 *
 * WHY USE ZOD?
 * - Catches invalid data at the API boundary
 * - Provides clear, descriptive error messages
 * - Creates TypeScript types from schemas automatically
 * - Much better than manual validation with if statements
 *
 * @module /lib/schemas
 */

import { z } from "zod";

// ============================================================================
// ENUMS (must match Prisma schema)
// ============================================================================

export const RoleEnum = z.enum(["ADMINISTRATOR", "AGENT", "END_USER"]);
export type RoleEnum = z.infer<typeof RoleEnum>;

export const PriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export type PriorityEnum = z.infer<typeof PriorityEnum>;

export const CategoryEnum = z.enum(["HARDWARE", "SOFTWARE", "NETWORK", "ACCESS"]);
export type CategoryEnum = z.infer<typeof CategoryEnum>;

export const StatusEnum = z.enum([
  "NEW",
  "IN_PROGRESS",
  "PENDING_VENDOR",
  "RESOLVED",
  "CLOSED",
]);
export type StatusEnum = z.infer<typeof StatusEnum>;

// ============================================================================
// AUTH SCHEMAS
// ============================================================================

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  provider: z.enum(["local", "ldap"]).optional().default("local"),
});

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  department: z.string().optional().default("General"),
});

// ============================================================================
// USER SCHEMAS
// ============================================================================

export const createUserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: RoleEnum,
  department: z.string().optional().default("General"),
  hostname: z.string().min(1, "Hostname is required"),
  laptopSerial: z.string().min(1, "Laptop serial is required"),
});

export const updateUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
  name: z.string().min(2, "Name must be at least 2 characters").optional(),
  role: RoleEnum.optional(),
  department: z.string().optional(),
  hostname: z.string().optional().nullable(),
  laptopSerial: z.string().optional().nullable(),
});

export const deleteUserSchema = z.object({
  id: z.string().min(1, "User ID is required"),
});

// ============================================================================
// TICKET SCHEMAS
// ============================================================================

export const createTicketSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be less than 200 characters"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must be less than 5000 characters"),
  priority: PriorityEnum.optional().default("MEDIUM"),
  category: CategoryEnum.optional().default("SOFTWARE"),
  dueDate: z.string().datetime({ message: "Invalid due date format" }).optional(),
  username: z.string().optional(),
  hostname: z.string().optional(),
  laptopSerial: z.string().optional(),
  department: z.string().optional(),
});

export const updateTicketSchema = z.object({
  id: z.string().min(1, "Ticket ID is required"),
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be less than 200 characters")
    .optional(),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(5000, "Description must be less than 5000 characters")
    .optional(),
  priority: PriorityEnum.optional(),
  category: CategoryEnum.optional(),
  status: StatusEnum.optional(),
  dueDate: z.string().datetime({ message: "Invalid due date format" }).optional(),
  assignedTo: z.string().optional().nullable(),
});

export const updateTicketStatusSchema = z.object({
  id: z.string().min(1, "Ticket ID is required"),
  status: StatusEnum,
});

export const deleteTicketSchema = z.object({
  id: z.string().min(1, "Ticket ID is required"),
});

export const assignTicketSchema = z.object({
  id: z.string().min(1, "Ticket ID is required"),
  assignedTo: z.string().email("Invalid assignee email"),
});

// ============================================================================
// COMMENT SCHEMAS
// ============================================================================

export const createCommentSchema = z.object({
  ticketId: z.string().min(1, "Ticket ID is required"),
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must be less than 2000 characters"),
});

export const updateCommentSchema = z.object({
  id: z.string().min(1, "Comment ID is required"),
  content: z
    .string()
    .min(1, "Comment cannot be empty")
    .max(2000, "Comment must be less than 2000 characters"),
});

export const deleteCommentSchema = z.object({
  id: z.string().min(1, "Comment ID is required"),
});

// ============================================================================
// ATTACHMENT SCHEMAS
// ============================================================================

export const createAttachmentSchema = z.object({
  ticketId: z.string().min(1, "Ticket ID is required"),
  filename: z.string().min(1, "Filename is required"),
  url: z.string().url("Invalid URL"),
  mimeType: z.string().min(1, "MIME type is required"),
  size: z.number().int().positive("File size must be positive"),
});

// ============================================================================
// KNOWLEDGE BASE SCHEMAS
// ============================================================================

export const createKnowledgeArticleSchema = z.object({
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be less than 200 characters"),
  content: z
    .string()
    .min(50, "Content must be at least 50 characters")
    .max(50000, "Content must be less than 50000 characters"),
  category: z.string().min(1, "Category is required"),
  tags: z.array(z.string()).optional().default([]),
  isPublished: z.boolean().optional().default(false),
});

export const updateKnowledgeArticleSchema = z.object({
  id: z.string().min(1, "Article ID is required"),
  title: z
    .string()
    .min(5, "Title must be at least 5 characters")
    .max(200, "Title must be less than 200 characters")
    .optional(),
  content: z
    .string()
    .min(50, "Content must be at least 50 characters")
    .max(50000, "Content must be less than 50000 characters")
    .optional(),
  category: z.string().min(1, "Category is required").optional(),
  tags: z.array(z.string()).optional(),
  isPublished: z.boolean().optional(),
});

export const deleteKnowledgeArticleSchema = z.object({
  id: z.string().min(1, "Article ID is required"),
});

export const knowledgeSearchSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  category: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ============================================================================
// DASHBOARD SCHEMAS
// ============================================================================

export const updateDashboardLayoutSchema = z.object({
  layout: z.object({
    widgets: z.array(
      z.object({
        id: z.string(),
        type: z.string(),
        visible: z.boolean(),
        position: z.object({
          x: z.number(),
          y: z.number(),
          w: z.number(),
          h: z.number(),
        }),
      })
    ),
  }),
});

// ============================================================================
// AUDIT LOG SCHEMAS
// ============================================================================

export const auditLogQuerySchema = z.object({
  ticketId: z.string().optional(),
  userId: z.string().optional(),
  action: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ============================================================================
// REPORT SCHEMAS
// ============================================================================

export const reportQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(["NEW", "IN_PROGRESS", "PENDING_VENDOR", "RESOLVED", "CLOSED"]).optional(),
  priority: PriorityEnum.optional(),
  category: CategoryEnum.optional(),
});

// ============================================================================
// SLA SCHEMAS
// ============================================================================

export const slaQuerySchema = z.object({
  status: z.enum(["NEW", "IN_PROGRESS", "PENDING_VENDOR"]).optional(),
  breached: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

// ============================================================================
// PAGINATION SCHEMAS
// ============================================================================

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(10000).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

// ============================================================================
// SETUP WIZARD SCHEMAS
// ============================================================================

export const setupWizardSchema = z.object({
  organizationName: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(100, "Organization name must be less than 100 characters"),
  adminEmail: z.string().email("Invalid email address"),
  adminPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  adminName: z.string().min(2, "Admin name must be at least 2 characters"),
  databaseUrl: z.string().startsWith("postgresql://", "Invalid database URL format"),
});

// ============================================================================
// PASSWORD SCHEMAS
// ============================================================================

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

export const adminResetPasswordSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type CreateAttachmentInput = z.infer<typeof createAttachmentSchema>;
export type CreateKnowledgeArticleInput = z.infer<typeof createKnowledgeArticleSchema>;
export type UpdateDashboardLayoutInput = z.infer<typeof updateDashboardLayoutSchema>;
export type SetupWizardInput = z.infer<typeof setupWizardSchema>;