// simple-context-manager.ts
// Gerenciador de contexto simplificado e eficiente

import { logger } from '@/lib/utils/logger';
import { FirestoreService } from '@/lib/firebase/firestore';

interface SimpleContext {
  id: string;
  tenantId: string;
  clientPhone: string;
  
  // Dados essenciais da conversa
  guests?: number;
  checkIn?: string;
  checkOut?: string;
  budget?: number;
  amenities?: string[];
  clientName?: string;
  clientEmail?: string;
  
  // Estado da conversa
  stage: 'greeting' | 'searching' | 'presenting' | 'pricing' | 'booking';
  lastMessageTime: number;
  propertiesShown: string[];
  interestedProperties: string[];
  
  // Histórico compacto (apenas últimas 3 mensagens)
  recentMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  
  createdAt: number;
  updatedAt: number;
}

export class SimpleContextManager {
  private static instance: SimpleContextManager;
  private firestoreServices = new Map<string, FirestoreService<SimpleContext>>();
  private localCache = new Map<string, SimpleContext>();
  private readonly CACHE_TTL = 30 * 60 * 1000; // 30 minutos

  constructor() {
    // Constructor vazio - serviços serão criados por tenant
  }

  private getFirestoreService(tenantId: string): FirestoreService<SimpleContext> {
    if (!this.firestoreServices.has(tenantId)) {
      // Multi-tenant: usar coleção específica do tenant
      const collectionPath = `tenants/${tenantId}/simple_contexts`;
      this.firestoreServices.set(tenantId, new FirestoreService<SimpleContext>(collectionPath));
      logger.debug('🔧 [SimpleContext] Firestore service criado', {
        tenantId: tenantId.substring(0, 8) + '***',
        collectionPath
      });
    }
    return this.firestoreServices.get(tenantId)!;
  }

  static getInstance(): SimpleContextManager {
    if (!SimpleContextManager.instance) {
      SimpleContextManager.instance = new SimpleContextManager();
    }
    return SimpleContextManager.instance;
  }

  private getContextId(clientPhone: string, tenantId: string): string {
    return `ctx_${tenantId}_${clientPhone}`;
  }

  private isContextExpired(context: SimpleContext): boolean {
    const now = Date.now();
    return (now - context.updatedAt) > this.CACHE_TTL;
  }

  async getContext(clientPhone: string, tenantId: string): Promise<SimpleContext> {
    const contextId = this.getContextId(clientPhone, tenantId);
    
    // Tentar cache local primeiro
    const cached = this.localCache.get(contextId);
    if (cached && !this.isContextExpired(cached)) {
      logger.debug('📋 [SimpleContext] Cache local hit', {
        contextId,
        stage: cached.stage,
        guests: cached.guests
      });
      return cached;
    }

    // Buscar no Firestore
    try {
      const firestoreService = this.getFirestoreService(tenantId);
      const stored = await firestoreService.get(contextId);
      if (stored && !this.isContextExpired(stored)) {
        this.localCache.set(contextId, stored);
        logger.debug('📋 [SimpleContext] Firestore hit', {
          contextId,
          stage: stored.stage,
          guests: stored.guests
        });
        return stored;
      }
    } catch (error) {
      logger.warn('⚠️ [SimpleContext] Erro ao buscar contexto', {
        contextId,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    // Criar novo contexto
    const newContext: SimpleContext = {
      id: contextId,
      tenantId,
      clientPhone,
      stage: 'greeting',
      lastMessageTime: Date.now(),
      propertiesShown: [],
      interestedProperties: [],
      recentMessages: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    this.localCache.set(contextId, newContext);
    
    logger.info('📋 [SimpleContext] Novo contexto criado', {
      contextId,
      tenantId: tenantId.substring(0, 8) + '***'
    });

    return newContext;
  }

  async updateContext(
    clientPhone: string, 
    tenantId: string, 
    updates: Partial<Omit<SimpleContext, 'id' | 'tenantId' | 'clientPhone' | 'createdAt'>>
  ): Promise<void> {
    const contextId = this.getContextId(clientPhone, tenantId);
    const context = await this.getContext(clientPhone, tenantId);

    // Aplicar atualizações
    const updatedContext: SimpleContext = {
      ...context,
      ...updates,
      updatedAt: Date.now()
    };

    // Salvar no cache local e Firestore
    this.localCache.set(contextId, updatedContext);
    
    try {
      const firestoreService = this.getFirestoreService(tenantId);
      
      // Verificar se existe para decidir entre set e update
      const existing = await firestoreService.get(contextId);
      
      if (existing) {
        await firestoreService.update(contextId, updatedContext);
      } else {
        await firestoreService.set(contextId, updatedContext);
      }
      
      logger.debug('📋 [SimpleContext] Contexto salvo', {
        contextId,
        stage: updatedContext.stage,
        guests: updatedContext.guests,
        hasClientName: !!updatedContext.clientName,
        isNew: !existing
      });
    } catch (error) {
      logger.error('❌ [SimpleContext] Erro ao salvar contexto', {
        contextId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async addMessage(
    clientPhone: string,
    tenantId: string,
    role: 'user' | 'assistant',
    content: string
  ): Promise<void> {
    const context = await this.getContext(clientPhone, tenantId);
    
    // Manter apenas últimas 3 mensagens
    const newMessage = {
      role,
      content: content.length > 100 ? content.substring(0, 100) + '...' : content,
      timestamp: Date.now()
    };

    const updatedMessages = [...context.recentMessages, newMessage].slice(-3);

    await this.updateContext(clientPhone, tenantId, {
      recentMessages: updatedMessages,
      lastMessageTime: Date.now()
    });
  }

  getContextSummary(context: SimpleContext): string {
    const parts = [];
    
    if (context.guests) parts.push(`${context.guests} pessoas`);
    if (context.checkIn) parts.push(`check-in: ${context.checkIn}`);
    if (context.checkOut) parts.push(`check-out: ${context.checkOut}`);
    if (context.clientName) parts.push(`cliente: ${context.clientName}`);
    if (context.budget) parts.push(`orçamento: R$ ${context.budget}`);
    if (context.amenities?.length) parts.push(`comodidades: ${context.amenities.join(', ')}`);
    if (context.propertiesShown.length) parts.push(`${context.propertiesShown.length} propriedades mostradas`);
    
    return parts.length > 0 ? parts.join(', ') : 'conversa inicial';
  }

  clearLocalCache(): void {
    this.localCache.clear();
    logger.debug('🧹 [SimpleContext] Cache local limpo');
  }
}