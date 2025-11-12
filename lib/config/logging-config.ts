// lib/config/logging-config.ts
// Configuração centralizada de logging para controlar o que é registrado em produção

export interface LoggingConfig {
  production: {
    // Nível mínimo de log para produção (WARN = apenas avisos e erros)
    minLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
    
    // Habilitar logs no Firestore
    enableFirestore: boolean;
    
    // Componentes que devem ter logs habilitados mesmo em produção
    enabledComponents: string[];
    
    // Padrões de mensagem que devem ser ignorados
    ignoredPatterns: string[];
    
    // Limite de tamanho de mensagem (caracteres)
    maxMessageLength: number;
    
    // Limite de logs por minuto por tenant
    rateLimitPerMinute: number;
  };
  
  development: {
    minLevel: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'CRITICAL';
    enableConsole: boolean;
    enableFirestore: boolean;
  };
}

export const LOGGING_CONFIG: LoggingConfig = {
  production: {
    // OTIMIZAÇÃO: Apenas WARN e ERROR em produção
    minLevel: 'WARN',
    
    // OTIMIZAÇÃO: Desabilitar Firestore por padrão
    // Pode ser habilitado via env var ENABLE_FIREBASE_LOGS=true
    enableFirestore: false,
    
    // Componentes críticos que sempre devem logar
    enabledComponents: [
      'Auth',           // Problemas de autenticação
      'Payment',        // Transações financeiras
      'Reservation',    // Criação/cancelamento de reservas
      'Error',          // Todos os erros
      'Security'        // Eventos de segurança
    ],
    
    // Mensagens que são muito frequentes e podem ser ignoradas
    ignoredPatterns: [
      'Analytics tracking',
      'Contexto carregado',
      'Summary atualizado',
      'Processamento completo',
      'Mensagem processada',
      'Mensagem adicionada ao batch',
      'API Request: GET',
      'API Request: POST /api/agent',
      'WhatsApp incoming message',
      'WhatsApp outgoing message',
      'Property search completed',
      'AI interaction completed',
      'Sofia] Usando',
      'Sofia] Carregando',
      'Sofia] Analytics',
      'Sofia Enhanced] Processamento concluído',
      'Operation completed',
      'Criando instância',
      // WhatsApp session logs (muito frequentes)
      '[MicroserviceClient] Consultando status',
      '[MicroserviceClient] Status da sessão obtido',
      '[MicroserviceClient] Response received',
      '[MicroserviceClient] Raw response',
      '[FirebaseAuth] Token válido',
      '[Session API] POST request received',
      '[Session API] Starting auth',
      '[Session API] Auth successful',
      '[Session API] Processing for tenant',
      '[Session] Checking for QR code',
      'Session initialization completed',
    ],
    
    // Limitar tamanho das mensagens para economizar espaço
    maxMessageLength: 500,
    
    // Rate limiting para evitar spam de logs
    rateLimitPerMinute: 100
  },
  
  development: {
    minLevel: 'DEBUG',
    enableConsole: true,
    enableFirestore: false  // Não gravar no Firestore em dev
  }
};

// Helper para verificar se deve logar baseado no componente
export function shouldLogComponent(component?: string): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  if (!component) return false;
  return LOGGING_CONFIG.production.enabledComponents.includes(component);
}

// Helper para verificar se mensagem deve ser ignorada
export function shouldIgnoreMessage(message: string): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  return LOGGING_CONFIG.production.ignoredPatterns.some(
    pattern => message.includes(pattern)
  );
}

// Rate limiter simples
const rateLimitMap = new Map<string, number[]>();

export function isRateLimited(tenantId: string): boolean {
  if (process.env.NODE_ENV !== 'production') return false;
  
  const now = Date.now();
  const minute = 60 * 1000;
  const limit = LOGGING_CONFIG.production.rateLimitPerMinute;
  
  // Limpar timestamps antigos
  const tenantLogs = rateLimitMap.get(tenantId) || [];
  const recentLogs = tenantLogs.filter(timestamp => now - timestamp < minute);
  
  // Verificar se excedeu o limite
  if (recentLogs.length >= limit) {
    return true;
  }
  
  // Adicionar novo timestamp
  recentLogs.push(now);
  rateLimitMap.set(tenantId, recentLogs);
  
  return false;
}

// Limpar rate limit map periodicamente
setInterval(() => {
  const now = Date.now();
  const minute = 60 * 1000;
  
  for (const [tenantId, timestamps] of rateLimitMap.entries()) {
    const recentLogs = timestamps.filter(t => now - t < minute);
    if (recentLogs.length === 0) {
      rateLimitMap.delete(tenantId);
    } else {
      rateLimitMap.set(tenantId, recentLogs);
    }
  }
}, 60 * 1000); // Limpar a cada minuto

export default LOGGING_CONFIG;