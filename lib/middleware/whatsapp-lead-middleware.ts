// lib/middleware/whatsapp-lead-middleware.ts
// MIDDLEWARE AUTOMÁTICO PARA CRIAÇÃO DE LEADS NO PRIMEIRO CONTATO WHATSAPP

import { createLead, updateLead } from '@/lib/ai/tenant-aware-agent-functions';
import { logger } from '@/lib/utils/logger';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

/**
 * Interface para mensagem WhatsApp recebida
 */
interface WhatsAppMessage {
  from: string; // Número do telefone
  body: string; // Conteúdo da mensagem
  name?: string; // Nome do contato (quando disponível)
  timestamp: number;
}

/**
 * Context enriquecido com leadId para Sofia
 */
export interface EnrichedContext {
  leadId?: string;
  isNewLead?: boolean;
  leadScore?: number;
  leadTemperature?: 'cold' | 'warm' | 'hot';
  totalInteractions?: number;
}

/**
 * MIDDLEWARE PRINCIPAL: Processa mensagem e cria/atualiza lead automaticamente
 * Executado ANTES de qualquer resposta da Sofia
 */
export async function processWhatsAppLeadMiddleware(
  message: WhatsAppMessage,
  tenantId: string
): Promise<EnrichedContext> {
  try {
    logger.info('🎯 [LeadMiddleware] Processando mensagem WhatsApp', {
      tenantId,
      phone: message.from,
      hasName: !!message.name,
      messageLength: message.body.length,
      timestamp: message.timestamp
    });

    // Extrair número limpo (remover caracteres especiais)
    const cleanPhone = cleanPhoneNumber(message.from);
    
    // Verificar se lead já existe
    const serviceFactory = new TenantServiceFactory(tenantId);
    const leadService = serviceFactory.leads;
    
    const existingLeads = await leadService.getMany([
      { field: 'phone', operator: '==', value: cleanPhone }
    ]);

    let leadId: string;
    let isNewLead = false;
    let leadData: any;

    if (existingLeads.length > 0) {
      // Lead existente - atualizar interação
      leadData = existingLeads[0];
      leadId = leadData.id;
      
      logger.info('🔄 [LeadMiddleware] Lead existente encontrado', {
        tenantId,
        leadId,
        phone: cleanPhone,
        currentScore: leadData.score,
        totalInteractions: leadData.totalInteractions
      });

      // Atualizar última interação e incrementar contador
      await updateLead({
        leadId,
        updates: {
          // Incrementar score baseado em engajamento
          score: Math.min((leadData.score || 25) + calculateEngagementScore(message.body), 100),
          // Atualizar temperatura baseada na frequência de mensagens
          temperature: calculateTemperature(leadData.totalInteractions + 1),
          // Atualizar nome se não tinha antes e agora temos
          ...(message.name && !leadData.name || leadData.name === 'Lead WhatsApp' ? { name: message.name } : {}),
        }
      }, tenantId);

      // Registrar nova interação
      await registerInteraction(leadId, message, tenantId);
      
    } else {
      // Novo lead - criar automaticamente
      isNewLead = true;
      
      logger.info('✨ [LeadMiddleware] Criando novo lead automaticamente', {
        tenantId,
        phone: cleanPhone,
        name: message.name,
        initialMessage: message.body.substring(0, 100) + '...'
      });

      const createLeadResult = await createLead({
        phone: cleanPhone,
        whatsappNumber: message.from,
        name: message.name || undefined,
        source: 'whatsapp_ai',
        sourceDetails: 'Primeiro contato via WhatsApp AI - criado automaticamente',
        initialInteraction: message.body,
        preferences: extractInitialPreferences(message.body)
      }, tenantId);

      if (createLeadResult.success) {
        leadId = createLeadResult.leadId;
        leadData = createLeadResult.lead;
        
        logger.info('✅ [LeadMiddleware] Lead criado automaticamente com sucesso', {
          tenantId,
          leadId,
          phone: cleanPhone,
          name: message.name,
          score: leadData.score
        });
      } else {
        logger.error('❌ [LeadMiddleware] Erro ao criar lead automaticamente', undefined, {
          tenantId,
          phone: cleanPhone,
          error: createLeadResult.error
        });
        
        // Retorna contexto vazio em caso de erro
        return {};
      }
    }

    // Retornar contexto enriquecido para Sofia
    const enrichedContext: EnrichedContext = {
      leadId,
      isNewLead,
      leadScore: leadData.score,
      leadTemperature: leadData.temperature,
      totalInteractions: leadData.totalInteractions + (isNewLead ? 0 : 1)
    };

    logger.info('🎉 [LeadMiddleware] Contexto enriquecido gerado', {
      tenantId,
      ...enrichedContext
    });

    return enrichedContext;

  } catch (error) {
    logger.error('💥 [LeadMiddleware] Erro crítico no middleware', error instanceof Error ? error : undefined, {
      tenantId,
      phone: message.from,
      error: error instanceof Error ? error.message : String(error)
    });

    // Em caso de erro, retorna contexto vazio para não quebrar o fluxo
    return {};
  }
}

