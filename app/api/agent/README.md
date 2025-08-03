# API Agent Routes - Documentação Completa

## 📁 Estrutura de Rotas de IA

Este diretório contém as rotas principais relacionadas ao agente de IA Sofia V3 Consolidada.

## 🎯 Rotas Ativas do Sistema

### 1. `/api/agent` (POST) - ROTA PRINCIPAL
**Arquivo**: `route.ts`  
**Descrição**: Endpoint principal para processamento de mensagens com Sofia V3  
**Versão Sofia**: `sofia-agent.ts` (V3 Consolidada)

#### Features
- 🔒 **Segurança**: Validação completa, sanitização XSS
- 🚦 **Rate Limiting**: 20 req/min por telefone (Redis ou in-memory)
- 📊 **Monitoramento**: Logs estruturados, métricas detalhadas
- 🤖 **AI Processing**: GPT-4o Mini com function calling
- ⏱️ **Timeout Protection**: 30 segundos máximo
- 🏢 **Multi-tenant**: Isolamento completo por tenant

#### Request Body
```json
{
  "message": "string (required, max 1000 chars)",
  "clientPhone": "string (required, formato BR)",
  "phone": "string (alternativa para clientPhone)",
  "tenantId": "string (optional, usa default se não fornecido)",
  "isTest": "boolean (optional)",
  "metadata": {
    "source": "whatsapp | web | api",
    "priority": "low | normal | high"
  }
}
```

#### Response Success
```json
{
  "success": true,
  "reply": "Resposta da Sofia",
  "summary": {
    "sentiment": "positive | neutral | negative",
    "keyTopics": ["busca", "apartamento"],
    "nextSteps": ["mostrar opções", "coletar requisitos"],
    "urgencyLevel": "low | medium | high",
    "intentDetected": "search_properties",
    "confidence": 0.95
  },
  "metadata": {
    "processingTime": "450ms",
    "tokensUsed": 150,
    "functionsExecuted": ["search_properties"],
    "stage": "search",
    "confidence": 0.95,
    "reasoningUsed": false
  }
}
```

#### Rate Limit Headers
- `X-RateLimit-Limit`: 20
- `X-RateLimit-Remaining`: 15
- `X-RateLimit-Reset`: ISO 8601 timestamp

---

### 2. `/api/agent/clear-context` (POST)
**Arquivo**: `clear-context/route.ts`  
**Descrição**: Limpa o contexto de conversa de um cliente  
**Uso Principal**: Dashboard de testes AI (`/dashboard/ai-testing`)

#### Request Body
```json
{
  "clientPhone": "string (required)",
  "tenantId": "string (optional, usa default)"
}
```

#### Response
```json
{
  "success": true,
  "message": "Contexto limpo com sucesso"
}
```

---

### 3. `/api/agent/metrics` (GET/POST)
**Arquivo**: `metrics/route.ts`  
**Descrição**: Métricas e monitoramento do agente  
**Uso Principal**: Dashboard de métricas (`/dashboard/metrics`)

#### GET Response
```json
{
  "success": true,
  "data": {
    "totalRequests": 1523,
    "totalCost": 2.34,
    "averageCostPerRequest": 0.0015,
    "cacheHitRate": 0.75,
    "errorRate": 0.02,
    "tokensUsed": 45678,
    "functionsExecuted": {
      "search_properties": 523,
      "calculate_price": 234,
      "create_reservation": 45
    },
    "status": "healthy",
    "timestamp": "2025-08-03T10:30:00Z",
    "projectedMonthlyCost": 70.20,
    "efficiency": {
      "cacheEfficiency": "good",
      "costEfficiency": "excellent",
      "errorRate": "good"
    }
  }
}
```

#### POST - Reset Metrics
Reseta as métricas diárias (geralmente executado via cron)

---

### 4. `/api/ai/analyze-leads` (POST)
**Localização**: `app/api/ai/analyze-leads/route.ts`  
**Descrição**: Análise avançada de leads com OpenAI (não usa Sofia)  
**Uso Principal**: CRM AIInsights (`/dashboard/crm/components/AIInsights`)

#### Request Body
```json
{
  "leads": [
    {
      "id": "lead_123",
      "name": "João Silva",
      "status": "qualified",
      "temperature": "hot",
      "score": 85,
      "totalInteractions": 12
    }
  ]
}
```

#### Response
```json
{
  "success": true,
  "insights": [
    {
      "leadId": "lead_123",
      "conversionProbability": 78,
      "nextBestAction": "schedule_viewing",
      "actionReason": "Cliente altamente engajado e qualificado",
      "riskFactors": ["preço pode ser barreira"],
      "opportunities": ["interesse em localização premium"],
      "estimatedValue": 150000,
      "daysToConversion": 15
    }
  ]
}
```

