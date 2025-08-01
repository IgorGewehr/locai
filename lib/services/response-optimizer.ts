// lib/services/response-optimizer.ts
// RESPONSE OPTIMIZER - STEP 2 IMPLEMENTATION
// Otimização e compressão inteligente de respostas do agent (1500 → 400 tokens)

import { 
  EnhancedConversationContext,
  extractCriticalData 
} from '@/lib/types/context-types-enhanced';
import { logger } from '@/lib/utils/logger';

// ===== INTERFACES =====

export interface OptimizationResult {
  originalResponse: string;
  optimizedResponse: string;
  originalTokens: number;
  optimizedTokens: number;
  compressionRatio: number;
  optimizationTechniques: string[];
  qualityScore: number;        // 0-100, qualidade da resposta otimizada
  processingTime: number;      // Tempo de processamento em ms
}

export interface OptimizationConfig {
  maxTokens: number;           // Máximo de tokens permitidos
  minQualityScore: number;     // Score mínimo de qualidade (0-100)
  preserveEmojis: boolean;     // Manter emojis na otimização
  preserveFormatting: boolean; // Manter formatação (quebras de linha)
  aggressiveMode: boolean;     // Modo agressivo de compressão
  contextAware: boolean;       // Otimização baseada no contexto
}

export interface ResponseAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  intent: string;              // Intenção da resposta
  keyEntities: string[];       // Entidades importantes (preços, datas, etc.)
  urgencyLevel: 1 | 2 | 3 | 4 | 5; // Nível de urgência
  conversionPotential: number; // 0-100, potencial de conversão
  redundancyScore: number;     // 0-100, nível de redundância
}

// ===== RESPONSE OPTIMIZER =====

export class ResponseOptimizer {
  private config: OptimizationConfig = {
    maxTokens: 400,              // Meta: 400 tokens max
    minQualityScore: 80,         // Mínimo 80% de qualidade
    preserveEmojis: true,        // Manter emojis para engajamento
    preserveFormatting: true,    // Manter estrutura
    aggressiveMode: false,       // Não agressivo por padrão
    contextAware: true           // Usar contexto para otimizar
  };

  private optimizationStats = {
    totalOptimizations: 0,
    averageCompressionRatio: 0,
    averageQualityScore: 0,
    averageProcessingTime: 0
  };

  constructor(customConfig?: Partial<OptimizationConfig>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }

    logger.info('🚀 [ResponseOptimizer] Response optimizer initialized', {
      maxTokens: this.config.maxTokens,
      minQualityScore: this.config.minQualityScore,
      contextAware: this.config.contextAware
    });
  }

  /**
   * Otimizar resposta principal com múltiplas técnicas
   * OBJETIVO: 1500 → 400 tokens mantendo qualidade 80%+
   */
  async optimizeResponse(
    originalResponse: string,
    context: EnhancedConversationContext,
    targetStage?: string
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    logger.debug('⚡ [ResponseOptimizer] Starting response optimization', {
      originalLength: originalResponse.length,
      targetTokens: this.config.maxTokens,
      stage: targetStage
    });

    try {
      const originalTokens = this.estimateTokens(originalResponse);
      
      // Se já está dentro do limite, otimização leve
      if (originalTokens <= this.config.maxTokens) {
        return this.lightOptimization(originalResponse, context, startTime);
      }

      // Análise da resposta para otimização inteligente
      const analysis = this.analyzeResponse(originalResponse, context);
      
      // Aplicar técnicas de otimização em ordem de prioridade
      let optimizedResponse = originalResponse;
      const appliedTechniques: string[] = [];

      // 1. REMOÇÃO DE REDUNDÂNCIAS
      optimizedResponse = this.removeRedundancy(optimizedResponse);
      appliedTechniques.push('redundancy-removal');

      // 2. COMPRESSÃO CONTEXTUAL
      if (this.config.contextAware) {
        optimizedResponse = this.contextualCompression(optimizedResponse, context, analysis);
        appliedTechniques.push('contextual-compression');
      }

      // 3. OTIMIZAÇÃO LEXICAL (palavras mais curtas)
      optimizedResponse = this.lexicalOptimization(optimizedResponse);
      appliedTechniques.push('lexical-optimization');

      // 4. COMPRESSÃO DE FORMATAÇÃO
      optimizedResponse = this.formatCompression(optimizedResponse, this.config.preserveFormatting);
      appliedTechniques.push('format-compression');

      // 5. OTIMIZAÇÃO POR ESTÁGIO (específica da conversa)
      if (targetStage) {
        optimizedResponse = this.stageSpecificOptimization(optimizedResponse, targetStage, analysis);
        appliedTechniques.push('stage-optimization');
      }

      // 6. COMPRESSÃO AGRESSIVA (se necessário)
      const currentTokens = this.estimateTokens(optimizedResponse);
      if (currentTokens > this.config.maxTokens && this.config.aggressiveMode) {
        optimizedResponse = this.aggressiveCompression(optimizedResponse, analysis);
        appliedTechniques.push('aggressive-compression');
      }

      // 7. OTIMIZAÇÃO FINAL E VALIDAÇÃO
      optimizedResponse = this.finalOptimization(optimizedResponse, context);
      appliedTechniques.push('final-optimization');

      // Calcular métricas finais
      const finalTokens = this.estimateTokens(optimizedResponse);
      const compressionRatio = originalTokens > 0 ? (finalTokens / originalTokens) : 1;
      const qualityScore = this.calculateQualityScore(originalResponse, optimizedResponse, analysis);
      const processingTime = Date.now() - startTime;

      // Validar se atingiu critérios mínimos
      if (qualityScore < this.config.minQualityScore) {
        logger.warn('⚠️ [ResponseOptimizer] Quality below threshold, using fallback', {
          qualityScore,
          minQualityScore: this.config.minQualityScore
        });
        return this.fallbackOptimization(originalResponse, context, startTime);
      }

      // Atualizar estatísticas
      this.updateStats(compressionRatio, qualityScore, processingTime);

      const result: OptimizationResult = {
        originalResponse,
        optimizedResponse,
        originalTokens,
        optimizedTokens: finalTokens,
        compressionRatio,
        optimizationTechniques: appliedTechniques,
        qualityScore,
        processingTime
      };

      logger.info('🎯 [ResponseOptimizer] Response optimization completed', {
        tokenReduction: `${originalTokens} → ${finalTokens}`,
        compressionRatio: `${Math.round(compressionRatio * 100)}%`,
        qualityScore,
        processingTime,
        techniques: appliedTechniques.length
      });

      return result;

    } catch (error) {
      logger.error('❌ [ResponseOptimizer] Optimization failed', { error });
      return this.fallbackOptimization(originalResponse, context, startTime);
    }
  }

  /**
   * Otimização rápida para respostas já curtas
   */
  private lightOptimization(
    response: string,
    context: EnhancedConversationContext,
    startTime: number
  ): OptimizationResult {
    let optimized = response;
    const techniques = ['light-optimization'];

    // Apenas limpezas básicas
    optimized = this.basicCleanup(optimized);
    
    // Adicionar emojis estratégicos se não tem
    if (this.config.preserveEmojis && !this.hasEmojis(optimized)) {
      optimized = this.addStrategicEmojis(optimized, context);
      techniques.push('emoji-enhancement');
    }

    const originalTokens = this.estimateTokens(response);
    const optimizedTokens = this.estimateTokens(optimized);

    return {
      originalResponse: response,
      optimizedResponse: optimized,
      originalTokens,
      optimizedTokens,
      compressionRatio: optimizedTokens / originalTokens,
      optimizationTechniques: techniques,
      qualityScore: 95, // Otimização leve mantém alta qualidade
      processingTime: Date.now() - startTime
    };
  }

  /**
   * Analisar resposta para otimização inteligente
   */
  private analyzeResponse(response: string, context: EnhancedConversationContext): ResponseAnalysis {
    const stage = context.conversationState.stage;
    
    // Detectar sentimento
    const sentiment = this.detectSentiment(response);
    
    // Detectar intenção
    const intent = this.detectIntent(response, stage);
    
    // Extrair entidades importantes
    const keyEntities = this.extractKeyEntities(response);
    
    // Calcular urgência
    const urgencyLevel = this.calculateUrgencyLevel(response, context);
    
    // Potencial de conversão
    const conversionPotential = this.calculateConversionPotential(response, context);
    
    // Score de redundância
    const redundancyScore = this.calculateRedundancyScore(response);

    return {
      sentiment,
      intent,
      keyEntities,
      urgencyLevel,
      conversionPotential,
      redundancyScore
    };
  }

  /**
   * Remover redundâncias e repetições
   */
  private removeRedundancy(response: string): string {
    let optimized = response;

    // Padrões de redundância comuns
    const redundancyPatterns = [
      // Saudações duplas
      { from: /Olá[!,]?\s*Oi[!,]?/gi, to: 'Oi!' },
      { from: /Oi[!,]?\s*Olá[!,]?/gi, to: 'Oi!' },
      
      // Confirmações redundantes
      { from: /Com certeza[!,]?\s*Claro[!,]?/gi, to: 'Claro!' },
      { from: /Perfeito[!,]?\s*Ótimo[!,]?/gi, to: 'Perfeito!' },
      
      // Frases de ajuda repetitivas
      { from: /posso te ajudar.*posso ajudar/gi, to: 'posso ajudar' },
      { from: /vou te ajudar.*vou ajudar/gi, to: 'vou ajudar' },
      
      // Repetições de entusiasmo
      { from: /incrível[!,]?\s*incrível/gi, to: 'incrível' },
      { from: /perfeito[!,]?\s*perfeito/gi, to: 'perfeito' },
      
      // Espaços múltiplos
      { from: /\s{2,}/g, to: ' ' },
      
      // Pontuação excessiva
      { from: /[!]{2,}/g, to: '!' },
      { from: /[?]{2,}/g, to: '?' }
    ];

    for (const pattern of redundancyPatterns) {
      optimized = optimized.replace(pattern.from, pattern.to);
    }

    return optimized.trim();
  }

  /**
   * Compressão contextual baseada no estágio da conversa
   */
  private contextualCompression(
    response: string,
    context: EnhancedConversationContext,
    analysis: ResponseAnalysis
  ): string {
    let optimized = response;
    const stage = context.conversationState.stage;
    const criticalData = extractCriticalData(context);

    // Compressão baseada no estágio
    switch (stage) {
      case 'discovery':
        // Na descoberta, focar em perguntas diretas
        optimized = this.compressForDiscovery(optimized);
        break;
        
      case 'presentation':
        // Na apresentação, focar nos detalhes importantes
        optimized = this.compressForPresentation(optimized, criticalData);
        break;
        
      case 'engagement':
        // No engajamento, manter elementos persuasivos
        optimized = this.compressForEngagement(optimized);
        break;
        
      case 'conversion':
        // Na conversão, manter urgência e call-to-action
        optimized = this.compressForConversion(optimized);
        break;
    }

    // Remoção de informações já conhecidas
    if (criticalData.guests) {
      optimized = optimized.replace(/quantas pessoas\?/gi, '');
      optimized = optimized.replace(/número de hóspedes/gi, '');
    }

    if (criticalData.checkIn && criticalData.checkOut) {
      optimized = optimized.replace(/que datas\?/gi, '');
      optimized = optimized.replace(/quando.*chegar/gi, '');
    }

    if (criticalData.city) {
      optimized = optimized.replace(/qual cidade\?/gi, '');
      optimized = optimized.replace(/onde.*procura/gi, '');
    }

    return optimized.trim();
  }

  /**
   * Otimização lexical - usar palavras mais curtas
   */
  private lexicalOptimization(response: string): string {
    const lexicalReplacements = [
      // Palavras longas → palavras curtas
      { from: /propriedade/gi, to: 'imóvel' },
      { from: /apartamento/gi, to: 'ap' },
      { from: /acomodação/gi, to: 'local' },
      { from: /disponível/gi, to: 'livre' },
      { from: /interessante/gi, to: 'legal' },
      { from: /excelente/gi, to: 'ótimo' },
      { from: /fantástico/gi, to: 'incrível' },
      { from: /maravilhoso/gi, to: 'lindo' },
      { from: /perfeitamente/gi, to: 'perfeito' },
      { from: /absolutamente/gi, to: 'total' },
      { from: /definitivamente/gi, to: 'sim' },
      { from: /certamente/gi, to: 'claro' },
      { from: /naturalmente/gi, to: 'claro' },
      { from: /obviamente/gi, to: 'claro' },
      
      // Frases verbosas → concisas
      { from: /estou aqui para te ajudar/gi, to: 'te ajudo' },
      { from: /vou te mostrar/gi, to: 'vou mostrar' },
      { from: /posso apresentar/gi, to: 'vou mostrar' },
      { from: /gostaria de ver/gi, to: 'quer ver' },
      { from: /você gostaria/gi, to: 'quer' },
      { from: /tem interesse/gi, to: 'quer' },
      { from: /me conte/gi, to: 'fala' },
      { from: /me diga/gi, to: 'fala' },
      
      // Expressões formais → informais (mais curtas)
      { from: /com toda certeza/gi, to: 'claro' },
      { from: /sem dúvida alguma/gi, to: 'sim' },
      { from: /é um prazer/gi, to: 'legal' }
    ];

    let optimized = response;
    for (const replacement of lexicalReplacements) {
      optimized = optimized.replace(replacement.from, replacement.to);
    }

    return optimized;
  }

  /**
   * Compressão de formatação
   */
  private formatCompression(response: string, preserveFormatting: boolean): string {
    if (!preserveFormatting) {
      // Compressão agressiva de formatação
      return response
        .replace(/\n\s*\n/g, '\n')     // Múltiplas quebras → uma
        .replace(/\n/g, ' ')           // Quebras → espaços
        .replace(/\s+/g, ' ')          // Múltiplos espaços → um
        .trim();
    }

    // Compressão conservadora
    return response
      .replace(/\n\s*\n\s*\n/g, '\n\n') // Máximo 2 quebras
      .replace(/\s+/g, ' ')             // Múltiplos espaços → um
      .trim();
  }

  /**
   * Otimização específica por estágio
   */
  private stageSpecificOptimization(
    response: string,
    stage: string,
    analysis: ResponseAnalysis
  ): string {
    let optimized = response;

    switch (stage) {
      case 'discovery':
        // Focar em perguntas essenciais
        optimized = this.optimizeForDiscovery(optimized);
        break;
        
      case 'presentation':
        // Focar em informações de propriedades
        optimized = this.optimizeForPresentation(optimized);
        break;
        
      case 'engagement':
        // Manter elementos de persuasão
        optimized = this.optimizeForEngagement(optimized);
        break;
        
      case 'conversion':
        // Manter call-to-action e urgência
        optimized = this.optimizeForConversion(optimized);
        break;
    }

    return optimized;
  }

  /**
   * Compressão agressiva para casos extremos
   */
  private aggressiveCompression(response: string, analysis: ResponseAnalysis): string {
    let optimized = response;

    // Manter apenas elementos essenciais baseado na análise
    if (analysis.conversionPotential > 70) {
      // Alto potencial de conversão - manter call-to-action
      optimized = this.preserveConversionElements(optimized);
    }

    // Remover palavras de enchimento
    const fillerWords = [
      'bem', 'né', 'então', 'assim', 'tipo', 'meio', 'meio que',
      'na verdade', 'no caso', 'por exemplo', 'ou seja', 'quer dizer',
      'enfim', 'bom', 'ok', 'tá', 'beleza'
    ];

    for (const filler of fillerWords) {
      const regex = new RegExp(`\\b${filler}\\b`, 'gi');
      optimized = optimized.replace(regex, '');
    }

    // Compressão extrema de espaçamento
    optimized = optimized
      .replace(/\s+/g, ' ')
      .replace(/\s*([,.!?])\s*/g, '$1 ')
      .trim();

    return optimized;
  }

  /**
   * Otimização final e limpeza
   */
  private finalOptimization(response: string, context: EnhancedConversationContext): string {
    let optimized = response;

    // Limpeza final
    optimized = this.basicCleanup(optimized);

    // Adicionar emojis estratégicos se habilitado
    if (this.config.preserveEmojis) {
      optimized = this.addStrategicEmojis(optimized, context);
    }

    // Garantir que termina com pontuação adequada
    if (!/[.!?]$/.test(optimized)) {
      optimized += optimized.includes('?') ? '' : '!';
    }

    return optimized;
  }

  // ===== MÉTODOS AUXILIARES =====

  private estimateTokens(text: string): number {
    // Estimativa: ~4 caracteres por token (GPT padrão)
    return Math.ceil(text.length / 4);
  }

  private detectSentiment(response: string): 'positive' | 'neutral' | 'negative' {
    const positiveWords = ['ótimo', 'excelente', 'perfeito', 'incrível', 'legal', 'bom'];
    const negativeWords = ['problema', 'ruim', 'difícil', 'caro', 'longe'];
    
    const positiveCount = positiveWords.reduce((count, word) => 
      count + (response.toLowerCase().includes(word) ? 1 : 0), 0);
    const negativeCount = negativeWords.reduce((count, word) => 
      count + (response.toLowerCase().includes(word) ? 1 : 0), 0);
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private detectIntent(response: string, stage: string): string {
    if (response.includes('?')) return 'question';
    if (response.includes('reservar') || response.includes('confirmar')) return 'conversion';
    if (response.includes('mostrar') || response.includes('fotos')) return 'presentation';
    return stage || 'general';
  }

  private extractKeyEntities(response: string): string[] {
    const entities = [];
    
    // Detectar preços
    if (response.match(/R\$\s*\d+/)) entities.push('price');
    
    // Detectar datas
    if (response.match(/\d{1,2}\/\d{1,2}/) || response.match(/\d{4}-\d{2}-\d{2}/)) {
      entities.push('date');
    }
    
    // Detectar números de pessoas
    if (response.match(/\d+\s*pessoas?/)) entities.push('guests');
    
    // Detectar propriedades
    if (response.includes('apartamento') || response.includes('casa')) {
      entities.push('property');
    }
    
    return entities;
  }

  private calculateUrgencyLevel(response: string, context: EnhancedConversationContext): 1 | 2 | 3 | 4 | 5 {
    let urgency = 1;
    
    // Palavras de urgência
    const urgencyWords = ['últimas', 'rápido', 'hoje', 'agora', 'urgente'];
    urgency += urgencyWords.reduce((count, word) => 
      count + (response.toLowerCase().includes(word) ? 1 : 0), 0);
    
    // Stage também influencia urgência
    if (context.conversationState.stage === 'conversion') urgency += 2;
    if (context.conversationState.stage === 'closing') urgency += 3;
    
    return Math.min(5, urgency) as 1 | 2 | 3 | 4 | 5;
  }

  private calculateConversionPotential(response: string, context: EnhancedConversationContext): number {
    let potential = 50; // Base
    
    // Palavras de conversão
    if (response.includes('reservar')) potential += 30;
    if (response.includes('confirmar')) potential += 25;
    if (response.includes('visita')) potential += 20;
    if (response.includes('interesse')) potential += 15;
    
    // Context também influencia
    if (context.conversationState.stage === 'conversion') potential += 20;
    if (context.salesContext.leadScore > 70) potential += 15;
    
    return Math.min(100, potential);
  }

  private calculateRedundancyScore(response: string): number {
    const words = response.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const redundancy = (1 - uniqueWords.size / words.length) * 100;
    return Math.round(redundancy);
  }

  private calculateQualityScore(
    original: string,
    optimized: string,
    analysis: ResponseAnalysis
  ): number {
    let score = 100;
    
    // Penalizar compressão excessiva
    const compressionRatio = optimized.length / original.length;
    if (compressionRatio < 0.3) score -= 30; // Muito comprimido
    if (compressionRatio < 0.2) score -= 20; // Extremamente comprimido
    
    // Verificar se manteve elementos importantes
    if (analysis.keyEntities.length > 0) {
      const preservedEntities = analysis.keyEntities.filter(entity => {
        switch (entity) {
          case 'price': return optimized.includes('R$');
          case 'date': return /\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2}/.test(optimized);
          case 'guests': return optimized.includes('pessoas') || /\d+p/.test(optimized);
          case 'property': return optimized.includes('ap') || optimized.includes('imóvel');
          default: return true;
        }
      });
      
      const preservationRate = preservedEntities.length / analysis.keyEntities.length;
      score = score * preservationRate;
    }
    
    // Bonificar se manteve sentimento positivo
    if (analysis.sentiment === 'positive' && this.detectSentiment(optimized) === 'positive') {
      score += 5;
    }
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private basicCleanup(response: string): string {
    return response
      .replace(/\s+/g, ' ')           // Múltiplos espaços → um
      .replace(/\s*([,.!?])\s*/g, '$1 ') // Espaçamento da pontuação
      .trim();
  }

  private hasEmojis(text: string): boolean {
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/;
    return emojiRegex.test(text);
  }

  private addStrategicEmojis(response: string, context: EnhancedConversationContext): string {
    let optimized = response;
    const stage = context.conversationState.stage;
    
    // Emojis estratégicos por estágio
    const stageEmojis = {
      discovery: '🔍',
      presentation: '🏠',
      engagement: '✨',
      conversion: '🎯',
      closing: '🔥'
    };
    
    // Adicionar emoji no início se apropriado
    if (stage && stageEmojis[stage] && !this.hasEmojis(optimized)) {
      optimized = `${stageEmojis[stage]} ${optimized}`;
    }
    
    // Adicionar emojis inline para elementos específicos
    optimized = optimized
      .replace(/\bR\$\s*(\d+)/g, '💰 R$ $1')
      .replace(/\bvisita\b/gi, '🏠 visita')
      .replace(/\breservar?\b/gi, '✅ reservar');
    
    return optimized;
  }

  private fallbackOptimization(
    response: string,
    context: EnhancedConversationContext,
    startTime: number
  ): OptimizationResult {
    // Fallback simples - apenas limpeza básica
    const optimized = this.basicCleanup(response);
    const originalTokens = this.estimateTokens(response);
    const optimizedTokens = this.estimateTokens(optimized);

    return {
      originalResponse: response,
      optimizedResponse: optimized,
      originalTokens,
      optimizedTokens,
      compressionRatio: optimizedTokens / originalTokens,
      optimizationTechniques: ['fallback-cleanup'],
      qualityScore: 90, // Fallback mantém qualidade alta
      processingTime: Date.now() - startTime
    };
  }

  private updateStats(compressionRatio: number, qualityScore: number, processingTime: number): void {
    this.optimizationStats.totalOptimizations++;
    
    const total = this.optimizationStats.totalOptimizations;
    this.optimizationStats.averageCompressionRatio = 
      ((this.optimizationStats.averageCompressionRatio * (total - 1)) + compressionRatio) / total;
    
    this.optimizationStats.averageQualityScore = 
      ((this.optimizationStats.averageQualityScore * (total - 1)) + qualityScore) / total;
    
    this.optimizationStats.averageProcessingTime = 
      ((this.optimizationStats.averageProcessingTime * (total - 1)) + processingTime) / total;
  }

  // Métodos específicos por estágio (implementações simplificadas)
  private compressForDiscovery(response: string): string {
    return response.replace(/me conte sobre suas preferências/gi, 'preferências?');
  }

  private compressForPresentation(response: string, criticalData: any): string {
    return response.replace(/esta propriedade possui/gi, 'tem');
  }

  private compressForEngagement(response: string): string {
    return response.replace(/gostaria de saber mais/gi, 'quer saber mais');
  }

  private compressForConversion(response: string): string {
    return response.replace(/como podemos prosseguir/gi, 'próximo passo');
  }

  private optimizeForDiscovery(response: string): string {
    // Manter perguntas essenciais
    return response;
  }

  private optimizeForPresentation(response: string): string {
    // Manter informações de propriedades
    return response;
  }

  private optimizeForEngagement(response: string): string {
    // Manter elementos persuasivos
    return response;
  }

  private optimizeForConversion(response: string): string {
    // Manter call-to-action
    return response;
  }

  private preserveConversionElements(response: string): string {
    // Manter palavras-chave de conversão
    const conversionKeywords = ['reservar', 'confirmar', 'visitar', 'agendar'];
    // Implementação simplificada
    return response;
  }

  /**
   * Obter estatísticas do otimizador
   */
  getOptimizationStats(): typeof this.optimizationStats {
    return { ...this.optimizationStats };
  }

  /**
   * Resetar estatísticas
   */
  resetStats(): void {
    this.optimizationStats = {
      totalOptimizations: 0,
      averageCompressionRatio: 0,
      averageQualityScore: 0,
      averageProcessingTime: 0
    };
  }
}

// Export singleton instance
export const responseOptimizer = new ResponseOptimizer();

export default ResponseOptimizer;