/**
 * Registrar nova interação no histórico do lead
 */
async function registerInteraction(leadId: string, message: WhatsAppMessage, tenantId: string) {
  try {
    const serviceFactory = new TenantServiceFactory(tenantId);
    const interactionService = serviceFactory.interactions;
    
    await interactionService.create({
      leadId,
      tenantId,
      type: 'whatsapp_message' as any,
      channel: 'whatsapp',
      direction: 'inbound',
      content: message.body,
      userId: 'whatsapp-middleware',
      userName: 'WhatsApp Auto',
      sentiment: analyzeSentiment(message.body),
      createdAt: new Date(message.timestamp * 1000),
      updatedAt: new Date()
    });

    logger.info('📝 [LeadMiddleware] Interação registrada', {
      tenantId,
      leadId,
      contentLength: message.body.length
    });

  } catch (error) {
    logger.error('⚠️ [LeadMiddleware] Erro ao registrar interação', error instanceof Error ? error : undefined, {
      tenantId,
      leadId
    });
  }
}

/**
 * Limpar número de telefone removendo caracteres especiais
 */
function cleanPhoneNumber(phone: string): string {
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Se começar com 55 (Brasil) e tiver mais que 11 dígitos, manter apenas os últimos 11
  if (cleaned.startsWith('55') && cleaned.length > 11) {
    return cleaned.slice(-11);
  }
  
  return cleaned;
}

/**
 * Calcular score baseado no engajamento da mensagem
 */
function calculateEngagementScore(messageBody: string): number {
  let score = 2; // Score base por mensagem
  
  // Mensagem longa = mais engajamento
  if (messageBody.length > 50) score += 2;
  if (messageBody.length > 100) score += 3;
  
  // Palavras-chave que indicam interesse
  const highInterestKeywords = [
    'alugar', 'reservar', 'disponível', 'disponibilidade', 'preço', 'valor',
    'visitar', 'conhecer', 'ver', 'interesse', 'interessado', 'quero',
    'preciso', 'urgente', 'quando', 'hoje', 'amanhã'
  ];
  
  const mediumInterestKeywords = [
    'informação', 'informações', 'detalhes', 'localização', 'endereço',
    'fotos', 'imagens', 'como', 'onde', 'pode', 'consegue'
  ];
  
  const messageWords = messageBody.toLowerCase().split(/\s+/);
  
  // Verificar palavras de alto interesse
  const highInterestCount = messageWords.filter(word => 
    highInterestKeywords.some(keyword => word.includes(keyword))
  ).length;
  
  // Verificar palavras de médio interesse
  const mediumInterestCount = messageWords.filter(word => 
    mediumInterestKeywords.some(keyword => word.includes(keyword))
  ).length;
  
  score += highInterestCount * 5; // 5 pontos por palavra de alto interesse
  score += mediumInterestCount * 2; // 2 pontos por palavra de médio interesse
  
  // Perguntas específicas = mais engajamento
  if (messageBody.includes('?')) score += 3;
  
  return Math.min(score, 15); // Máximo 15 pontos por mensagem
}

