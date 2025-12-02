import { z } from 'zod';

/**
 * Validation schemas for conversation endpoints
 */

/**
 * Schema for a single conversation message item
 *
 * Supports:
 * - Client message only (Sofia hasn't responded yet)
 * - Sofia message only (multiple AI responses to a single client message)
 * - Both messages (typical request-response pair)
 */
export const PostConversationItemSchema = z.object({
  // Campos essenciais
  tenantId: z.string().min(1, 'TenantId é obrigatório'),
  clientPhone: z.string().min(1, 'Telefone do cliente é obrigatório'),

  // Mensagem do cliente (opcional - pode ser vazia quando Sofia envia múltiplas mensagens)
  clientMessage: z.string().max(10000, 'Mensagem muito longa').nullable().optional()
    .transform(val => val === '' ? null : val), // Transforma string vazia em null
  clientMessageTimestamp: z.string().nullable().optional(), // ISO timestamp da mensagem do cliente

  // Mensagem da Sofia (opcional)
  sofiaMessage: z.string().max(10000, 'Mensagem muito longa').nullable().optional()
    .transform(val => val === '' ? null : val), // Transforma string vazia em null
  sofiaMessageTimestamp: z.string().nullable().optional(), // ISO timestamp da resposta da Sofia

  // Media URLs (imagens, vídeos, documentos)
  clientMediaUrls: z.array(z.string().url()).optional(), // URLs de mídia enviadas pelo cliente
  sofiaMediaUrls: z.array(z.string().url()).optional(),  // URLs de mídia enviadas pela Sofia
}).refine(
  (data) => data.clientMessage || data.sofiaMessage,
  { message: 'Pelo menos uma mensagem (cliente ou Sofia) é obrigatória' }
);

/**
 * Schema for single message (backward compatible)
 */
export const PostConversationSchema = PostConversationItemSchema;

/**
 * Schema for batch requests (array of messages)
 */
export const PostConversationBatchSchema = z.array(PostConversationItemSchema)
  .min(1, 'Batch deve conter pelo menos 1 item')
  .max(100, 'Batch não pode exceder 100 itens');

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
export type PostConversationItemInput = z.infer<typeof PostConversationItemSchema>;
export type PostConversationBatchInput = z.infer<typeof PostConversationBatchSchema>;
export type GetConversationsInput = z.infer<typeof GetConversationsSchema>;
export type GetMessagesInput = z.infer<typeof GetMessagesSchema>;
