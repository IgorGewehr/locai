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
    patterns: ['ok', 'tá', 'ta', 'certo', 'beleza', 'entendi'],
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
    const match = predefined.patterns.some(pattern => {
      // Use exact match for short patterns or word boundary matching for longer ones
      if (pattern.length <= 3) {
        return normalizedContent === pattern
      } else {
        // For longer patterns, check if it's a whole word match
        const regex = new RegExp(`\\b${pattern}\\b`, 'i')
        return regex.test(normalizedContent)
      }
    })
    
    if (match) {
      return predefined
    }
  }
  
  return null
}

export function shouldUsePredefinedResponse(content: string, conversationLength: number): boolean {
  // Usar respostas predefinidas APENAS para:
  // 1. Mensagens muito curtas e simples (< 5 caracteres E sem palavras complexas)
  // 2. Saudações específicas no início da conversa
  // 3. Despedidas específicas
  
  const normalizedContent = content.toLowerCase().trim()
  const isVeryShortMessage = content.length < 5
  
  // Não usar predefinidas se a mensagem contém palavras que indicam intenção específica
  const hasSpecificIntent = /apartamento|casa|imóvel|imovel|quero|preciso|gostaria|alug|reserv|fotos|imagens|valor|preço|preco|disponib|quando|onde|como|quantas|pessoas|datas|entrada|saida|check/.test(normalizedContent)
  
  if (hasSpecificIntent) {
    return false // Sempre usar AI para mensagens com intenção específica
  }
  
  // Usar predefinidas apenas para saudações/despedidas muito específicas
  const isSimpleGreeting = /^(oi|olá|ola|hey|bom dia|boa tarde|boa noite)$/i.test(normalizedContent)
  const isSimpleFarewell = /^(tchau|até logo|bye|falou|obrigado|obrigada)$/i.test(normalizedContent)
  const isSimpleAcknowledgment = /^(ok|tá|ta|certo|beleza|entendi|sim|s|não|nao|n)$/i.test(normalizedContent)
  
  return isVeryShortMessage || isSimpleGreeting || isSimpleFarewell || isSimpleAcknowledgment
}