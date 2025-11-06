# 🚀 GUIA DE IMPLEMENTAÇÃO: MELHORIAS CRÍTICAS 2, 3 e 4

Este guia detalha **como implementar** as 3 melhorias críticas identificadas no seu projeto Locai + N8N.

---

## 📋 **VISÃO GERAL**

### **O QUE VAMOS IMPLEMENTAR:**

1. **Retry Logic (Resiliência)** - Sistema de circuit breaker e retry automático
2. **Cache System (Performance)** - Cache multi-layer para propriedades
3. **Rate Limiting (Custos)** - Controle de taxa de requisições

### **IMPACTO ESPERADO:**

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Tempo médio de resposta | 800-1500ms | 200-400ms | **3-4x mais rápido** |
| Custo Firebase/mês | $30 | $6 | **$24 economizados** |
| Taxa de erro | ~5% | <1% | **5x mais confiável** |
| Resiliência a falhas | Baixa | Alta | **Auto-recovery** |

---

## 🔄 **PARTE 1: RETRY LOGIC (RESILIÊNCIA)**

### **Arquivos criados:**
- ✅ `lib/utils/circuit-breaker.ts` - Sistema de circuit breaker
- ✅ `lib/utils/fallback-messages.ts` - Mensagens amigáveis para erros
- ✅ `app/api/ai/functions/*/route-with-circuit-breaker.example.ts` - Exemplo de uso

### **PASSO 1: Adicionar Retry Logic no N8N**

Em **TODOS os HTTP Request nodes** do N8N, adicionar estas configurações:

```javascript
// No node de HTTP Request, adicionar em "Options":
{
  "timeout": 45000,  // 45 segundos
  "retry": {
    "maxAttempts": 3,
    "waitBetween": 1000,
    "backoffMultiplier": 2
  },
  "retryOnHttpCodes": [408, 429, 500, 502, 503, 504]
}
```

**Nodes que DEVEM ter retry:**
- ✅ search-properties
- ✅ calculate-price
- ✅ create-reservation
- ✅ send-property-media
- ✅ create-lead
- ✅ final_send (envio WhatsApp)

### **PASSO 2: Implementar Circuit Breaker nas API Functions**

**Exemplo de migração:**

```typescript
// ❌ ANTES (sem proteção):
export async function POST(request: NextRequest) {
  const body = await request.json();
  const result = await searchProperties(args, tenantId);
  return NextResponse.json({ data: result });
}

// ✅ DEPOIS (com circuit breaker):
import { circuitBreakers } from '@/lib/utils/circuit-breaker';
import { getFallbackMessage } from '@/lib/utils/fallback-messages';

export async function POST(request: NextRequest) {
  const body = await request.json();

  const result = await circuitBreakers.firebase.execute(
    // Operação principal
    async () => await searchProperties(args, tenantId),

    // Fallback se circuit abrir
    () => ({
      properties: [],
      message: getFallbackMessage('searchProperties', 'unavailable'),
      fallbackUsed: true
    })
  );

  return NextResponse.json({
    data: result,
    status: result.fallbackUsed ? 503 : 200
  });
}
```

### **PASSO 3: Adicionar Fallback Handler no N8N**

Depois de cada HTTP Request crítico, adicionar um **Error Trigger**:

```
[HTTP Request: search-properties]
   │
   ├─[Success] ──► [Continue workflow]
   │
   └─[Error Trigger] ──► [Code Node: Fallback Handler]
                               │
                               └─[Send Error Message to Client]
```

**Código do Fallback Handler:**

```javascript
// Code node: fallback_handler
const error = $input.first().error;
const codeData = $('Code').first().json;

const fallbackMessages = {
  'search-properties': 'Desculpe, estou com dificuldades para buscar imóveis. Tente novamente em alguns instantes!',
  'create-reservation': 'Percebi uma instabilidade ao criar sua reserva. Vamos tentar novamente?',
  'send-media': 'Estou tendo problemas para enviar as fotos. Posso te passar o link direto!',
  'default': 'Desculpe, tive uma dificuldade técnica. Pode repetir em alguns instantes?'
};

const functionName = $node.name;
const message = fallbackMessages[functionName] || fallbackMessages.default;

return {
  json: {
    tenantId: codeData.tenantId,
    to: codeData.clientPhone,
    message: message,
    type: 'text',
    isFallback: true
  }
};
```

