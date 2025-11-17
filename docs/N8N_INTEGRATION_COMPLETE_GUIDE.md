# Guia Completo de Integração N8N + Sofia AI
## Comunicação Bilateral com Prompts Dinâmicos

**Data:** 17 de Novembro de 2025
**Versão:** 2.0.0
**Autor:** Sistema Locai + Sofia AI

---

## 📋 Sumário Executivo

Este documento descreve todas as mudanças necessárias no workflow N8N para implementar:

1. **Prompts Dinâmicos Personalizados** - Cada tenant tem instruções específicas por agente
2. **Comunicação Bilateral Completa** - Usuário pode pausar IA e conversar manualmente
3. **Configurações Completas** - Todas as settings (negotiation, AI, policies, company) acessíveis

---

## ⚡ **IMPORTANTE: Sistema de Bloqueio Já Está Pronto**

**O N8N JÁ VERIFICA bloqueios automaticamente!**

- ✅ Plataforma e N8N usam o **mesmo Redis**
- ✅ Plataforma salva bloqueios na chave: `ai_blocked:${tenantId}:${phone}`
- ✅ N8N **já verifica** essa chave antes de processar mensagens
- ✅ **NENHUMA mudança necessária no N8N para bloqueios**

**Você só precisa implementar os PROMPTS DINÂMICOS (seção abaixo).**

---

## 🎯 O Que Foi Implementado na Plataforma

### 1. Nova API Function: `get-tenant-config`

**Endpoint:** `POST https://alugazap.com/api/ai/functions/get-tenant-config`

**Payload:**
```json
{
  "tenantId": "tenant123",
  "includeSettings": ["all"]  // ou ["negotiation", "ai", "policies", "company"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenantId": "tenant123",
    "fetchedAt": "2025-11-17T10:30:00.000Z",
    "aiConfig": {
      "enabled": true,
      "autoResponse": true,
      "agentBehavior": {
        "search": {
          "maxPropertiesPerSearch": 3,
          "autoSendPhotos": true,
          "autoSendMap": true
        },
        "booking": {
          "requireEmail": true,
          "requireDocument": false,
          "autoScheduleKeyPickup": true
        },
        "support": {
          "allowCancellations": true,
          "allowModifications": true,
          "autoTransferThreshold": 10
        }
      },
      "features": {
        "payments": true,
        "contracts": false,
        "analytics": true
      }
    },
    "negotiation": {
      "allowAINegotiation": true,
      "maxDiscountPercentage": 30,
      "pixDiscountEnabled": true,
      "pixDiscountPercentage": 10,
      "cashDiscountEnabled": true,
      "cashDiscountPercentage": 8,
      "installmentEnabled": true,
      "maxInstallments": 10,
      "minInstallmentValue": 100,
      "extendedStayDiscountEnabled": true,
      "extendedStayRules": [
        { "minDays": 7, "discountPercentage": 15 },
        { "minDays": 14, "discountPercentage": 20 }
      ],
      "bookNowDiscountEnabled": true,
      "bookNowDiscountPercentage": 5,
      "bookNowTimeLimit": 2,
      "allowSuggestAlternatives": true,
      "upsellEnabled": true,
      "upsellSuggestions": ["Café da manhã", "Transfer"],
      "priceJustifications": ["Localização privilegiada", "Vista para o mar"],
      "negotiationNotes": "Dezembro é alta temporada"
    },
    "policies": {
      "cancellationPolicy": "flexible",
      "checkInTime": "14:00",
      "checkOutTime": "12:00",
      "houseRules": ["Não fumar", "Silêncio após 22h"],
      "petPolicy": "allowed",
      "minimumStay": 2
    },
    "company": {
      "name": "Imobiliária Premium",
      "phone": "+5511999999999",
      "email": "contato@imobiliaria.com",
      "address": {
        "street": "Rua Principal, 123",
        "city": "São Paulo",
        "state": "SP"
      },
      "businessHours": {
        "monday": "09:00-18:00",
        "friday": "09:00-17:00"
      }
    }
  }
}
```

---

### 2. Nova API Function: `get-agent-prompts`

**Endpoint:** `POST https://alugazap.com/api/ai/functions/get-agent-prompts`

