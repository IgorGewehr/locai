// lib/config/sofia-config.ts
// Configuração centralizada do agente Sofia - Elimina valores hardcoded

export const SOFIA_CONFIG = {
  // Configurações de contexto e memória
  context: {
    TTL_HOURS: parseInt(process.env.SOFIA_CONTEXT_TTL_HOURS || '1'),
    MAX_MESSAGE_HISTORY: parseInt(process.env.SOFIA_MAX_MESSAGE_HISTORY || '10'),
    MAX_CACHED_CONVERSATIONS: parseInt(process.env.SOFIA_MAX_CACHED_CONVERSATIONS || '1000'),
    CLEANUP_INTERVAL_MS: parseInt(process.env.SOFIA_CLEANUP_INTERVAL_MS || '3600000'), // 1 hora
  },

  // Configurações de detecção de loops
  loopPrevention: {
    FUNCTION_EXECUTION_COOLDOWN_MS: parseInt(process.env.SOFIA_FUNCTION_COOLDOWN_MS || '2000'),
    MAX_RETRIES_PER_FUNCTION: parseInt(process.env.SOFIA_MAX_RETRIES || '2'),
    DUPLICATE_DETECTION_WINDOW_MS: parseInt(process.env.SOFIA_DUPLICATE_WINDOW_MS || '5000'),
  },

  // Configurações de datas padrão
  dates: {
    DEFAULT_CHECKIN_DAYS_AHEAD: parseInt(process.env.SOFIA_DEFAULT_CHECKIN_DAYS || '1'),
    DEFAULT_STAY_DURATION_DAYS: parseInt(process.env.SOFIA_DEFAULT_STAY_DAYS || '3'),
    MAX_FUTURE_BOOKING_MONTHS: parseInt(process.env.SOFIA_MAX_FUTURE_MONTHS || '12'),
    REQUIRE_DATE_CONFIRMATION: process.env.SOFIA_REQUIRE_DATE_CONFIRMATION === 'true',
  },

  // Configurações de busca e propriedades
  search: {
    DEFAULT_GUESTS: parseInt(process.env.SOFIA_DEFAULT_GUESTS || '2'),
    DEFAULT_LOCATION: process.env.SOFIA_DEFAULT_LOCATION || 'Brasil',
    MAX_PROPERTIES_PER_SEARCH: parseInt(process.env.SOFIA_MAX_PROPERTIES || '8'),
    USE_DEMO_PROPERTIES_FALLBACK: process.env.SOFIA_USE_DEMO_FALLBACK !== 'false',
  },

  // Configurações de GPT
  ai: {
    MODEL: process.env.SOFIA_AI_MODEL || 'gpt-4o-mini',
    MAX_TOKENS: parseInt(process.env.SOFIA_MAX_TOKENS || '1000'),
    TEMPERATURE: parseFloat(process.env.SOFIA_TEMPERATURE || '0.7'),
    FORCE_FUNCTION_THRESHOLD: parseFloat(process.env.SOFIA_FORCE_FUNCTION_THRESHOLD || '0.85'),
  },

  // Configurações de timeout
  timeouts: {
    FUNCTION_EXECUTION_MS: parseInt(process.env.SOFIA_FUNCTION_TIMEOUT_MS || '30000'),
    API_CALL_MS: parseInt(process.env.SOFIA_API_TIMEOUT_MS || '15000'),
    CONTEXT_LOAD_MS: parseInt(process.env.SOFIA_CONTEXT_TIMEOUT_MS || '5000'),
  },

  // Configurações de logging
  logging: {
    LEVEL: process.env.SOFIA_LOG_LEVEL || 'info',
    MASK_SENSITIVE_DATA: process.env.SOFIA_MASK_SENSITIVE !== 'false',
    LOG_FUNCTION_EXECUTIONS: process.env.SOFIA_LOG_FUNCTIONS === 'true',
  },

  // Configurações de validação
  validation: {
    MIN_PROPERTY_ID_LENGTH: parseInt(process.env.SOFIA_MIN_PROPERTY_ID_LENGTH || '15'),
    REQUIRE_CPF_FOR_BOOKING: process.env.SOFIA_REQUIRE_CPF !== 'false',
    VALIDATE_EMAIL_FORMAT: process.env.SOFIA_VALIDATE_EMAIL !== 'false',
    AUTO_CORRECT_DATES: process.env.SOFIA_AUTO_CORRECT_DATES !== 'false',
    CONFIRM_DATE_CORRECTIONS: process.env.SOFIA_CONFIRM_DATE_CORRECTIONS === 'true',
  },

  // Configurações de fallback
  fallback: {
    ENABLE_FALLBACK_SYSTEM: process.env.SOFIA_ENABLE_FALLBACK !== 'false',
    RETRY_ON_ERROR: process.env.SOFIA_RETRY_ON_ERROR !== 'false',
    MAX_FALLBACK_ATTEMPTS: parseInt(process.env.SOFIA_MAX_FALLBACK_ATTEMPTS || '3'),
  },
};

// Helper functions para datas
export const getDefaultCheckIn = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + SOFIA_CONFIG.dates.DEFAULT_CHECKIN_DAYS_AHEAD);
  return date.toISOString().split('T')[0];
};

export const getDefaultCheckOut = (): string => {
  const date = new Date();
  date.setDate(
    date.getDate() + 
    SOFIA_CONFIG.dates.DEFAULT_CHECKIN_DAYS_AHEAD + 
    SOFIA_CONFIG.dates.DEFAULT_STAY_DURATION_DAYS
  );
  return date.toISOString().split('T')[0];
};

// Validador de configuração
export const validateConfig = (): boolean => {
  const errors: string[] = [];

  // Validar ranges
  if (SOFIA_CONFIG.context.TTL_HOURS < 0.5 || SOFIA_CONFIG.context.TTL_HOURS > 24) {
    errors.push('TTL_HOURS deve estar entre 0.5 e 24');
  }

  if (SOFIA_CONFIG.ai.TEMPERATURE < 0 || SOFIA_CONFIG.ai.TEMPERATURE > 2) {
    errors.push('TEMPERATURE deve estar entre 0 e 2');
  }

  if (SOFIA_CONFIG.search.MAX_PROPERTIES_PER_SEARCH < 1 || SOFIA_CONFIG.search.MAX_PROPERTIES_PER_SEARCH > 50) {
    errors.push('MAX_PROPERTIES_PER_SEARCH deve estar entre 1 e 50');
  }

  if (errors.length > 0) {
    console.error('❌ [SofiaConfig] Erros de configuração:', errors);
    return false;
  }

  return true;
};