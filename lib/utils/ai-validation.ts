import { AIResponse } from '@/lib/types/ai-agent';

export function validateAIResponse(response: any): AIResponse {
  // Validação básica da estrutura
  if (!response || typeof response !== 'object') {
    throw new Error('Invalid AI response: must be an object');
  }

  // Validar thought
  if (!response.thought || typeof response.thought !== 'string') {
    throw new Error('Invalid AI response: thought must be a string');
  }

  // Validar action
  if (!response.action || typeof response.action !== 'object') {
    throw new Error('Invalid AI response: action must be an object');
  }

  const { type, payload } = response.action;
  
  if (!type || !['reply', 'call_tool'].includes(type)) {
    throw new Error('Invalid AI response: action.type must be "reply" or "call_tool"');
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid AI response: action.payload must be an object');
  }

  // Validar payload específico
  if (type === 'reply') {
    if (!payload.message || typeof payload.message !== 'string') {
      throw new Error('Invalid AI response: reply payload must have message string');
    }
  } else if (type === 'call_tool') {
    if (!payload.toolName || typeof payload.toolName !== 'string') {
      throw new Error('Invalid AI response: call_tool payload must have toolName string');
    }
    if (!payload.parameters || typeof payload.parameters !== 'object') {
      throw new Error('Invalid AI response: call_tool payload must have parameters object');
    }
  }

  // Validar confidence
  if (typeof response.confidence !== 'number' || response.confidence < 0 || response.confidence > 1) {
    throw new Error('Invalid AI response: confidence must be a number between 0 and 1');
  }

  // Validar updatedContext
  if (!response.updatedContext || typeof response.updatedContext !== 'object') {
    throw new Error('Invalid AI response: updatedContext must be an object');
  }

  // Normalizar e retornar
  return {
    thought: response.thought,
    action: {
      type: type as 'reply' | 'call_tool',
      payload: payload
    },
    confidence: response.confidence,
    updatedContext: response.updatedContext
  };
}

export function sanitizeAIResponse(response: AIResponse): AIResponse {
  return {
    thought: response.thought.substring(0, 200), // Limitar pensamento
    action: {
      type: response.action.type,
      payload: response.action.type === 'reply' ? {
        message: response.action.payload.message?.substring(0, 500) // Limitar mensagem
      } : response.action.payload
    },
    confidence: Math.max(0, Math.min(1, response.confidence)),
    updatedContext: response.updatedContext
  };
}

export function createFallbackResponse(userMessage: string): AIResponse {
  return {
    thought: "Não consegui processar a mensagem adequadamente. Vou pedir esclarecimento.",
    action: {
      type: 'reply',
      payload: {
        message: "Desculpe, não entendi completamente sua solicitação. Pode me explicar de outra forma?"
      }
    },
    confidence: 0.3,
    updatedContext: {
      searchFilters: {},
      interestedProperties: [],
      pendingReservation: undefined,
      clientProfile: {
        phone: '',
        preferences: {},
        lastInteraction: new Date()
      }
    }
  };
}