**Payload:**
```json
{
  "tenantId": "tenant123",
  "agentType": "sales"  // ou "router", "search", "booking", "support", "all"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenantId": "tenant123",
    "agentType": "sales",
    "prompts": {
      "sales": "# SALES AGENT - Negociação e Vendas\n\n## POLÍTICA DE DESCONTOS\nDesconto máximo total permitido: **30%**\n\n### Descontos por Método de Pagamento\n✅ PIX: 10% de desconto\n✅ Dinheiro: 8% de desconto\n\n### Parcelamento\n✅ Até 10x sem juros (parcela mínima: R$ 100)\n\n### Descontos por Estadia Prolongada\n- 7+ dias: 15% de desconto\n- 14+ dias: 20% de desconto\n\n**REGRA DE OURO**: NUNCA ultrapasse 30% de desconto total acumulado."
    },
    "configurations": {
      "aiEnabled": true,
      "negotiationEnabled": true,
      "autoResponse": true
    },
    "generatedAt": "2025-11-17T10:30:00.000Z"
  }
}
```

---

### 3. Sistema de Pause/Resume AI ✅ **JÁ FUNCIONA NO N8N**

**Como funciona:**

1. User pausa IA na plataforma (botão "Pausar IA por 1h/2h/4h/24h")
2. Plataforma salva no **mesmo Redis do N8N:**
   ```javascript
   // Chave: ai_blocked:${tenantId}:${phone}
   // Valor: { reason, blockedAt, expiresAt }
   // TTL: duração em segundos
   ```
3. N8N **já verifica automaticamente** essa chave antes de processar
4. Se bloqueado → N8N não responde
5. Após TTL expirar → N8N volta a responder automaticamente

**✅ Nenhuma mudança necessária no N8N para bloqueios!**

---

**Endpoint para consulta (opcional):** `GET https://alugazap.com/api/ai/block-conversation?tenantId=xxx&phone=xxx`

---

### 4. Envio Manual de Mensagens

**Endpoint:** `POST /api/whatsapp/send-manual`

Permite ao usuário da plataforma enviar mensagens diretamente quando a IA está pausada.

---

### 5. Webhook de Mensagens do Cliente

**Endpoint:** `POST /api/webhook/client-message`

Recebe mensagens do cliente em tempo real e publica via Redis pub/sub para a interface.

---

## 🔧 Mudanças Necessárias no N8N

### ⚠️ **BLOQUEIOS JÁ FUNCIONAM - NÃO PRECISA MUDAR NADA**

**O N8N já verifica bloqueios automaticamente no Redis.**

**Você só precisa implementar 2 mudanças:**
1. ✅ Fetch de configurações do tenant
2. ✅ Prompts dinâmicos nos agentes

---

### **MUDANÇA 1: Adicionar Node "Get Tenant Config" no Início do Workflow**

**Localização:** Logo após o node `message_extraction`

**Tipo:** HTTP Request Tool (ou HTTP Request Node)

**Configuração:**
```javascript
{
  "method": "POST",
  "url": "https://alugazap.com/api/ai/functions/get-tenant-config",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "tenantId": "{{ $('message_extraction').first().json.tenantId }}",
    "includeSettings": ["all"]
  }
}
```

**Nome do Node:** `fetch_tenant_config`

---

### **MUDANÇA 2: Atualizar Router Agent com Prompts Dinâmicos**

**Localização:** Node do AI Agent (Router)

**Tipo:** AI Agent

**Configuração:**

**Substituir o System Message ESTÁTICO por DINÂMICO:**

```javascript
// ANTES (Estático):
const systemMessage = "Você é Sofia, especialista...";

// DEPOIS (Dinâmico):
const tenantConfig = $('fetch_tenant_config').first().json;

// Buscar prompt dinâmico
const promptUrl = "https://alugazap.com/api/ai/functions/get-agent-prompts";
const promptPayload = {
  tenantId: tenantConfig.data.tenantId,
  agentType: "router"
};

const promptResponse = await fetch(promptUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(promptPayload)
});

const promptResult = await promptResponse.json();
const systemMessage = promptResult.data.prompts.router;

return systemMessage;
```

**Configuração Completa do Router Agent:**

**Options → System Message:**
```javascript
={{
  // Buscar tenant config
  const tenantConfig = $('fetch_tenant_config').first().json.data;

  // Buscar prompts dinâmicos
  const promptUrl = "https://alugazap.com/api/ai/functions/get-agent-prompts";
  const promptResponse = await fetch(promptUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId: tenantConfig.tenantId,
      agentType: "router"
    })
  });

  const promptResult = await promptResponse.json();
  return promptResult.data.prompts.router || 'Fallback prompt...';
}}
```

---