---

## 🔧 Funções Disponíveis no Agente

### Funções Core (4)
1. **search_properties** - Busca imóveis com filtros
2. **calculate_price** - Calcula preço para período
3. **create_reservation** - Cria reserva
4. **register_client** - Registra novo cliente

### Detalhes em
- Definições: `lib/ai/agent-functions.ts`
- Implementação: `lib/ai-agent/sofia-agent.ts`

---

## 🚀 Exemplos de Uso

### Chamada via Frontend
```typescript
// Dashboard ou componente React
const response = await fetch('/api/agent', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: "Quero um apartamento em Florianópolis",
    clientPhone: "11999999999",
    tenantId: "tenant_123",
    metadata: {
      source: 'web',
      priority: 'normal'
    }
  })
});

const data = await response.json();
if (data.success) {
  console.log(data.reply); // Mostra resposta da Sofia
}
```

### Chamada via cURL
```bash
curl -X POST http://localhost:3000/api/agent \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Olá, preciso de ajuda",
    "clientPhone": "11999999999",
    "tenantId": "default-tenant"
  }'
```

### Limpeza de Contexto
```javascript
await fetch('/api/agent/clear-context', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    clientPhone: "11999999999"
  })
});
```

---

## 🔍 Validações e Segurança

### Validações Aplicadas
| Campo | Validação | Limite |
|-------|-----------|--------|
| message | Required, string | Max 1000 chars |
| clientPhone | Formato BR válido | +5511999999999 |
| tenantId | Formato UUID válido | - |
| source | Enum válido | whatsapp/web/api |

### Segurança
- ✅ Sanitização contra XSS
- ✅ Validação de entrada
- ✅ Rate limiting por IP e telefone
- ✅ Timeout de 30s para prevenir hanging
- ✅ Logs sem dados sensíveis

---

## 📊 Monitoramento e Debug

### Logs Estruturados
```typescript
logger.info('Sofia processing', {
  requestId: 'req_123',
  clientPhone: '119****9999', // Mascarado
  tenantId: 'tenant_123',
  processingTime: 450
});
```

### Locais de Log
- Request inicial: INFO
- Validação falha: WARN
- Erro de processamento: ERROR
- Rate limit: WARN

### Debug Mode
Adicione `isTest: true` no request para logs detalhados

---

## 🛠️ Manutenção

### Arquivos Principais
```
lib/
├── ai-agent/
│   ├── sofia-agent.ts         # Core V3 consolidado
│   ├── sofia-prompt.ts        # Prompts otimizados
│   ├── intent-detector.ts     # Detecção de intenção
│   └── conversation-state.ts  # Gerenciamento de estado
├── ai/
│   └── agent-functions.ts     # Funções disponíveis
├── services/
│   ├── conversation-context-service.ts
│   └── rate-limit-service.ts
└── monitoring/
    └── agent-monitor.ts        # Métricas
```

---

## ⚠️ Rotas Removidas (Limpeza Ago/2025)

### ❌ `/api/agent-professional` 
- **Status**: REMOVIDA
- **Motivo**: Duplicação com `/api/agent`
- **Migração**: Use `/api/agent` com os mesmos parâmetros
- **Data**: Agosto 2025

---

## 📈 Métricas de Performance

### Benchmarks Atuais
- **Tempo médio de resposta**: < 2s
- **Taxa de sucesso**: 98%
- **Custo médio por mensagem**: $0.0015
- **Cache hit rate**: 75%
- **Funções mais usadas**: 
  1. search_properties (45%)
  2. calculate_price (30%)
  3. register_client (20%)
  4. create_reservation (5%)

---

## 🔄 Changelog

### Agosto 2025 - v3.0
- ✅ Consolidação para Sofia V3
- ✅ Remoção de `agent-professional` (duplicada)
- ✅ Documentação completa atualizada
- ✅ Limpeza de código legacy
- ✅ Unificação de prompts e estados

### Julho 2025 - v2.0
- Sistema de sumário inteligente
- Melhorias na detecção de intenção
- Rate limiting implementado

---

## 📞 Suporte

Para problemas ou dúvidas:
1. Verifique os logs em `lib/utils/logger.ts`
2. Teste no dashboard: `/dashboard/ai-testing`
3. Consulte: `docs/AI_AGENT_ARCHITECTURE.md`

---

*Última atualização: Agosto 2025 - Sofia V3 Consolidada*