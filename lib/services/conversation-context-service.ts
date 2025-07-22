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
import { firestore } from '@/lib/firebase/firestore';

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
  private readonly COLLECTION_NAME = 'conversation_contexts';
  private readonly MESSAGES_COLLECTION = 'conversation_messages';
  private readonly CONTEXT_TTL_HOURS = 24; // Contexto ativo por 24 horas

  // Obter ou criar contexto de conversa
  async getOrCreateContext(
    clientPhone: string, 
    tenantId: string
  ): Promise<ConversationDocument> {
    try {
      const conversationId = this.generateConversationId(clientPhone, tenantId);
      const docRef = doc(firestore, this.COLLECTION_NAME, conversationId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as ConversationDocument;
        
        // Verificar se o contexto ainda está ativo (dentro do TTL)
        const lastActivity = data.context.lastActivity.toDate();
        const hoursSinceLastActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceLastActivity < this.CONTEXT_TTL_HOURS) {
          console.log(`📊 [ContextService] Contexto existente recuperado para ${clientPhone}`);
          return { ...data, id: docSnap.id };
        } else {
          console.log(`⏰ [ContextService] Contexto expirado para ${clientPhone}, criando novo`);
          return await this.createNewContext(clientPhone, tenantId, conversationId);
        }
      } else {
        console.log(`🆕 [ContextService] Criando novo contexto para ${clientPhone}`);
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
      await setDoc(doc(firestore, this.COLLECTION_NAME, conversationId), newContext);
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
      const docRef = doc(firestore, this.COLLECTION_NAME, conversationId);
      
      await updateDoc(docRef, {
        'context': {
          ...updates,
          lastActivity: serverTimestamp()
        },
        'updatedAt': serverTimestamp()
      });
      
      console.log(`✅ [ContextService] Contexto atualizado para ${clientPhone}`);
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
        intent: message.intent,
        confidence: message.confidence,
        tokensUsed: message.tokensUsed,
        fromCache: message.fromCache
      };

      // Salvar mensagem
      await setDoc(
        doc(collection(firestore, this.MESSAGES_COLLECTION)), 
        messageDoc
      );

      // Atualizar contador de mensagens e última mensagem
      const contextRef = doc(firestore, this.COLLECTION_NAME, conversationId);
      await updateDoc(contextRef, {
        messageCount: message.role === 'user' ? 
          (await getDoc(contextRef)).data()?.messageCount + 1 || 1 : 
          (await getDoc(contextRef)).data()?.messageCount || 0,
        lastMessage: message.content.substring(0, 100),
        updatedAt: serverTimestamp()
      });

      console.log(`💬 [ContextService] Mensagem salva: ${message.role} - ${message.content.substring(0, 50)}...`);
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
      
      const q = query(
        collection(firestore, this.MESSAGES_COLLECTION),
        where('conversationId', '==', conversationId),
        orderBy('timestamp', 'desc'),
        limit(limitMessages)
      );

      const querySnapshot = await getDocs(q);
      const messages: MessageHistoryItem[] = [];
      
      querySnapshot.forEach((doc) => {
        messages.push({
          id: doc.id,
          ...doc.data()
        } as MessageHistoryItem);
      });

      // Reverter para ordem cronológica
      messages.reverse();
      
      console.log(`📜 [ContextService] ${messages.length} mensagens recuperadas do histórico`);
      return messages;
    } catch (error) {
      console.error('❌ [ContextService] Erro ao obter histórico:', error);
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
      const docRef = doc(firestore, this.COLLECTION_NAME, conversationId);
      
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const currentTokens = docSnap.data().tokensUsed || 0;
        await updateDoc(docRef, {
          tokensUsed: currentTokens + tokens,
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
      await updateDoc(doc(firestore, this.COLLECTION_NAME, conversationId), {
        status: 'completed',
        updatedAt: serverTimestamp()
      });
      
      console.log(`✅ [ContextService] Conversa marcada como concluída: ${clientPhone}`);
    } catch (error) {
      console.error('❌ [ContextService] Erro ao marcar conversa como concluída:', error);
    }
  }

  // Limpar contextos expirados (para job agendado)
  async cleanupExpiredContexts(tenantId: string): Promise<number> {
    try {
      const expirationTime = new Date();
      expirationTime.setHours(expirationTime.getHours() - this.CONTEXT_TTL_HOURS);
      
      const q = query(
        collection(firestore, this.COLLECTION_NAME),
        where('tenantId', '==', tenantId),
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
      
      console.log(`🧹 [ContextService] ${cleanedCount} contextos expirados marcados como inativos`);
      return cleanedCount;
    } catch (error) {
      console.error('❌ [ContextService] Erro ao limpar contextos expirados:', error);
      return 0;
    }
  }

  // Helpers privados
  private generateConversationId(clientPhone: string, tenantId: string): string {
    return `${tenantId}_${clientPhone}`;
  }

  private getDefaultContext(clientPhone: string, tenantId: string): ConversationDocument {
    return {
      id: this.generateConversationId(clientPhone, tenantId),
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