### **MUDANÇA 3: Criar Agentes Especializados com Prompts Dinâmicos**

Você precisa criar **4 novos AI Agents** (ou atualizar os existentes):

#### **A) SEARCH AGENT**

**Node Name:** `search_agent`

**System Message:**
```javascript
={{
  const tenantConfig = $('fetch_tenant_config').first().json.data;
  const promptResponse = await fetch("https://alugazap.com/api/ai/functions/get-agent-prompts", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId: tenantConfig.tenantId,
      agentType: "search"
    })
  });
  const promptResult = await promptResponse.json();
  return promptResult.data.prompts.search;
}}
```

**Tools Disponíveis:**
- `search-properties`
- `send-property-media` (SOMENTE se `autoSendPhotos: true`)
- `send-property-map` (SOMENTE se `autoSendMap: true`)

---

#### **B) BOOKING AGENT**

**Node Name:** `booking_agent`

**System Message:**
```javascript
={{
  const tenantConfig = $('fetch_tenant_config').first().json.data;
  const promptResponse = await fetch("https://alugazap.com/api/ai/functions/get-agent-prompts", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId: tenantConfig.tenantId,
      agentType: "booking"
    })
  });
  const promptResult = await promptResponse.json();
  return promptResult.data.prompts.booking;
}}
```

**Tools Disponíveis:**
- `check-availability`
- `create-reservation`
- `register-client`
- `schedule-meeting` (SOMENTE se `autoScheduleKeyPickup: true`)

---

#### **C) SALES AGENT**

**Node Name:** `sales_agent`

**System Message:**
```javascript
={{
  const tenantConfig = $('fetch_tenant_config').first().json.data;

  // VERIFICAR SE SALES ESTÁ HABILITADO
  if (!tenantConfig.negotiation.allowAINegotiation) {
    return "# SALES AGENT DESABILITADO\n\n⚠️ Você NÃO pode negociar preços. Apresente valores fixos apenas.";
  }

  const promptResponse = await fetch("https://alugazap.com/api/ai/functions/get-agent-prompts", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId: tenantConfig.tenantId,
      agentType: "sales"
    })
  });
  const promptResult = await promptResponse.json();
  return promptResult.data.prompts.sales;
}}
```

**Tools Disponíveis:**
- `calculate-price`
- `calculate-dynamic-discount`
- `check-discount-opportunities`
- `get-negotiation-settings`

---

#### **D) SUPPORT AGENT**

**Node Name:** `support_agent`

**System Message:**
```javascript
={{
  const tenantConfig = $('fetch_tenant_config').first().json.data;
  const promptResponse = await fetch("https://alugazap.com/api/ai/functions/get-agent-prompts", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId: tenantConfig.tenantId,
      agentType: "support"
    })
  });
  const promptResult = await promptResponse.json();
  return promptResult.data.prompts.support;
}}
```

**Tools Disponíveis:**
- `get-policies`
- `get-company-address`
- `cancel-reservation` (SOMENTE se `allowCancellations: true`)
- `modify-reservation` (SOMENTE se `allowModifications: true`)

---

### **MUDANÇA 4: Atualizar Function Tools Existentes**

#### **Tool: `get-negotiation-settings`**

**ANTES:**
```json
{
  "tenantId": "{{ $('Code').first().json.tenantId }}"
}
```

**DEPOIS:** *(Sem mudanças - já está correto)*

---

#### **Adicionar Novos Tools:**

**Tool Name:** `get-tenant-config`
**URL:** `https://alugazap.com/api/ai/functions/get-tenant-config`
**Description:** Busca configurações completas do tenant
**Body:**
```json
{
  "tenantId": "{{ $('Code').first().json.tenantId }}",
  "includeSettings": ["all"]
}
```

---

### **MUDANÇA 5: Adicionar Cache de Config (Opcional mas Recomendado)**

**Localização:** Após `fetch_tenant_config`

**Tipo:** Code Node

**Código:**
```javascript
// ==========================================
// CACHE TENANT CONFIG (Redis)
// ==========================================

const tenantConfig = $('fetch_tenant_config').first().json.data;
const tenantId = tenantConfig.tenantId;

// Armazenar no Workflow Static Data (cache em memória)
const staticData = $getWorkflowStaticData('global');
const cacheKey = `tenant_config_${tenantId}`;

staticData[cacheKey] = {
  config: tenantConfig,
  cachedAt: Date.now(),
  ttl: 5 * 60 * 1000 // 5 minutos
};

console.log('✅ Config cacheada para', tenantId);

return { json: tenantConfig };
```

