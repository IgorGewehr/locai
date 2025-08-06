// Mock Advanced Insights Service - For Development/Demo
// This provides realistic demo data without external API dependencies

import { 
  AIGeneratedInsight,
  PredictiveAnalysis,
  SmartRecommendations,
  RealTimeAlerts
} from './advanced-ai-insights';

export const mockAIInsights: AIGeneratedInsight[] = [
  {
    id: 'insight_1',
    title: 'Taxa de Abandono Alta em Consultas de Preço',
    description: 'Clientes frequentemente abandonam a conversa após receber cotações. Padrão detectado em 67% das consultas de preço nas últimas 2 semanas.',
    confidence: 0.87,
    impact: 'revenue',
    priority: 'critical',
    category: 'conversion',
    actionableSteps: [
      'Adicionar justificativa de valor após apresentar preço',
      'Oferecer opções de parcelamento imediatamente',
      'Implementar desconto por decisão rápida',
      'Enviar comparativo com mercado automaticamente'
    ],
    estimatedROI: 15000,
    timeToImplement: '1-2 semanas',
    metrics: {
      affectedConversations: 34,
      potentialRevenue: 22500,
      currentLoss: 15000
    },
    evidence: {
      conversationExamples: [
        'Cliente perguntou preço, recebeu R$ 2.800/noite, parou de responder',
        'Solicitou orçamento semanal, após receber R$ 18.200 não respondeu mais',
        'Interessado em casa de praia, saiu após cotação de R$ 3.500/dia'
      ],
      patterns: [
        'Abandono médio 8 minutos após receber preço',
        'Maior abandono em propriedades acima de R$ 2.500/dia',
        'Taxa de resposta após preço: apenas 31%'
      ],
      frequency: 34
    },
    generatedAt: new Date()
  },
  {
    id: 'insight_2',
    title: 'Oportunidade: Clientes Procuram Tour Virtual',
    description: 'Detectado aumento de 340% em solicitações por "fotos", "vídeo" ou "ver propriedade". Tour virtual pode aumentar conversões em 45%.',
    confidence: 0.91,
    impact: 'efficiency',
    priority: 'high',
    category: 'product',
    actionableSteps: [
      'Implementar tours virtuais 360° nas propriedades principais',
      'Criar bot de envio automático de tour após interesse',
      'Adicionar link de tour na primeira resposta sobre propriedade',
      'Configurar agendamento de visita virtual'
    ],
    estimatedROI: 8500,
    timeToImplement: '2-3 semanas',
    metrics: {
      affectedConversations: 28,
      potentialRevenue: 18000,
      currentLoss: 5200
    },
    evidence: {
      conversationExamples: [
        '"Tem fotos do interior?" - 45 vezes este mês',
        '"Pode enviar vídeo da casa?" - 23 vezes',
        '"Quero ver como é por dentro" - 18 vezes'
      ],
      patterns: [
        'Solicitações de mídia visual aumentaram 340%',
        'Conversões 67% maiores quando enviamos fotos rapidamente',
        'Clientes fazem reserva 2.3x mais rápido com tour virtual'
      ],
      frequency: 28
    },
    generatedAt: new Date()
  },
  {
    id: 'insight_3',
    title: 'Horário Otimizado para Respostas: 19h-22h',
    description: 'Análise comportamental revela que respostas entre 19h-22h têm 73% mais engajamento e 2.1x maior taxa de conversão.',
    confidence: 0.83,
    impact: 'satisfaction',
    priority: 'medium',
    category: 'operational',
    actionableSteps: [
      'Programar IA para ser mais proativa no horário nobre',
      'Enviar follow-ups automáticos às 20h',
      'Configurar ofertas especiais neste período',
      'Ajustar disponibilidade da equipe'
    ],
    estimatedROI: 4200,
    timeToImplement: '1 semana',
    metrics: {
      affectedConversations: 156,
      potentialRevenue: 12300,
    },
    evidence: {
      conversationExamples: [
        'Resposta às 20:15 → reserva em 12 minutos',
        'Mensagem às 21:30 → interesse imediato',
        'Follow-up às 19:45 → confirmação no dia seguinte'
      ],
      patterns: [
        '73% mais engajamento entre 19h-22h',
        'Taxa de conversão noturna: 23% vs 11% diurna',
        'Tempo médio de decisão: 24% menor à noite'
      ],
      frequency: 156
    },
    generatedAt: new Date()
  },
  {
    id: 'insight_4',
    title: 'Palavras-Chave de Alta Conversão Identificadas',
    description: 'IA detectou 5 palavras/frases que aumentam conversão em 156% quando usadas nas respostas: "exclusivo", "últimas vagas", "desconto hoje".',
    confidence: 0.79,
    impact: 'revenue',
    priority: 'high',
    category: 'marketing',
    actionableSteps: [
      'Treinar IA para usar palavras de alta conversão',
      'Criar templates com essas palavras-chave',
      'A/B test mensagens com e sem power words',
      'Atualizar scripts de vendas da equipe'
    ],
    estimatedROI: 11200,
    timeToImplement: '1 semana',
    metrics: {
      affectedConversations: 67,
      potentialRevenue: 28400,
    },
    evidence: {
      conversationExamples: [
        'Uso de "exclusivo" → conversão de 45%',
        '"Últimas 2 vagas" → reserva em 4 horas',
        '"Desconto especial hoje" → fechamento imediato'
      ],
      patterns: [
        'Power words aumentam urgência em 89%',
        'Conversão 2.5x maior com escassez artificial',
        'Taxa de abertura de links: +67% com gatilhos'
      ],
      frequency: 67
    },
    generatedAt: new Date()
  }
];

