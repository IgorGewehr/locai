import { AIResponse } from '@/lib/types/ai'

interface PredefinedResponse {
  patterns: string[]
  response: AIResponse
  confidence: number
}

export const PREDEFINED_RESPONSES: PredefinedResponse[] = [
  {
    patterns: ['olá', 'oi', 'bom dia', 'boa tarde', 'boa noite', 'hey', 'e ai'],
    response: {
      content: 'Olá! Sou a Sofia, sua consultora de imóveis. Como posso te ajudar hoje? 😊',
      confidence: 0.9,
      sentiment: { score: 0.8, label: 'positive', confidence: 0.9 }
    },
    confidence: 0.95
  },
  {
    patterns: ['tchau', 'até logo', 'bye', 'falou', 'obrigado'],
    response: {
      content: 'Muito obrigada pelo contato! Qualquer dúvida, estarei aqui para ajudar. Até logo! 👋',
      confidence: 0.9,
      sentiment: { score: 0.8, label: 'positive', confidence: 0.9 }
    },
    confidence: 0.95
  },
  {
    patterns: ['preciso de informações', 'gostaria de saber', 'me ajude'],
    response: {
      content: 'Claro! Posso te ajudar com informações sobre nossos imóveis. Você tem alguma preferência específica?',
      confidence: 0.8,
      sentiment: { score: 0.7, label: 'neutral', confidence: 0.8 }
    },
    confidence: 0.8
  },
  {
    patterns: ['horário', 'funcionamento', 'que horas', 'quando abrem'],
    response: {
      content: 'Nosso atendimento é 24/7 via WhatsApp! Durante o horário comercial (9h às 18h), nossa equipe está disponível para atendimento personalizado.',
      confidence: 0.9,
      sentiment: { score: 0.7, label: 'neutral', confidence: 0.9 }
    },
    confidence: 0.9
  },
  {
    patterns: ['não entendi', 'como assim', 'explique melhor', 'não compreendi'],
    response: {
      content: 'Desculpe se não fui clara. Vou explicar melhor: estou aqui para ajudar com aluguel de imóveis. Você está procurando um apartamento ou casa?',
      confidence: 0.8,
      sentiment: { score: 0.6, label: 'neutral', confidence: 0.8 }
    },
    confidence: 0.85
  },
  {
    patterns: ['ok', 'tá', 'certo', 'beleza', 'entendi', 'sim', 's'],
    response: {
      content: 'Perfeito! Em que mais posso ajudar?',
      confidence: 0.9,
      sentiment: { score: 0.7, label: 'positive', confidence: 0.9 }
    },
    confidence: 0.9
  },
  {
    patterns: ['não', 'nao', 'n', 'negativo'],
    response: {
      content: 'Entendi. Posso ajudar com algo mais?',
      confidence: 0.8,
      sentiment: { score: 0.6, label: 'neutral', confidence: 0.8 }
    },
    confidence: 0.85
  },
  {
    patterns: ['qual valor', 'quanto custa', 'preço', 'valor'],
    response: {
      content: 'Para te passar valores, preciso saber: qual imóvel te interessou e para quais datas?',
      confidence: 0.8,
      sentiment: { score: 0.7, label: 'neutral', confidence: 0.8 }
    },
    confidence: 0.8
  },
  {
    patterns: ['localização', 'onde fica', 'endereço', 'local'],
    response: {
      content: 'Temos imóveis em diversas localizações. Qual região você prefere?',
      confidence: 0.8,
      sentiment: { score: 0.7, label: 'neutral', confidence: 0.8 }
    },
    confidence: 0.8
  },
  {
    patterns: ['pode me ajudar', 'preciso de ajuda', 'me ajuda', 'ajuda'],
    response: {
      content: 'Claro! Estou aqui para isso. Me conta o que você precisa?',
      confidence: 0.9,
      sentiment: { score: 0.8, label: 'positive', confidence: 0.9 }
    },
    confidence: 0.9
  }
]

export function findPredefinedResponse(content: string): PredefinedResponse | null {
  const normalizedContent = content.toLowerCase().trim()
  
  for (const predefined of PREDEFINED_RESPONSES) {
    const match = predefined.patterns.some(pattern => 
      normalizedContent.includes(pattern) || 
      normalizedContent === pattern
    )
    
    if (match) {
      return predefined
    }
  }
  
  return null
}

export function shouldUsePredefinedResponse(content: string, conversationLength: number): boolean {
  // Usar respostas predefinidas para:
  // 1. Mensagens muito curtas (< 10 caracteres)
  // 2. Primeiras mensagens da conversa
  // 3. Padrões comuns de saudação/despedida
  
  const isShortMessage = content.length < 10
  const isFirstMessage = conversationLength === 0
  const hasPredefinedMatch = findPredefinedResponse(content) !== null
  
  return isShortMessage || isFirstMessage || hasPredefinedMatch
}