---

## 🚀 **PARTE 2: CACHE SYSTEM (PERFORMANCE)**

### **Arquivos criados:**
- ✅ `lib/cache/property-cache-advanced.ts` - Sistema de cache
- ✅ `lib/ai/tenant-aware-agent-functions-cached.example.ts` - Funções com cache
- ✅ `app/api/ai/functions/search-properties-cached/route.example.ts` - API com cache

### **PASSO 1: Instalar dependências (se necessário)**

```bash
# O cache usa Map nativo do JavaScript, não precisa instalar nada!
# Mas se quiser usar Redis no futuro:
# npm install ioredis
```

### **PASSO 2: Migrar função searchProperties para versão cached**

**Arquivo:** `lib/ai/tenant-aware-agent-functions.ts`

```typescript
// ❌ ANTES (sem cache):
export async function searchProperties(args, tenantId) {
  const services = new TenantServiceFactory(tenantId);
  const allProperties = await services.properties.getAll(1000); // 1000 reads!

  // Filtrar...
  return filtered;
}

// ✅ DEPOIS (com cache):
import { propertyCacheService } from '@/lib/cache/property-cache-advanced';

export async function searchProperties(args, tenantId) {
  // Buscar com cache (TTL: 5 minutos)
  const allProperties = await propertyCacheService.getCachedProperties(
    tenantId,
    { isActive: true, type: args.propertyType },
    300000 // 5 minutos
  );

  // Filtrar localmente...
  return filtered;
}
```

### **PASSO 3: Invalidar cache quando propriedades mudam**

**Em todas as operações de CREATE/UPDATE/DELETE de propriedades:**

```typescript
// app/api/properties/route.ts (POST/PUT/DELETE)
import { propertyCacheService } from '@/lib/cache/property-cache-advanced';

export async function POST(request: NextRequest) {
  // ... criar propriedade
  const newProperty = await services.properties.create(data);

  // ✅ INVALIDAR CACHE
  propertyCacheService.invalidateTenant(tenantId);

  return NextResponse.json({ success: true, data: newProperty });
}

export async function PUT(request: NextRequest) {
  // ... atualizar propriedade
  await services.properties.update(propertyId, updates);

  // ✅ INVALIDAR CACHE ESPECÍFICO
  propertyCacheService.invalidateProperty(tenantId, propertyId);

  return NextResponse.json({ success: true });
}
```

### **PASSO 4: Adicionar endpoint de monitoramento do cache**

**Criar:** `app/api/admin/cache/stats/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { propertyCacheService } from '@/lib/cache/property-cache-advanced';

export async function GET(request: NextRequest) {
  const stats = propertyCacheService.getStats();

  return NextResponse.json({
    success: true,
    data: stats,
    timestamp: new Date().toISOString()
  });
}

// POST /api/admin/cache/stats - Limpar cache
export async function POST(request: NextRequest) {
  const { action, tenantId } = await request.json();

  if (action === 'clear_all') {
    propertyCacheService.clearAll();
  } else if (action === 'clear_tenant' && tenantId) {
    propertyCacheService.invalidateTenant(tenantId);
  }

  return NextResponse.json({ success: true });
}
```

**Acessar:** `GET https://alugazap.com/api/admin/cache/stats`

---

## 🛡️ **PARTE 3: RATE LIMITING (CONTROLE DE CUSTOS)**

### **Arquivos existentes:**
- ✅ `lib/utils/rate-limiter.ts` - Já existe! (muito bom)

### **Arquivos criados:**
- ✅ `lib/middleware/rate-limit-middleware.ts` - Middleware para aplicar rate limit

### **PASSO 1: Aplicar Rate Limit nas AI Functions**

**Método 1: Middleware Simples (Recomendado para começar)**

```typescript
// app/api/ai/functions/search-properties/route.ts
import { applyRateLimit, searchRateLimitConfig } from '@/lib/middleware/rate-limit-middleware';

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // ✅ APLICAR RATE LIMIT
  const rateLimitResult = await applyRateLimit(request, searchRateLimitConfig);
  if (rateLimitResult) {
    return rateLimitResult; // 429 Too Many Requests
  }

  // ... resto da função
}
```