export const mockPredictions: PredictiveAnalysis = {
  conversionPrediction: {
    nextMonth: {
      expected: 23,
      range: { min: 18, max: 28 },
      confidence: 0.84
    },
    factors: [
      {
        factor: 'Sazonalidade Verão',
        influence: 0.45,
        description: 'Dezembro-Janeiro historicamente aumentam demanda em 45%'
      },
      {
        factor: 'Melhorias na IA',
        influence: 0.23,
        description: 'Otimizações recentes podem aumentar conversões'
      },
      {
        factor: 'Competição',
        influence: -0.12,
        description: 'Novos concorrentes podem reduzir market share'
      },
      {
        factor: 'Preços Otimizados',
        influence: 0.18,
        description: 'Ajustes de preço baseados em demanda'
      }
    ]
  },
  customerBehaviorTrends: [
    {
      trend: 'Busca por Propriedades Pet-Friendly',
      direction: 'increasing',
      strength: 0.78,
      prediction: 'Demanda por pets deve crescer 85% nos próximos 3 meses'
    },
    {
      trend: 'Preferência por Check-in Contactless',
      direction: 'increasing', 
      strength: 0.65,
      prediction: 'Clientes valorizam cada vez mais autonomia no check-in'
    },
    {
      trend: 'Exigência por Comodidades Premium',
      direction: 'increasing',
      strength: 0.82,
      prediction: 'Wi-Fi rápido, piscina e churrasqueira são obrigatórios'
    },
    {
      trend: 'Sensibilidade a Preços Altos',
      direction: 'decreasing',
      strength: 0.34,
      prediction: 'Clientes aceitam pagar mais por experiência diferenciada'
    }
  ],
  seasonalityInsights: [
    {
      period: 'Verão (Dez-Fev)',
      expectedDemandChange: 67,
      priceOptimization: 'Aumentar preços em 25-30% durante picos',
      marketingTiming: 'Intensificar marketing em novembro'
    },
    {
      period: 'Carnaval (Fev-Mar)',
      expectedDemandChange: 89,
      priceOptimization: 'Implementar preços dinâmicos por evento',
      marketingTiming: 'Campanhas específicas 45 dias antes'
    },
    {
      period: 'Inverno (Jun-Ago)',
      expectedDemandChange: -23,
      priceOptimization: 'Descontos de baixa temporada de 15-20%',
      marketingTiming: 'Focar em estadias longas e executivos'
    },
    {
      period: 'Réveillon (Dez)',
      expectedDemandChange: 145,
      priceOptimization: 'Preços premium, reserva mínima 7 dias',
      marketingTiming: 'Pré-venda em setembro/outubro'
    }
  ]
};

