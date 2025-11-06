// lib/validations/admin-schemas.ts
// Zod validation schemas for admin API routes

import { z } from 'zod';

/**
 * Schema for ticket status update
 */
export const UpdateTicketStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed'], {
    errorMap: () => ({ message: 'Status deve ser: open, in_progress, resolved ou closed' })
  }),
  tenantId: z.string().min(1).max(100).optional(),
  comment: z.string().max(500).optional()
});

export type UpdateTicketStatusInput = z.infer<typeof UpdateTicketStatusSchema>;

/**
 * Schema for ticket reply
 */
export const TicketReplySchema = z.object({
  ticketId: z.string().min(1, 'ID do ticket é obrigatório').max(100),
  message: z.string().min(1, 'Mensagem é obrigatória').max(5000, 'Mensagem muito longa'),
  tenantId: z.string().min(1).max(100).optional(),
  createNotification: z.boolean().optional().default(true),
  attachments: z.array(z.string().url()).max(5).optional()
});

export type TicketReplyInput = z.infer<typeof TicketReplySchema>;

/**
 * Schema for user filters
 */
export const UserFiltersSchema = z.object({
  status: z.enum(['all', 'active', 'inactive', 'suspended']).optional().default('all'),
  plan: z.enum(['all', 'free', 'pro', 'enterprise']).optional().default('all'),
  onboarding: z.enum(['all', 'completed', 'in_progress', 'not_started']).optional().default('all'),
  tenantId: z.string().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50)
});

export type UserFiltersInput = z.infer<typeof UserFiltersSchema>;

/**
 * Schema for ticket filters
 */
export const TicketFiltersSchema = z.object({
  status: z.enum(['all', 'open', 'in_progress', 'resolved', 'closed']).optional().default('all'),
  priority: z.enum(['all', 'low', 'medium', 'high', 'urgent']).optional().default('all'),
  tenantId: z.string().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50)
});

export type TicketFiltersInput = z.infer<typeof TicketFiltersSchema>;

/**
 * Schema for pagination parameters
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  orderBy: z.string().max(50).optional().default('createdAt'),
  order: z.enum(['asc', 'desc']).optional().default('desc')
});

export type PaginationInput = z.infer<typeof PaginationSchema>;

/**
 * Schema for user update (admin)
 */
export const AdminUserUpdateSchema = z.object({
  userId: z.string().min(1, 'ID do usuário é obrigatório'),
  status: z.enum(['active', 'inactive', 'suspended']).optional(),
  plan: z.enum(['free', 'pro', 'enterprise']).optional(),
  notes: z.string().max(1000).optional()
});

export type AdminUserUpdateInput = z.infer<typeof AdminUserUpdateSchema>;

/**
 * Schema for admin action log
 */
export const AdminActionLogSchema = z.object({
  action: z.string().min(1).max(100),
  resourceType: z.enum(['ticket', 'user', 'tenant', 'system']),
  resourceId: z.string().min(1).max(100),
  details: z.record(z.any()).optional(),
  metadata: z.object({
    userAgent: z.string().optional(),
    ipAddress: z.string().ip().optional(),
    timestamp: z.date().optional()
  }).optional()
});

export type AdminActionLogInput = z.infer<typeof AdminActionLogSchema>;

/**
 * Helper function to validate and sanitize input
 */
export function validateAndSanitize<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return { success: false, error: result.error };
}

/**
 * Format Zod errors for API response
 */
export function formatZodErrors(error: z.ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};

  error.errors.forEach((err) => {
    const path = err.path.join('.');
    if (!formatted[path]) {
      formatted[path] = [];
    }
    formatted[path].push(err.message);
  });

  return formatted;
}
