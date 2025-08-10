// lib/services/conversation-context-service.ts
import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { SmartSummary } from '@/lib/ai-agent/smart-summary-service';
import { logger } from '@/lib/utils/logger';

// ===== INTERFACES =====

export interface ConversationContextData {
  intent: string;
  stage: 'greeting' | 'discovery' | 'presentation' | 'negotiation' | 'closing';
  clientData: {
    name?: string;
    city?: string;
    budget?: number;
    guests?: number;
    checkIn?: string;
    checkOut?: string;
  };
  interestedProperties: string[];
  lastAction?: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  lastActivity: Timestamp;
  // ADICIONADO: Suporte ao Smart Summary V5
  smartSummary?: SmartSummary;
  messageHistory?: Array<{ role: string; content: string }>;
}

export interface ConversationDocument {
  id: string;
  clientPhone: string;
  tenantId: string;
  context: ConversationContextData;
  messageCount: number;
  tokensUsed: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastMessage?: string;
  status: 'active' | 'inactive' | 'completed';
}

export interface MessageHistoryItem {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Timestamp;
  intent?: string;
  confidence?: number;
  tokensUsed?: number;
  fromCache?: boolean;
}

// ===== SERVICE CLASS =====

export class ConversationContextService {
  private readonly CONTEXT_TTL_HOURS = 1; // Contexto ativo por 1 hora
  
  // Métodos para construir paths multi-tenant
  private getContextCollectionPath(tenantId: string): string {
    return `tenants/${tenantId}/conversation_contexts`;
  }
  
  private getMessagesCollectionPath(tenantId: string): string {
    return `tenants/${tenantId}/conversation_messages`;
  }