**Nome do Node:** `cache_config`

---

## 🔄 Fluxo Completo Atualizado

```
┌─────────────────────────────────────────────────────────────┐
│  1. Webhook recebe mensagem                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  2. message_extraction                                      │
│     - Extrai tenantId, phone, message                       │
│     - Remove duplicatas                                     │
│     - Ignora grupos                                         │
│     - ✅ JÁ VERIFICA REDIS: ai_blocked:${tid}:${phone}      │
│     - Se blocked: RETURN NULL                               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  3. fetch_tenant_config ⭐ NOVO                              │
│     - Busca TODAS as configurações                          │
│     - AI config, negotiation, policies, company             │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Code (preparar input para router)                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  5. ROUTER AGENT (com prompt dinâmico) ⭐ ATUALIZADO         │
│     - Analisa intenção                                      │
│     - Decide qual agente usar                               │
│     - Considera agentes desabilitados                       │
└────────────────┬────────────────────────────────────────────┘
                 │
       ┌─────────┴─────────┬───────────┬───────────┐
       │                   │           │           │
       ▼                   ▼           ▼           ▼
┌─────────────┐  ┌─────────────┐  ┌──────────┐  ┌────────────┐
│ SEARCH      │  │ BOOKING     │  │ SALES    │  │ SUPPORT    │
│ AGENT ⭐     │  │ AGENT ⭐     │  │ AGENT ⭐  │  │ AGENT ⭐    │
│ (dinâmico)  │  │ (dinâmico)  │  │(dinâmico)│  │ (dinâmico) │
└─────────────┘  └─────────────┘  └──────────┘  └────────────┘
       │                   │           │           │
       └─────────┬─────────┴───────────┴───────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  6. split_property (dividir mensagens)                      │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  7. format_response_json                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│  8. final_send (enviar via WhatsApp microservice)           │
└─────────────────────────────────────────────────────────────┘
```

**Diferença do Fluxo Anterior:**
- ❌ **REMOVIDO:** Node `check_ai_block` (já está no N8N nativo)
- ✅ **SIMPLIFICADO:** Apenas 2 mudanças necessárias (config + prompts)

---

## 📊 Exemplos de Configuração

### Exemplo 1: Tenant SEM Sales Agent

**Configuração no Dashboard:**
- `Settings → AI Config → Features → Sales Agent: OFF`
- `Settings → Negotiation → Allow AI Negotiation: false`

**Comportamento no N8N:**
- Router Agent NÃO oferece `sales_agent` como opção
- Prompt do router diz: "⚠️ O sales_agent está DESABILITADO. NÃO ofereça negociações."
- Cliente pergunta sobre desconto → Sofia responde: "Os preços são fixos, sem negociação"

---

### Exemplo 2: Tenant SEM Agendamento Automático de Chaves

**Configuração no Dashboard:**
- `Settings → AI Config → Booking → Auto Schedule Key Pickup: OFF`

**Comportamento no N8N:**
- Booking Agent NÃO tem acesso a `schedule-meeting`
- Prompt do booking diz: "NÃO agende retirada de chaves automaticamente, pergunte ao cliente"

---

### Exemplo 3: Alta Temporada (Sem Descontos)

**Configuração no Dashboard:**
- `Settings → Negotiation → Preset: Alta Temporada`
- `Max Discount: 0%`
- `Negotiation Notes: "Dezembro é alta temporada, preços fixos"`

**Comportamento no N8N:**
- Sales Agent recebe: "Desconto máximo: 0%"
- Prompt inclui: "REGRA DE OURO: NUNCA ultrapasse 0% de desconto"
- Sofia responde: "Devido à alta temporada, os preços são fixos"

---

## 🧪 Testes Necessários

### Teste 1: Configuração Dinâmica
1. Configurar tenant A: Sales ON, desconto 30%
2. Configurar tenant B: Sales OFF, sem negociação
3. Testar ambos os tenants com mesma pergunta sobre desconto
4. **Resultado Esperado:** Tenant A negocia, Tenant B recusa

---

### Teste 2: Pause/Resume AI ✅ **JÁ FUNCIONA**
1. Iniciar conversa com Sofia
2. Na plataforma: clicar "Pause AI por 1h"
3. Cliente envia nova mensagem
4. **Resultado Esperado:** Sofia NÃO responde ✅
5. Na plataforma: enviar mensagem manual
6. **Resultado Esperado:** Cliente recebe mensagem do usuário ✅
7. Aguardar 1 hora OU clicar "Resume AI"
8. Cliente envia nova mensagem
9. **Resultado Esperado:** Sofia volta a responder automaticamente ✅