/**
 * Calcular temperatura baseada no número de interações
 */
function calculateTemperature(totalInteractions: number): 'cold' | 'warm' | 'hot' {
  if (totalInteractions >= 5) return 'hot';   // 5+ mensagens = quente
  if (totalInteractions >= 2) return 'warm';  // 2-4 mensagens = morno
  return 'cold';                              // 1 mensagem = frio
}

/**
 * Análise simples de sentimento
 */
function analyzeSentiment(message: string): 'positive' | 'neutral' | 'negative' {
  const positiveWords = ['obrigado', 'obrigada', 'ótimo', 'excelente', 'perfeito', 'adorei', 'gostei', 'maravilhoso', 'legal'];
  const negativeWords = ['ruim', 'péssimo', 'horrível', 'problema', 'erro', 'difícil', 'complicado', 'não gostei'];
  
  const lowerMessage = message.toLowerCase();
  
  const positiveCount = positiveWords.filter(word => lowerMessage.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerMessage.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

/**
 * Extrair preferências iniciais da mensagem
 */
function extractInitialPreferences(message: string): any {
  const preferences: any = {};
  const lowerMessage = message.toLowerCase();
  
  // Extrair localização mencionada
  const cities = ['florianópolis', 'florianopolis', 'balneário camboriú', 'balneario camboriu', 'itajaí', 'itajai', 'blumenau', 'joinville'];
  const mentionedCities = cities.filter(city => lowerMessage.includes(city));
  if (mentionedCities.length > 0) {
    preferences.location = mentionedCities;
  }
  
  // Extrair número de quartos/pessoas
  const bedroomMatches = lowerMessage.match(/(\d+)\s*(quarto|bedroom|quarto)/);
  const guestMatches = lowerMessage.match(/(\d+)\s*(pessoa|people|hóspede|hospede)/);
  
  if (bedroomMatches) {
    const bedrooms = parseInt(bedroomMatches[1]);
    preferences.bedrooms = { min: bedrooms, max: bedrooms + 1 };
  }
  
  // Extrair faixa de preço mencionada
  const priceMatches = lowerMessage.match(/r?\$?\s*(\d+)(?:\s*a\s*r?\$?\s*(\d+))?/);
  if (priceMatches) {
    const minPrice = parseInt(priceMatches[1]);
    const maxPrice = priceMatches[2] ? parseInt(priceMatches[2]) : minPrice * 1.5;
    preferences.priceRange = { min: minPrice, max: maxPrice };
  }
  
  // Extrair tipo de propriedade
  if (lowerMessage.includes('apartamento') || lowerMessage.includes('ap')) {
    preferences.propertyType = ['apartment'];
  } else if (lowerMessage.includes('casa')) {
    preferences.propertyType = ['house'];
  }
  
  return Object.keys(preferences).length > 0 ? preferences : undefined;
}

/**
 * FUNÇÃO HELPER: Integração com contexto da Sofia
 * Adiciona leadId ao contexto atual da conversa
 */
export function enrichSofiaContext(existingContext: any, leadContext: EnrichedContext): any {
  return {
    ...existingContext,
    leadId: leadContext.leadId,
    isNewLead: leadContext.isNewLead,
    leadScore: leadContext.leadScore,
    leadTemperature: leadContext.leadTemperature,
    totalInteractions: leadContext.totalInteractions,
    // Metadados para Sofia usar nas respostas
    leadMetadata: {
      canUpdateLead: !!leadContext.leadId,
      shouldCreateTask: leadContext.leadScore && leadContext.leadScore > 60,
      shouldUpgradeStatus: leadContext.totalInteractions && leadContext.totalInteractions >= 3
    }
  };
}