  // Obter ou criar contexto de conversa
  async getOrCreateContext(
    clientPhone: string, 
    tenantId: string
  ): Promise<ConversationDocument> {
    try {
      const conversationId = this.generateConversationId(clientPhone, tenantId);
      const collectionPath = this.getContextCollectionPath(tenantId);
      const docRef = doc(db, collectionPath, conversationId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as ConversationDocument;
        
        // ADICIONADO: Deserializar smartSummary se presente
        if (data.context.smartSummary?.lastUpdated && typeof data.context.smartSummary.lastUpdated === 'string') {
          data.context.smartSummary.lastUpdated = new Date(data.context.smartSummary.lastUpdated);
        }
        
        // Verificar se o contexto ainda está ativo (dentro do TTL)
        const lastActivity = data.context.lastActivity.toDate();
        const hoursSinceLastActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastActivity < this.CONTEXT_TTL_HOURS) {
          logger.info('📊 [ContextService] Contexto existente recuperado', {
            clientPhone: clientPhone.substring(0, 6) + '***',
            tenantId: tenantId.substring(0, 8) + '***'
          });
          return { ...data, id: docSnap.id };
        } else {
          logger.info('⏰ [ContextService] Contexto expirado, criando novo', {
            clientPhone: clientPhone.substring(0, 6) + '***',
            tenantId: tenantId.substring(0, 8) + '***',
            hoursSinceLastActivity
          });
          return await this.createNewContext(clientPhone, tenantId, conversationId);
        }
      } else {
        logger.info('🆕 [ContextService] Criando novo contexto', {
          clientPhone: clientPhone.substring(0, 6) + '***',
          tenantId: tenantId.substring(0, 8) + '***'
        });
        return await this.createNewContext(clientPhone, tenantId, conversationId);
      }
    } catch (error) {
      console.error('❌ [ContextService] Erro ao obter/criar contexto:', error);
      // Retornar contexto padrão em caso de erro
      return this.getDefaultContext(clientPhone, tenantId);
    }
  }

  // Criar novo contexto
  private async createNewContext(
    clientPhone: string, 
    tenantId: string,
    conversationId: string
  ): Promise<ConversationDocument> {
    const newContext: ConversationDocument = {
      id: conversationId,
      clientPhone,
      tenantId,
      context: {
        intent: 'greeting',
        stage: 'greeting',
        clientData: {},
        interestedProperties: [],
        lastActivity: Timestamp.now()
      },
      messageCount: 0,
      tokensUsed: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: 'active'
    };

    try {
      const collectionPath = this.getContextCollectionPath(tenantId);
      await setDoc(doc(db, collectionPath, conversationId), newContext);
      return newContext;
    } catch (error) {
      console.error('❌ [ContextService] Erro ao criar contexto:', error);
      return newContext; // Retorna mesmo se falhar salvar
    }
  }

  // Atualizar contexto
  async updateContext(
    clientPhone: string,
    tenantId: string,
    updates: Partial<ConversationContextData>
  ): Promise<void> {
    try {
      const conversationId = this.generateConversationId(clientPhone, tenantId);
      const collectionPath = this.getContextCollectionPath(tenantId);
      const docRef = doc(db, collectionPath, conversationId);
      
      // Verificar se o documento existe primeiro
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        logger.warn('⚠️ [ContextService] Contexto não existe, criando...', {
          clientPhone: clientPhone.substring(0, 6) + '***',
          tenantId: tenantId.substring(0, 8) + '***'
        });
        await this.createNewContext(clientPhone, tenantId, conversationId);
      }
      
      // Clean updates to remove undefined values
      const cleanedUpdates: any = {};
      Object.entries(updates).forEach(([key, value]) => {
        if (value !== undefined) {
          cleanedUpdates[key] = value;
        }
      });

      // ADICIONADO: Serializar smartSummary se presente
      if (cleanedUpdates.smartSummary) {
        // Remove undefined values recursively
        const cleanSmartSummary = this.removeUndefinedValues(cleanedUpdates.smartSummary);
        cleanedUpdates.smartSummary = {
          ...cleanSmartSummary,
          lastUpdated: cleanSmartSummary.lastUpdated instanceof Date 
            ? cleanSmartSummary.lastUpdated.toISOString() 
            : (typeof cleanSmartSummary.lastUpdated === 'string' 
              ? cleanSmartSummary.lastUpdated 
              : new Date().toISOString())
        };
      }
      
      await updateDoc(docRef, {
        'context': {
          ...cleanedUpdates,
          lastActivity: serverTimestamp()
        },
        'updatedAt': serverTimestamp()
      });
      
      logger.info('✅ [ContextService] Contexto atualizado', {
        clientPhone: clientPhone.substring(0, 6) + '***',
        tenantId: tenantId.substring(0, 8) + '***'
      });
    } catch (error) {
      console.error('❌ [ContextService] Erro ao atualizar contexto:', error);
    }
  }

  // Salvar mensagem no histórico
  async saveMessage(
    clientPhone: string,
    tenantId: string,
    message: {
      role: 'user' | 'assistant';
      content: string;
      intent?: string;
      confidence?: number;
      tokensUsed?: number;
      fromCache?: boolean;
    }
  ): Promise<void> {
    try {
      const conversationId = this.generateConversationId(clientPhone, tenantId);
      const messageDoc: Omit<MessageHistoryItem, 'id'> = {
        conversationId,
        role: message.role,
        content: message.content,
        timestamp: Timestamp.now(),
        ...(message.intent !== undefined && { intent: message.intent }),
        ...(message.confidence !== undefined && { confidence: message.confidence }),
        ...(message.tokensUsed !== undefined && { tokensUsed: message.tokensUsed }),
        ...(message.fromCache !== undefined && { fromCache: message.fromCache })
      };

      // Salvar mensagem na collection de mensagens do tenant
      const messagesCollectionPath = this.getMessagesCollectionPath(tenantId);
      await setDoc(
        doc(collection(db, messagesCollectionPath)), 
        messageDoc
      );

      // Atualizar contador de mensagens e última mensagem
      const contextCollectionPath = this.getContextCollectionPath(tenantId);
      const contextRef = doc(db, contextCollectionPath, conversationId);
      const contextDoc = await getDoc(contextRef);
      
      if (contextDoc.exists()) {
        // Documento existe, pode atualizar
        const currentMessageCount = contextDoc.data()?.messageCount || 0;
        await updateDoc(contextRef, {
          messageCount: message.role === 'user' ? currentMessageCount + 1 : currentMessageCount,
          lastMessage: message.content.substring(0, 100),
          updatedAt: serverTimestamp()
        });
      } else {
        // Documento não existe, precisa criar o contexto primeiro
        logger.warn('⚠️ [ContextService] Contexto não existe, criando...', {
          clientPhone: clientPhone.substring(0, 6) + '***',
          tenantId: tenantId.substring(0, 8) + '***'
        });
        await this.createNewContext(clientPhone, tenantId, conversationId);
        
        // Agora atualizar com a informação da mensagem
        await updateDoc(contextRef, {
          messageCount: message.role === 'user' ? 1 : 0,
          lastMessage: message.content.substring(0, 100),
          updatedAt: serverTimestamp()
        });
      }

      logger.info('💬 [ContextService] Mensagem salva', {
        role: message.role,
        contentPreview: message.content.substring(0, 50) + '...',
        clientPhone: clientPhone.substring(0, 6) + '***'
      });
    } catch (error) {
      console.error('❌ [ContextService] Erro ao salvar mensagem:', error);
    }
  }

  // Obter histórico de mensagens
  async getMessageHistory(
    clientPhone: string,
    tenantId: string,
    limitMessages: number = 10
  ): Promise<MessageHistoryItem[]> {
    try {
      const conversationId = this.generateConversationId(clientPhone, tenantId);
      
      // Fallback approach - get all messages for conversation and sort manually
      const messagesCollectionPath = this.getMessagesCollectionPath(tenantId);
      const q = query(
        collection(db, messagesCollectionPath),
        where('conversationId', '==', conversationId)
      );

      const querySnapshot = await getDocs(q);
      const messages: MessageHistoryItem[] = [];
      
      querySnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        } as MessageHistoryItem);
      });

      // Sort by timestamp manually
      messages.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA; // Descending order
      });

      // Limit messages
      const limitedMessages = messages.slice(0, limitMessages);
      
      // Reverter para ordem cronológica
      limitedMessages.reverse();
      
      logger.info('📜 [ContextService] Mensagens recuperadas do histórico', {
        messageCount: limitedMessages.length,
        clientPhone: clientPhone.substring(0, 6) + '***'
      });
      return limitedMessages;
    } catch (error) {
      console.error('❌ [ContextService] Erro ao obter histórico:', error);
      // If index error, return empty array to not break the flow
      if (error instanceof Error && error.message.includes('index')) {
        logger.warn('⚠️ [ContextService] Índice não disponível, retornando histórico vazio');
      }
      return [];
    }
  }

  // Incrementar tokens usados
  async incrementTokensUsed(
    clientPhone: string,
    tenantId: string,
    tokens: number
  ): Promise<void> {
    try {
      const conversationId = this.generateConversationId(clientPhone, tenantId);
      const collectionPath = this.getContextCollectionPath(tenantId);
      const docRef = doc(db, collectionPath, conversationId);
      
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const currentTokens = docSnap.data().tokensUsed || 0;
        await updateDoc(docRef, {
          tokensUsed: currentTokens + tokens,
          updatedAt: serverTimestamp()
        });
      } else {
        // Documento não existe, criar primeiro
        logger.warn('⚠️ [ContextService] Contexto não existe, criando...', {
          clientPhone: clientPhone.substring(0, 6) + '***',
          tenantId: tenantId.substring(0, 8) + '***'
        });
        const newContext = await this.createNewContext(clientPhone, tenantId, conversationId);
        // Agora atualizar com os tokens
        await updateDoc(docRef, {
          tokensUsed: tokens,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('❌ [ContextService] Erro ao incrementar tokens:', error);
    }
  }

  // Marcar conversa como concluída
  async markConversationCompleted(
    clientPhone: string,
    tenantId: string
  ): Promise<void> {
    try {
      const conversationId = this.generateConversationId(clientPhone, tenantId);
      const collectionPath = this.getContextCollectionPath(tenantId);
      const docRef = doc(db, collectionPath, conversationId);
      
      // Verificar se o documento existe primeiro
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        logger.warn('⚠️ [ContextService] Contexto não existe, criando...', {
          clientPhone: clientPhone.substring(0, 6) + '***',
          tenantId: tenantId.substring(0, 8) + '***'
        });
        await this.createNewContext(clientPhone, tenantId, conversationId);
      }
      
      await updateDoc(docRef, {
        status: 'completed',
        updatedAt: serverTimestamp()
      });
      
      logger.info('✅ [ContextService] Conversa marcada como concluída', {
        clientPhone: clientPhone.substring(0, 6) + '***',
        tenantId: tenantId.substring(0, 8) + '***'
      });
    } catch (error) {
      console.error('❌ [ContextService] Erro ao marcar conversa como concluída:', error);
    }
  }

  // NOVA FUNÇÃO: Limpar contexto completamente
  async clearClientContext(
    clientPhone: string,
    tenantId: string
  ): Promise<void> {
    try {
      const conversationId = this.generateConversationId(clientPhone, tenantId);
      
      // Criar contexto completamente limpo
      const cleanContext: ConversationDocument = {
        id: conversationId,
        clientPhone,
        tenantId,
        context: {
          intent: 'greeting',
          stage: 'greeting',
          clientData: {},
          interestedProperties: [],
          lastActivity: Timestamp.now()
        },
        messageCount: 0,
        tokensUsed: 0,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status: 'active'
      };

      // Sobrescrever completamente o documento
      const collectionPath = this.getContextCollectionPath(tenantId);
      await setDoc(doc(db, collectionPath, conversationId), cleanContext);
      
      logger.info('🧹 [ContextService] Contexto completamente limpo', {
        clientPhone: clientPhone.substring(0, 6) + '***',
        tenantId: tenantId.substring(0, 8) + '***'
      });
    } catch (error) {
      console.error('❌ [ContextService] Erro ao limpar contexto:', error);
      throw error;
    }
  }

  // Limpar contextos expirados (para job agendado)
  async cleanupExpiredContexts(tenantId: string): Promise<number> {
    try {
      const expirationTime = new Date();
      expirationTime.setHours(expirationTime.getHours() - this.CONTEXT_TTL_HOURS);
      
      const collectionPath = this.getContextCollectionPath(tenantId);
      const q = query(
        collection(db, collectionPath),
        where('context.lastActivity', '<', Timestamp.fromDate(expirationTime)),
        where('status', '==', 'active')
      );

      const querySnapshot = await getDocs(q);
      let cleanedCount = 0;
      
      for (const doc of querySnapshot.docs) {
        await updateDoc(doc.ref, {
          status: 'inactive',
          updatedAt: serverTimestamp()
        });
        cleanedCount++;
      }
      
      logger.info('🧹 [ContextService] Contextos expirados marcados como inativos', {
        cleanedCount
      });
      return cleanedCount;
    } catch (error) {
      console.error('❌ [ContextService] Erro ao limpar contextos expirados:', error);
      return 0;
    }
  }

  // Helpers privados
  private generateConversationId(clientPhone: string, tenantId: string): string {
    // Agora que usamos collections por tenant, não precisamos incluir tenantId no ID
    // Isso torna os IDs mais limpos e evita redundância
    return clientPhone;
  }

  private removeUndefinedValues(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeUndefinedValues(item)).filter(item => item !== undefined);
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key) && obj[key] !== undefined) {
          cleaned[key] = this.removeUndefinedValues(obj[key]);
        }
      }
      return cleaned;
    }
    
    return obj;
  }

  private getDefaultContext(clientPhone: string, tenantId: string): ConversationDocument {
    const conversationId = this.generateConversationId(clientPhone, tenantId);
    return {
      id: conversationId,
      clientPhone,
      tenantId,
      context: {
        intent: 'greeting',
        stage: 'greeting',
        clientData: {},
        interestedProperties: [],
        lastActivity: Timestamp.now()
      },
      messageCount: 0,
      tokensUsed: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      status: 'active'
    };
  }
}

// Exportar instância singleton
export const conversationContextService = new ConversationContextService();