**Método 2: Rate Limit por Tenant + Cliente (Mais granular)**

```typescript
import { getRateLimiter } from '@/lib/utils/rate-limiter';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { tenantId, clientPhone } = body;

  // Rate limit por tenant
  const tenantLimiter = getRateLimiter('tenant');
  const tenantResult = tenantLimiter.isAllowed(tenantId, {
    windowMs: 60000,
    maxRequests: 20 // 20/min por tenant
  });

  if (!tenantResult.allowed) {
    return NextResponse.json(
      { error: 'Tenant rate limit exceeded', retryAfter: tenantResult.retryAfter },
      { status: 429 }
    );
  }

  // Rate limit por cliente
  const clientLimiter = getRateLimiter('client');
  const clientResult = clientLimiter.isAllowed(clientPhone, {
    windowMs: 60000,
    maxRequests: 10 // 10/min por cliente
  });

  if (!clientResult.allowed) {
    return NextResponse.json(
      {
        error: 'Too many messages',
        message: 'Você está enviando mensagens muito rápido. Aguarde alguns segundos.',
        retryAfter: clientResult.retryAfter
      },
      { status: 429 }
    );
  }

  // ... continuar
}
```

### **PASSO 2: Configurar Rate Limits no N8N**

No **Webhook node** inicial, adicionar validação:

```javascript
// Code node ANTES do Router Agent:
// check_rate_limit_n8n

const clientPhone = $json.clientPhone;
const tenantId = $json.tenantId;

// Armazenar contador no workflow static data
const rateLimitStore = $getWorkflowStaticData('global');
if (!rateLimitStore.requests) {
  rateLimitStore.requests = {};
}

const key = `${tenantId}_${clientPhone}`;
const now = Date.now();
const windowMs = 60000; // 1 minuto
const maxRequests = 10;

// Limpar entradas antigas
for (const [k, v] of Object.entries(rateLimitStore.requests)) {
  if (now - v.timestamp > windowMs) {
    delete rateLimitStore.requests[k];
  }
}

// Verificar rate limit
const entry = rateLimitStore.requests[key] || { count: 0, timestamp: now };

if (entry.count >= maxRequests) {
  console.log('❌ Rate limit exceeded:', key);

  // Retornar mensagem para cliente
  return {
    json: {
      ...json,
      skip_ai: true,
      rate_limited: true,
      auto_response: "Você está enviando mensagens muito rápido. Por favor, aguarde um momento."
    }
  };
}

// Incrementar contador
entry.count++;
rateLimitStore.requests[key] = entry;

console.log('✅ Rate limit OK:', key, entry.count, '/', maxRequests);
return { json: $json };
```

### **PASSO 3: Monitorar Rate Limits**

**Criar endpoint:** `app/api/admin/rate-limit/stats/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getRateLimiter } from '@/lib/utils/rate-limiter';

export async function GET() {
  const tenantLimiter = getRateLimiter('tenant');
  const clientLimiter = getRateLimiter('client');

  return NextResponse.json({
    tenants: tenantLimiter.getStats(),
    clients: clientLimiter.getStats()
  });
}
```

---

## 📊 **PARTE 4: IMPLEMENTAÇÃO COMPLETA (ALL-IN-ONE)**

### **Template de API Function Otimizada**

Use este template para **TODAS as suas AI functions**:

```typescript
// app/api/ai/functions/[function-name]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { circuitBreakers } from '@/lib/utils/circuit-breaker';
import { applyRateLimit } from '@/lib/middleware/rate-limit-middleware';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const requestId = `fn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  try {
    const body = await request.json();
    const { tenantId, ...args } = body;

    // 1️⃣ Validação
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'TenantId required' },
        { status: 400 }
      );
    }

    // 2️⃣ Rate Limiting
    const rateLimit = await applyRateLimit(request, {
      windowMs: 60000,
      maxRequests: 15
    });
    if (rateLimit) return rateLimit;

    // 3️⃣ Logging
    logger.info('[FUNCTION] Starting', { requestId, tenantId, args });

    // 4️⃣ Circuit Breaker
    const result = await circuitBreakers.firebase.execute(
      async () => await yourFunction(args, tenantId),
      () => ({ fallbackUsed: true })
    );

    // 5️⃣ Response
    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        requestId,
        processingTime: Date.now() - startTime
      }
    });

  } catch (error) {
    logger.error('[FUNCTION] Failed', { requestId, error });
    return NextResponse.json(
      { success: false, error: 'Failed' },
      { status: 500 }
    );
  }
}
```

---

## ✅ **CHECKLIST DE IMPLEMENTAÇÃO**

### **FASE 1: Resiliência (Semana 1)**
- [ ] Adicionar retry logic em HTTP Requests do N8N
- [ ] Implementar circuit breaker em search-properties
- [ ] Implementar circuit breaker em create-reservation
- [ ] Implementar circuit breaker em send-property-media
- [ ] Adicionar fallback handlers no N8N
- [ ] Testar cenário de Firebase offline

### **FASE 2: Performance (Semana 2)**
- [ ] Implementar cache de propriedades
- [ ] Migrar searchProperties para versão cached
- [ ] Adicionar invalidação de cache em CRUDs
- [ ] Criar endpoint de monitoramento do cache
- [ ] Testar performance (benchmark)
- [ ] Verificar hit rate do cache (meta: >70%)

### **FASE 3: Custos (Semana 3)**
- [ ] Aplicar rate limiting em search-properties
- [ ] Aplicar rate limiting em create-reservation
- [ ] Aplicar rate limiting em calculate-price
- [ ] Adicionar rate limit no webhook do N8N
- [ ] Criar endpoint de monitoramento de rate limits
- [ ] Testar cenário de abuso (stress test)

### **FASE 4: Monitoramento (Semana 4)**
- [ ] Dashboard de métricas (cache hit rate, rate limits, circuit breaker)
- [ ] Alertas para circuit breaker OPEN
- [ ] Logs agregados por tenantId
- [ ] Métricas de custo (Firebase reads, OpenAI tokens)

---

## 📈 **COMO MEDIR O SUCESSO**

### **Antes da implementação:**

```bash
# Executar benchmark
curl -X POST https://alugazap.com/api/admin/benchmark/before \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"YOUR_TENANT_ID"}'
```

### **Depois da implementação:**

```bash
# Executar benchmark novamente
curl -X POST https://alugazap.com/api/admin/benchmark/after \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"YOUR_TENANT_ID"}'
```

### **Métricas para acompanhar:**

| Métrica | Como Medir | Meta |
|---------|------------|------|
| Tempo de resposta | `meta.processingTime` | <500ms (com cache) |
| Cache hit rate | `/api/admin/cache/stats` | >70% |
| Taxa de erro | Logs de ERROR | <1% |
| Custo Firebase | Firebase Console > Usage | -80% reads |
| Rate limit hits | `/api/admin/rate-limit/stats` | <5% bloqueados |

---

## 🚨 **TROUBLESHOOTING**

### **Problema 1: Cache não está funcionando**

```typescript
// Verificar stats do cache
const stats = propertyCacheService.getStats();
console.log('Cache stats:', stats);

// Hit rate = 0% ? Verificar se está invalidando demais
// Size = 0 ? Verificar se está salvando corretamente
```

### **Problema 2: Circuit breaker sempre OPEN**

```typescript
// Verificar estado
console.log(circuitBreakers.firebase.getState());

// Reset manual
circuitBreakers.firebase.reset();
```

### **Problema 3: Rate limit bloqueando muito**

```typescript
// Aumentar limites temporariamente
export const searchRateLimitConfig = {
  windowMs: 60000,
  maxRequests: 30 // Era 15, agora 30
};
```

---

## 🎯 **PRÓXIMOS PASSOS**

Depois de implementar essas 3 melhorias:

1. **Consolidar workflows do N8N** (eliminar duplicação)
2. **Migrar Code nodes para API endpoints** (testabilidade)
3. **Implementar processamento assíncrono** (UX)
4. **Adicionar tracing end-to-end** (observabilidade)

---

**Dúvidas? Me pergunte!** 🚀
