// lib/config/agent-config.ts

export const AgentConfig = {
  // Modelos por tipo de request - APENAS GPT-4o MINI
  models: {
    simple: 'gpt-4o-mini',        // Para greeting, price inquiry
    complex: 'gpt-4o-mini'        // MESMO MODELO PARA TUDO - MAIS BARATO E INTELIGENTE
  },
  
  // Limites de tokens
  tokenLimits: {
    simple: 100,
    complex: 300,
    maxDaily: 50000 // Limite diário total
  },
  
  // Cache settings
  cache: {
    greeting: 60,        // 1 hora TTL
    search: 30,          // 30 minutos TTL
    pricing: 15,         // 15 minutos TTL
    general: 10          // 10 minutos TTL
  },
  
  // Rate limiting
  rateLimiting: {
    messagesPerMinute: 20,
    messagesPerHour: 200,
    messagesPerDay: 1000
  }
};