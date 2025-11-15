import { z } from 'zod';

/**
 * Validation schemas for conversation endpoints
 */

export const PostConversationSchema = z.object({
  // Campos essenciais
  tenantId: z.string().min(1, 'TenantId é obrigatório'),
  clientPhone: z.string().min(1, 'Telefone do cliente é obrigatório'),

  // Mensagem do cliente
  clientMessage: z.string().min(1, 'Mensagem do cliente é obrigatória').max(10000, 'Mensagem muito longa'),
  clientMessageTimestamp: z.string().optional(), // ISO timestamp da mensagem do cliente

  // Mensagem da Sofia (opcional)
  sofiaMessage: z.string().max(10000, 'Mensagem muito longa').nullable().optional()
    .transform(val => val === '' ? null : val), // Transforma string vazia em null
  sofiaMessageTimestamp: z.string().nullable().optional(), // ISO timestamp da resposta da Sofia
});

export const GetConversationsSchema = z.object({
  clientId: z.string().optional(),
  clientPhone: z.string().optional(),
  status: z.enum(['active', 'completed', 'abandoned']).optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  startAfter: z.string().optional(),
});

export const GetMessagesSchema = z.object({
  conversationId: z.string().min(1, 'ConversationId é obrigatório'),
  limit: z.number().min(1).max(200).optional().default(50),
  startAfter: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type PostConversationInput = z.infer<typeof PostConversationSchema>;
export type GetConversationsInput = z.infer<typeof GetConversationsSchema>;
export type GetMessagesInput = z.infer<typeof GetMessagesSchema>;