**✅ Este teste já deve funcionar sem mudanças no N8N!**

---

### Teste 3: Prompts Dinâmicos
1. Configurar: "Booking Agent → Require Email: YES"
2. Iniciar reserva
3. **Resultado Esperado:** Sofia pede email obrigatoriamente
4. Alterar: "Require Email: NO"
5. Iniciar nova reserva
6. **Resultado Esperado:** Sofia NÃO pede email

---

## 🚨 Pontos de Atenção

### ⚠️ Performance
- **Problema:** Buscar config a cada mensagem pode ser lento
- **Solução:** Implementar cache de 5 minutos (Workflow Static Data ou Redis)

### ⚠️ Fallback
- **Problema:** Se API de config falhar, workflow para
- **Solução:** Sempre ter um prompt padrão como fallback

### ⚠️ Sincronização
- **Problema:** User altera config, mas N8N usa cache antigo
- **Solução:** TTL de 5 minutos OU webhook que invalida cache

---

## 📝 Checklist de Implementação

### **✅ Bloqueios (Já Funcionam)**
```
[✅] 1. Sistema de pause/resume AI - JÁ FUNCIONA
[✅] 2. Verificação automática no N8N - JÁ FUNCIONA
[✅] 3. Envio manual de mensagens - JÁ FUNCIONA
[✅] 4. Redis compartilhado - JÁ CONFIGURADO
```

### **📋 Prompts Dinâmicos (Implementar)**
```
[ ] 1. Adicionar node `fetch_tenant_config`
[ ] 2. Atualizar Router Agent com prompts dinâmicos
[ ] 3. Criar/atualizar Search Agent com prompts dinâmicos
[ ] 4. Criar/atualizar Booking Agent com prompts dinâmicos
[ ] 5. Criar/atualizar Sales Agent com prompts dinâmicos
[ ] 6. Criar/atualizar Support Agent com prompts dinâmicos
[ ] 7. Adicionar tool `get-tenant-config`
[ ] 8. Adicionar tool `get-agent-prompts` (opcional)
[ ] 9. Implementar cache de configurações (opcional)
[ ] 10. Testar com tenant A (full features)
[ ] 11. Testar com tenant B (limited features)
[ ] 12. Testar prompts dinâmicos por agente
```

---

## 🔗 Endpoints de Referência

### Plataforma → N8N
- `POST /api/ai/functions/get-tenant-config` - Buscar todas as configs
- `POST /api/ai/functions/get-agent-prompts` - Buscar prompts dinâmicos
- `GET /api/ai/block-conversation?tenantId=X&phone=Y` - Verificar se IA está pausada

### WhatsApp Microservice → Plataforma
- `POST /api/webhook/client-message` - Receber mensagens do cliente em tempo real

### Plataforma → WhatsApp Microservice
- `POST /api/whatsapp/send-manual` - Enviar mensagem manual (quando IA pausada)

---

## 📚 Documentação Adicional

- **Configurações de Negotiation:** `/docs/SETTINGS_NEGOTIATION.md`
- **AI Config Settings:** `/docs/AI_CONFIG_GUIDE.md`
- **Block Conversation API:** `/docs/API_BLOCK_CONVERSATION.md`

---

## ✅ Conclusão

### **O Que Já Funciona:**
✅ **Comunicação Bilateral** - User pode pausar IA e conversar manualmente
✅ **Bloqueios Automáticos** - N8N já verifica Redis antes de processar
✅ **Envio Manual** - User envia mensagens pela plataforma
✅ **Auto-Resume** - IA volta automaticamente após TTL

### **O Que Falta Implementar:**
📋 **Prompts Dinâmicos** - Cada tenant com instruções personalizadas
📋 **Configs Completas** - Acesso a negotiation, AI, policies, company via API
📋 **Agentes Personalizados** - Router decide baseado em features habilitadas

---

**Dúvidas ou problemas durante a implementação?**
Consulte os logs da plataforma em `/api/ai/functions/*` ou entre em contato com a equipe técnica.

**Próximos Passos:**
1. Implementar mudanças no N8N (seguir checklist acima)
2. Testar em ambiente de staging
3. Validar com 2-3 tenants piloto
4. Deploy para produção