export const mockRecommendations: SmartRecommendations = {
  aiPromptOptimizations: [
    {
      currentIssue: 'IA não identifica urgência em pedidos',
      suggestedChange: 'Adicionar detecção de palavras como "hoje", "urgente", "agora"',
      expectedImprovement: 'Redução de 40% no tempo de resposta a leads quentes',
      priority: 9
    },
    {
      currentIssue: 'Respostas muito técnicas sobre propriedades',
      suggestedChange: 'Treinar IA para foco em benefícios emocionais',
      expectedImprovement: 'Aumento de 25% no engajamento emocional',
      priority: 7
    },
    {
      currentIssue: 'Não oferece alternativas quando propriedade indisponível',
      suggestedChange: 'Implementar sugestões automáticas de propriedades similares',
      expectedImprovement: 'Redução de 60% na taxa de abandono',
      priority: 8
    }
  ],
  automationOpportunities: [
    {
      task: 'Envio Automático de Fotos',
      frequency: 78,
      timeWasted: 234,
      automationComplexity: 'low',
      potentialSavings: 2800,
      implementation: 'Criar galeria automática ativada por palavras-chave'
    },
    {
      task: 'Follow-up de Leads Inativos',
      frequency: 45,
      timeWasted: 135,
      automationComplexity: 'medium',
      potentialSavings: 1900,
      implementation: 'Sistema de nurturing automático com intervalos inteligentes'
    },
    {
      task: 'Cálculo de Preços Personalizados',
      frequency: 156,
      timeWasted: 312,
      automationComplexity: 'low',
      potentialSavings: 3400,
      implementation: 'Calculadora dinâmica baseada em datas e ocupação'
    },
    {
      task: 'Agendamento de Visitas',
      frequency: 23,
      timeWasted: 92,
      automationComplexity: 'high',
      potentialSavings: 1200,
      implementation: 'Integração com calendário e confirmação automática'
    }
  ],
  contentGaps: [
    {
      topic: 'Política de Animais de Estimação',
      requestFrequency: 34,
      currentResponse: 'Resposta genérica sobre regras',
      suggestedImprovement: 'FAQ específico com taxas, regras e propriedades pet-friendly',
      impact: 'Reduzirá 70% das dúvidas sobre pets'
    },
    {
      topic: 'Processo de Check-in/Check-out',
      requestFrequency: 28,
      currentResponse: 'Instruções básicas por WhatsApp',
      suggestedImprovement: 'Guia visual passo-a-passo com vídeos',
      impact: 'Diminuirá calls de suporte em 55%'
    },
    {
      topic: 'Comodidades e Facilidades',
      requestFrequency: 67,
      currentResponse: 'Lista simples de itens',
      suggestedImprovement: 'Catálogo visual com fotos de cada comodidade',
      impact: 'Aumentará taxa de conversão em 35%'
    },
    {
      topic: 'Políticas de Cancelamento',
      requestFrequency: 19,
      currentResponse: 'Texto técnico das condições',
      suggestedImprovement: 'Simulador interativo de cenários de cancelamento',
      impact: 'Reduzirá ansiedade pré-compra em 45%'
    }
  ]
};

export const mockAlerts: RealTimeAlerts[] = [
  {
    id: 'alert_1',
    type: 'performance_drop',
    severity: 'high',
    title: 'Queda na Taxa de Resposta',
    message: 'Taxa de resposta caiu 23% nas últimas 4 horas (de 67% para 44%)',
    suggestedAction: 'Verificar se IA está processando mensagens corretamente',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    dismissed: false,
    data: { currentRate: 44, previousRate: 67 }
  },
  {
    id: 'alert_2',
    type: 'opportunity',
    severity: 'medium',
    title: 'Pico de Interesse Detectado',
    message: '5 leads de alto valor identificados na última hora',
    suggestedAction: 'Priorizar follow-up personalizado para estes leads',
    timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 min ago
    dismissed: false,
    data: { highValueLeads: 5, averagePotential: 2800 }
  },
  {
    id: 'alert_3',
    type: 'trend',
    severity: 'low',
    title: 'Aumento em Consultas sobre Pet-Friendly',
    message: 'Consultas sobre pets aumentaram 340% hoje',
    suggestedAction: 'Considere destacar propriedades que aceitam pets',
    timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 min ago
    dismissed: false,
    data: { increase: 340, category: 'pet-friendly' }
  }
];

// Mock service class for development
export class MockAdvancedAIInsightsService {
  async generateAIInsights(tenantId: string, days: number = 30): Promise<AIGeneratedInsight[]> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return mockAIInsights;
  }

  async generatePredictiveAnalysis(tenantId: string): Promise<PredictiveAnalysis> {
    await new Promise(resolve => setTimeout(resolve, 600));
    return mockPredictions;
  }

  async generateSmartRecommendations(tenantId: string): Promise<SmartRecommendations> {
    await new Promise(resolve => setTimeout(resolve, 700));
    return mockRecommendations;
  }

  async generateRealTimeAlerts(tenantId: string): Promise<RealTimeAlerts[]> {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockAlerts;
  }
}

export const mockAdvancedAIInsightsService = new MockAdvancedAIInsightsService();