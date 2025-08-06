// Advanced AI Insights Service - Next-Generation Business Intelligence
// Uses GPT-4 to analyze conversation patterns and generate actionable insights

import openaiService from './openai';
import { Timestamp, collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { logger } from '@/lib/utils/logger';
import { Conversation, Message } from '@/lib/types/conversation';

export interface AIGeneratedInsight {
  id: string;
  title: string;
  description: string;
  confidence: number; // 0-1
  impact: 'revenue' | 'efficiency' | 'satisfaction' | 'retention';
  priority: 'critical' | 'high' | 'medium' | 'low';
  category: 'conversion' | 'service' | 'product' | 'marketing' | 'operational';
  actionableSteps: string[];
  estimatedROI?: number; // in BRL
  timeToImplement: string;
  metrics: {
    affectedConversations: number;
    potentialRevenue: number;
    currentLoss?: number;
  };
  evidence: {
    conversationExamples: string[];
    patterns: string[];
    frequency: number;
  };
  generatedAt: Date;
}

export interface PredictiveAnalysis {
  conversionPrediction: {
    nextMonth: {
      expected: number;
      range: { min: number; max: number };
      confidence: number;
    };
    factors: {
      factor: string;
      influence: number; // -1 to 1
      description: string;
    }[];
  };
  customerBehaviorTrends: {
    trend: string;
    direction: 'increasing' | 'decreasing' | 'stable';
    strength: number; // 0-1
    prediction: string;
  }[];
  seasonalityInsights: {
    period: string;
    expectedDemandChange: number; // percentage
    priceOptimization: string;
    marketingTiming: string;
  }[];
}

export interface SmartRecommendations {
  aiPromptOptimizations: {
    currentIssue: string;
    suggestedChange: string;
    expectedImprovement: string;
    priority: number;
  }[];
  automationOpportunities: {
    task: string;
    frequency: number;
    timeWasted: number; // minutes per day
    automationComplexity: 'low' | 'medium' | 'high';
    potentialSavings: number; // BRL per month
    implementation: string;
  }[];
  contentGaps: {
    topic: string;
    requestFrequency: number;
    currentResponse: string;
    suggestedImprovement: string;
    impact: string;
  }[];
}

export interface RealTimeAlerts {
  id: string;
  type: 'performance_drop' | 'opportunity' | 'issue' | 'trend';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  suggestedAction: string;
  timestamp: Date;
  dismissed: boolean;
  data?: any;
}

class AdvancedAIInsightsService {
  private async getConversationsWithMessages(tenantId: string, days: number = 30): Promise<Conversation[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const conversationsRef = collection(db, `tenants/${tenantId}/conversations`);
    const q = query(
      conversationsRef,
      where('createdAt', '>=', Timestamp.fromDate(startDate)),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Conversation[];
  }

  private async analyzeWithGPT4(prompt: string, data: any): Promise<any> {
    try {
      const response = await openaiService.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um analista de negócios especializado em imobiliárias e inteligência artificial conversacional. 
            Analise os dados fornecidos e gere insights práticos e acionáveis para melhorar o desempenho do negócio.
            
            Responda SEMPRE em JSON válido, sem texto adicional antes ou depois.
            Seja preciso com números e específico com recomendações.`
          },
          {
            role: 'user',
            content: `${prompt}\n\nDados para análise:\n${JSON.stringify(data, null, 2)}`
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) throw new Error('No response from GPT-4');

      return JSON.parse(content);
    } catch (error) {
      logger.error('❌ [GPT-4 Analysis] Error', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async generateAIInsights(tenantId: string, days: number = 30): Promise<AIGeneratedInsight[]> {
    try {
      logger.info('🤖 [AdvancedAI] Generating AI insights', { tenantId, days });

      const conversations = await this.getConversationsWithMessages(tenantId, days);
      
      if (conversations.length === 0) {
        return [];
      }

      // Prepare data for AI analysis
      const analysisData = {
        totalConversations: conversations.length,
        conversationSummaries: conversations.slice(0, 50).map(conv => ({
          id: conv.id,
          messageCount: conv.messages?.length || 0,
          duration: this.calculateDuration(conv.messages || []),
          outcome: this.inferOutcome(conv),
          keyTopics: this.extractKeyTopics(conv.messages || []),
          sentiment: this.calculateSentiment(conv.messages || []),
          clientBehavior: this.analyzeClientBehavior(conv.messages || [])
        })),
        patterns: {
          commonQuestions: this.findCommonQuestions(conversations),
          failurePoints: this.identifyFailurePoints(conversations),
          successFactors: this.identifySuccessFactors(conversations)
        }
      };

      const prompt = `
      Analise estes dados de conversas de uma imobiliária e gere insights acionáveis.
      
      Para cada insight, retorne um objeto JSON com esta estrutura:
      {
        "insights": [
          {
            "id": "unique_id",
            "title": "Título conciso",
            "description": "Descrição detalhada do problema/oportunidade",
            "confidence": 0.85,
            "impact": "revenue|efficiency|satisfaction|retention",
            "priority": "critical|high|medium|low",
            "category": "conversion|service|product|marketing|operational",
            "actionableSteps": ["Passo 1", "Passo 2"],
            "estimatedROI": 5000,
            "timeToImplement": "1-2 semanas",
            "metrics": {
              "affectedConversations": 25,
              "potentialRevenue": 15000,
              "currentLoss": 8000
            },
            "evidence": {
              "conversationExamples": ["Exemplo 1", "Exemplo 2"],
              "patterns": ["Padrão 1", "Padrão 2"],
              "frequency": 15
            }
          }
        ]
      }
      
      Foque nos insights mais impactantes para o negócio.
      `;

      const response = await this.analyzeWithGPT4(prompt, analysisData);
      
      return response.insights.map((insight: any) => ({
        ...insight,
        generatedAt: new Date()
      }));

    } catch (error) {
      logger.error('❌ [AdvancedAI] Error generating insights', {
        tenantId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      return [];
    }
  }

  async generatePredictiveAnalysis(tenantId: string): Promise<PredictiveAnalysis> {
    try {
      const conversations = await this.getConversationsWithMessages(tenantId, 90); // 3 months
      
      const monthlyStats = this.calculateMonthlyStats(conversations);
      const trends = this.identifyTrends(conversations);
      
      const prompt = `
      Baseado nos dados históricos, gere uma análise preditiva para o próximo mês.
      Retorne JSON com esta estrutura:
      {
        "conversionPrediction": {
          "nextMonth": {
            "expected": 12,
            "range": {"min": 8, "max": 16},
            "confidence": 0.78
          },
          "factors": [
            {
              "factor": "Sazonalidade",
              "influence": 0.3,
              "description": "Verão aumenta demanda"
            }
          ]
        },
        "customerBehaviorTrends": [
          {
            "trend": "Clientes mais exigentes com comodidades",
            "direction": "increasing",
            "strength": 0.7,
            "prediction": "Demanda por Wi-Fi e piscina continuará crescendo"
          }
        ],
        "seasonalityInsights": [
          {
            "period": "Dezembro-Janeiro",
            "expectedDemandChange": 45,
            "priceOptimization": "Aumente preços em 20%",
            "marketingTiming": "Intensifique marketing em novembro"
          }
        ]
      }
      `;

      return await this.analyzeWithGPT4(prompt, { monthlyStats, trends });
    } catch (error) {
      logger.error('❌ [AdvancedAI] Error generating predictions', { error });
      return this.getDefaultPredictions();
    }
  }

  async generateSmartRecommendations(tenantId: string): Promise<SmartRecommendations> {
    try {
      const conversations = await this.getConversationsWithMessages(tenantId, 30);
      
      const aiPerformance = this.analyzeAIPerformance(conversations);
      const taskAnalysis = this.analyzeRepetitiveTasks(conversations);
      const contentAnalysis = this.analyzeContentGaps(conversations);

      const prompt = `
      Analise o desempenho atual e gere recomendações inteligentes.
      Retorne JSON com esta estrutura:
      {
        "aiPromptOptimizations": [
          {
            "currentIssue": "AI não entende perguntas sobre pets",
            "suggestedChange": "Adicionar seção sobre políticas pet-friendly",
            "expectedImprovement": "Redução de 30% em conversas não resolvidas",
            "priority": 8
          }
        ],
        "automationOpportunities": [
          {
            "task": "Envio de fotos de propriedades",
            "frequency": 45,
            "timeWasted": 90,
            "automationComplexity": "low",
            "potentialSavings": 1200,
            "implementation": "Criar galeria automática"
          }
        ],
        "contentGaps": [
          {
            "topic": "Políticas de cancelamento",
            "requestFrequency": 25,
            "currentResponse": "Resposta genérica",
            "suggestedImprovement": "Criar FAQ específico",
            "impact": "Reduzirá 40% das dúvidas"
          }
        ]
      }
      `;

      return await this.analyzeWithGPT4(prompt, {
        aiPerformance,
        taskAnalysis,
        contentAnalysis
      });
    } catch (error) {
      logger.error('❌ [AdvancedAI] Error generating recommendations', { error });
      return this.getDefaultRecommendations();
    }
  }

  async generateRealTimeAlerts(tenantId: string): Promise<RealTimeAlerts[]> {
    try {
      const recentConversations = await this.getConversationsWithMessages(tenantId, 1); // Last 24h
      const alerts: RealTimeAlerts[] = [];

      // Performance drop detection
      const conversionRate = this.calculateRecentConversionRate(recentConversations);
      if (conversionRate < 0.1) { // Less than 10%
        alerts.push({
          id: `perf_drop_${Date.now()}`,
          type: 'performance_drop',
          severity: 'high',
          title: 'Taxa de Conversão Baixa',
          message: `Taxa atual: ${(conversionRate * 100).toFixed(1)}% - abaixo do esperado`,
          suggestedAction: 'Verificar performance do AI Agent e otimizar respostas',
          timestamp: new Date(),
          dismissed: false,
          data: { conversionRate }
        });
      }

      // Opportunity detection
      const highValueLeads = this.identifyHighValueLeads(recentConversations);
      if (highValueLeads.length > 0) {
        alerts.push({
          id: `opportunity_${Date.now()}`,
          type: 'opportunity',
          severity: 'medium',
          title: 'Leads de Alto Valor Identificados',
          message: `${highValueLeads.length} leads com alto potencial de conversão`,
          suggestedAction: 'Priorizar follow-up personalizado',
          timestamp: new Date(),
          dismissed: false,
          data: { leads: highValueLeads.length }
        });
      }

      // Issue detection
      const commonIssues = this.detectCommonIssues(recentConversations);
      for (const issue of commonIssues) {
        alerts.push({
          id: `issue_${issue.type}_${Date.now()}`,
          type: 'issue',
          severity: issue.frequency > 5 ? 'high' : 'medium',
          title: issue.title,
          message: issue.message,
          suggestedAction: issue.solution,
          timestamp: new Date(),
          dismissed: false,
          data: issue
        });
      }

      return alerts;
    } catch (error) {
      logger.error('❌ [AdvancedAI] Error generating alerts', { error });
      return [];
    }
  }

  // Helper methods
  private calculateDuration(messages: Message[]): number {
    if (messages.length < 2) return 0;
    const first = new Date(messages[0].timestamp);
    const last = new Date(messages[messages.length - 1].timestamp);
    return (last.getTime() - first.getTime()) / 1000 / 60; // minutes
  }

  private inferOutcome(conversation: Conversation): 'converted' | 'interested' | 'lost' {
    const messages = conversation.messages || [];
    const lastUserMessage = messages
      .filter(m => m.from === 'user')
      .pop()?.text?.toLowerCase() || '';
    
    if (lastUserMessage.includes('reservar') || lastUserMessage.includes('confirmar')) {
      return 'converted';
    }
    if (lastUserMessage.includes('pensar') || lastUserMessage.includes('depois')) {
      return 'interested';
    }
    return 'lost';
  }

  private extractKeyTopics(messages: Message[]): string[] {
    const topics = new Set<string>();
    const keywords = {
      price: ['preço', 'valor', 'custo'],
      amenities: ['piscina', 'wifi', 'ar condicionado'],
      location: ['localização', 'endereço', 'onde fica'],
      availability: ['disponível', 'data', 'período']
    };

    messages.forEach(msg => {
      const text = (msg.text || '').toLowerCase();
      Object.entries(keywords).forEach(([topic, words]) => {
        if (words.some(word => text.includes(word))) {
          topics.add(topic);
        }
      });
    });

    return Array.from(topics);
  }

  private calculateSentiment(messages: Message[]): number {
    // Simplified sentiment analysis
    const positiveWords = ['ótimo', 'excelente', 'perfeito', 'gostei'];
    const negativeWords = ['ruim', 'péssimo', 'caro', 'longe'];
    
    let score = 0;
    messages.forEach(msg => {
      const text = (msg.text || '').toLowerCase();
      positiveWords.forEach(word => {
        if (text.includes(word)) score += 1;
      });
      negativeWords.forEach(word => {
        if (text.includes(word)) score -= 1;
      });
    });
    
    return Math.max(-1, Math.min(1, score / messages.length));
  }

  private analyzeClientBehavior(messages: Message[]): string {
    const userMessages = messages.filter(m => m.from === 'user');
    const avgLength = userMessages.reduce((sum, m) => sum + (m.text?.length || 0), 0) / userMessages.length;
    
    if (avgLength > 100) return 'detailed_communicator';
    if (avgLength > 50) return 'moderate_communicator';
    return 'brief_communicator';
  }

  private findCommonQuestions(conversations: Conversation[]): string[] {
    const questions = new Map<string, number>();
    
    conversations.forEach(conv => {
      conv.messages?.forEach(msg => {
        if (msg.from === 'user' && msg.text?.includes('?')) {
          const question = msg.text.toLowerCase();
          questions.set(question, (questions.get(question) || 0) + 1);
        }
      });
    });

    return Array.from(questions.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([question]) => question);
  }

  private identifyFailurePoints(conversations: Conversation[]): string[] {
    return conversations
      .filter(conv => this.inferOutcome(conv) === 'lost')
      .slice(0, 20)
      .map(conv => {
        const lastMsg = conv.messages?.filter(m => m.from === 'user').pop();
        return lastMsg?.text?.substring(0, 100) || 'Unknown reason';
      });
  }

  private identifySuccessFactors(conversations: Conversation[]): string[] {
    return conversations
      .filter(conv => this.inferOutcome(conv) === 'converted')
      .slice(0, 20)
      .map(conv => {
        const assistantMsgs = conv.messages?.filter(m => m.from === 'assistant') || [];
        return assistantMsgs[Math.floor(assistantMsgs.length / 2)]?.text?.substring(0, 100) || 'Success factor';
      });
  }

  private calculateMonthlyStats(conversations: Conversation[]): any {
    const monthly = new Map<string, number>();
    
    conversations.forEach(conv => {
      const date = new Date((conv.createdAt as any)?.toDate?.() || conv.createdAt);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      monthly.set(key, (monthly.get(key) || 0) + 1);
    });

    return Object.fromEntries(monthly);
  }

  private identifyTrends(conversations: Conversation[]): any {
    // Simplified trend analysis
    const recent = conversations.slice(0, Math.floor(conversations.length / 2));
    const older = conversations.slice(Math.floor(conversations.length / 2));
    
    return {
      conversationGrowth: (recent.length - older.length) / older.length,
      averageDuration: {
        recent: recent.reduce((sum, c) => sum + this.calculateDuration(c.messages || []), 0) / recent.length,
        older: older.reduce((sum, c) => sum + this.calculateDuration(c.messages || []), 0) / older.length
      }
    };
  }

  private analyzeAIPerformance(conversations: Conversation[]): any {
    const totalResponses = conversations.reduce((sum, c) => 
      sum + (c.messages?.filter(m => m.from === 'assistant').length || 0), 0
    );
    
    const successfulConversations = conversations.filter(c => 
      this.inferOutcome(c) === 'converted'
    ).length;
    
    return {
      totalResponses,
      successRate: successfulConversations / conversations.length,
      averageResponseTime: 2.5 // This would be calculated from actual data
    };
  }

  private analyzeRepetitiveTasks(conversations: Conversation[]): any {
    const tasks = new Map<string, number>();
    
    // Identify repetitive patterns in assistant responses
    conversations.forEach(conv => {
      conv.messages?.forEach(msg => {
        if (msg.from === 'assistant') {
          if (msg.text?.includes('foto')) tasks.set('photo_requests', (tasks.get('photo_requests') || 0) + 1);
          if (msg.text?.includes('preço')) tasks.set('price_inquiries', (tasks.get('price_inquiries') || 0) + 1);
          if (msg.text?.includes('disponível')) tasks.set('availability_checks', (tasks.get('availability_checks') || 0) + 1);
        }
      });
    });

    return Object.fromEntries(tasks);
  }

  private analyzeContentGaps(conversations: Conversation[]): any {
    const gaps = new Map<string, number>();
    
    conversations.forEach(conv => {
      conv.messages?.forEach(msg => {
        if (msg.from === 'user' && msg.text?.includes('?')) {
          // Identify unanswered questions or generic responses
          if (msg.text.includes('pet')) gaps.set('pet_policy', (gaps.get('pet_policy') || 0) + 1);
          if (msg.text.includes('cancelar')) gaps.set('cancellation', (gaps.get('cancellation') || 0) + 1);
          if (msg.text.includes('desconto')) gaps.set('discounts', (gaps.get('discounts') || 0) + 1);
        }
      });
    });

    return Object.fromEntries(gaps);
  }

  private calculateRecentConversionRate(conversations: Conversation[]): number {
    if (conversations.length === 0) return 0;
    const converted = conversations.filter(c => this.inferOutcome(c) === 'converted').length;
    return converted / conversations.length;
  }

  private identifyHighValueLeads(conversations: Conversation[]): any[] {
    return conversations
      .filter(conv => {
        const messages = conv.messages || [];
        const hasHighValue = messages.some(m => 
          m.text?.includes('urgente') || 
          m.text?.includes('hoje') ||
          m.text?.includes('confirmar')
        );
        return hasHighValue && this.inferOutcome(conv) === 'interested';
      })
      .map(conv => ({
        id: conv.id,
        urgency: 'high',
        potential: this.calculatePotential(conv)
      }));
  }

  private calculatePotential(conversation: Conversation): number {
    // Simplified potential calculation
    const messages = conversation.messages || [];
    let score = 0;
    
    messages.forEach(msg => {
      if (msg.text?.includes('quanto')) score += 10;
      if (msg.text?.includes('reservar')) score += 20;
      if (msg.text?.includes('urgente')) score += 15;
    });

    return Math.min(100, score);
  }

  private detectCommonIssues(conversations: Conversation[]): any[] {
    const issues = [];
    
    // Check for common patterns
    const priceComplaints = conversations.filter(c => 
      c.messages?.some(m => m.text?.toLowerCase().includes('caro'))
    ).length;
    
    if (priceComplaints > 3) {
      issues.push({
        type: 'pricing_concern',
        title: 'Muitas Reclamações de Preço',
        message: `${priceComplaints} clientes reclamaram dos preços`,
        solution: 'Revisar estratégia de preços ou melhorar comunicação de valor',
        frequency: priceComplaints
      });
    }

    return issues;
  }

  private getDefaultPredictions(): PredictiveAnalysis {
    return {
      conversionPrediction: {
        nextMonth: { expected: 0, range: { min: 0, max: 0 }, confidence: 0 },
        factors: []
      },
      customerBehaviorTrends: [],
      seasonalityInsights: []
    };
  }

  private getDefaultRecommendations(): SmartRecommendations {
    return {
      aiPromptOptimizations: [],
      automationOpportunities: [],
      contentGaps: []
    };
  }
}

export const advancedAIInsightsService = new AdvancedAIInsightsService();