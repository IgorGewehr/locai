import { z } from 'zod';

/**
 * Validation schemas for conversation endpoints
 */

export const MessageContextSchema = z.object({
  intent: z.string().optional(),
  entities: z.record(z.any()).optional(),
  functionsCalled: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  metadata: z.record(z.any()).optional(),
  // Campos adicionais do N8N workflow
  whatsappSent: z.boolean().optional(),
  whatsappMessageId: z.string().nullable().optional(),
  timestamp: z.string().optional(),
  messageType: z.string().optional(),
  workflowId: z.string().optional(),
}).passthrough().optional(); // passthrough() permite campos extras

export const PostConversationSchema = z.object({
  tenantId: z.string().min(1, 'TenantId é obrigatório'),
  clientMessage: z.string().min(1, 'Mensagem do cliente é obrigatória').max(10000, 'Mensagem muito longa'),
  sofiaMessage: z.string().min(1, 'Mensagem da Sofia é obrigatória').max(10000, 'Mensagem muito longa'),
  clientPhone: z.string().optional(),
  clientName: z.string().max(200).optional(),
  context: MessageContextSchema,
  conversationId: z.string().optional(),
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
