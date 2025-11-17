# 📘 Guia de Migração do Workflow N8N - Sistema de Configuração Dinâmica

**Data:** 17 de Janeiro de 2025
**Objetivo:** Implementar comunicação bidirecional entre Locai e N8N para configurações dinâmicas de agentes

---

## 🎯 Visão Geral da Mudança

### Antes (Sistema Atual)
- ❌ Prompts hardcoded nos agentes
- ❌ Sem controle granular de permissões
- ❌ Descontos fixos no código
- ❌ Impossibilidade de pausar IA por conversa
- ❌ N8N só RECEBE mensagens, nunca busca configs

### Depois (Novo Sistema)
- ✅ Configurações dinâmicas por tenant
- ✅ Controle de permissões de agentes via Settings
- ✅ Descontos personalizáveis por imobiliária
- ✅ Bloqueio de IA por conversa individual
- ✅ Prompts personalizados por empresa
- ✅ N8N busca configs no início do fluxo

---

## 🏗️ Arquitetura da Solução

### Fluxo de Comunicação

```
┌─────────────────────────────────────────────────────────────┐
│                    SISTEMA LOCAI                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Settings UI                                                  │
│  ├─ Toggles de Agentes                                       │
│  ├─ Limites de Desconto                                      │
│  └─ Prompts Personalizados                                   │
│                    ↓                                          │
│  API: /api/ai/config (GET/PUT/POST)                          │
│                    ↓                                          │
│  Firestore: tenants/{tenantId}/aiConfig/settings             │
│                                                               │
│  API: /api/ai/block-conversation (GET/POST)                  │
│                    ↓                                          │
│  Redis: ai:block:{tenantId}:{phone}                          │
│                                                               │
└───────────────────────────────┬───────────────────────────────┘
                                │
                                │ HTTP GET Request
                                ↓
┌─────────────────────────────────────────────────────────────┐
│                    N8N WORKFLOW                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Webhook recebe mensagem                                  │
│  2. Busca AI Config do tenant (novo)                         │
│  3. Verifica bloqueio da conversa (novo)                     │
│  4. Constrói prompts dinâmicos (novo)                        │
│  5. Router Agent (com prompt dinâmico)                       │
│  6. Specialist Agents (respeitando permissões)               │
│  7. Envia respostas                                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Mudanças Necessárias no Workflow N8N

### 1️⃣ NOVO NODE: Fetch AI Config (Logo após Webhook)

**Tipo:** HTTP Request Node
**Posição:** Entre `message_extraction` e `Redis`
**Nome:** `fetch_ai_config`

**Configuração:**

```json
{
  "authentication": "none",
  "method": "GET",
  "url": "=https://alugazap.com/api/ai/config?tenantId={{ $json.tenantId }}",
  "options": {
    "timeout": 5000,
    "retry": {
      "enabled": true,
      "maxRetries": 2
    }
  },
  "name": "fetch_ai_config"
}
```

**Output Esperado:**

```json
{
  "success": true,
  "data": {
    "tenantId": "xxx",
    "enabled": true,
    "autoResponse": true,
    "agentPermissions": {
      "search": true,
      "booking": true,
      "sales": true,
      "support": true,
      "payments": false
    },
    "discountSettings": {
      "enabled": true,
      "maxPercentage": 15,
      "approvalThreshold": 10,
      "allowedCriteria": {
        "earlyBooking": true,
        "longStay": true,
        "lowSeason": false,
        "lastMinute": true,
        "multiProperty": false
      }
    },
    "customPrompts": {
      "companyName": "Imobiliária ABC",
      "tone": "friendly",
      "welcome": "Olá! Sou a Sofia...",
      "companyValues": "Somos especialistas em...",
      "specialInstructions": "Sempre mencionar..."
    }
  }
}
```

---

### 2️⃣ NOVO NODE: Check AI Block (Logo após fetch_ai_config)

**Tipo:** HTTP Request Node
**Nome:** `check_ai_block`

**Configuração:**

```json
{
  "authentication": "none",
  "method": "GET",
  "url": "=https://alugazap.com/api/ai/block-conversation?tenantId={{ $json.tenantId }}&phone={{ $json.phone }}",
  "options": {
    "timeout": 3000
  },
  "name": "check_ai_block"
}
```

**Output Esperado:**

```json
{
  "success": true,
  "data": {
    "tenantId": "xxx",
    "phone": "5511999999999",
    "blocked": false
  }
}
```

---

### 3️⃣ NOVO NODE: Route by Block Status (IF Node)

**Tipo:** IF Node
**Nome:** `route_by_block_status`
**Condição:** `{{ $json.data.blocked }} === true`

**Fluxo:**
- **TRUE (bloqueado):** Vai para novo node `send_block_notification` → END
- **FALSE (não bloqueado):** Continua para `If` existente (que vai para Router Agent)

---

### 4️⃣ NOVO NODE: Send Block Notification

**Tipo:** HTTP Request Node
**Nome:** `send_block_notification`
**Descrição:** Notifica sistema que mensagem foi recebida mas IA está bloqueada

**Configuração:**

```json
{
  "method": "POST",
  "url": "=https://alugazap.com/api/ai/functions/post-notification",
  "body": {
    "tenantId": "={{ $json.tenantId }}",
    "phone": "={{ $json.phone }}",
    "type": "ai_blocked",
    "message": "Nova mensagem recebida. Agente de IA bloqueado - resposta manual necessária.",
    "priority": "high"
  },
  "name": "send_block_notification"
}
```

---

### 5️⃣ ATUALIZAR: Router Agent Prompt (DINÂMICO)

**Node:** `Router Agent`
**Campo:** System Message

**ANTES (Hardcoded):**

```
Você é Sofia, uma consultora de imóveis da Locai.
Analise a mensagem e direcione para o agente especializado correto:
- SEARCH: busca de imóveis
- BOOKING: reservas
- SUPPORT: suporte geral
- SALES: negociação
```

**DEPOIS (Dinâmico):**

```javascript
// No Code Node antes do Router Agent, criar variável de prompt

const aiConfig = $('fetch_ai_config').first().json.data;
const customPrompts = aiConfig.customPrompts || {};
const permissions = aiConfig.agentPermissions || {};

// Lista de agentes habilitados
const enabledAgents = [];
if (permissions.search) enabledAgents.push('SEARCH: busca e apresentação de imóveis');
if (permissions.booking) enabledAgents.push('BOOKING: reservas e agendamentos');
if (permissions.sales) enabledAgents.push('SALES: negociação e descontos');
if (permissions.support) enabledAgents.push('SUPPORT: suporte geral e políticas');
if (permissions.payments) enabledAgents.push('PAYMENTS: cobranças e pagamentos');

// Construir prompt dinâmico
const companyName = customPrompts.companyName || 'nossa imobiliária';
const tone = customPrompts.tone || 'friendly';
const specialInstructions = customPrompts.specialInstructions || '';

let toneInstruction = '';
if (tone === 'formal') toneInstruction = 'Mantenha um tom profissional e formal.';
else if (tone === 'casual') toneInstruction = 'Use linguagem casual e descontraída.';
else toneInstruction = 'Seja amigável e acolhedora.';

const systemPrompt = `Você é Sofia, consultora de imóveis da ${companyName}.

${toneInstruction}

${customPrompts.companyValues ? 'SOBRE A EMPRESA:\n' + customPrompts.companyValues + '\n' : ''}

${specialInstructions ? 'INSTRUÇÕES ESPECIAIS:\n' + specialInstructions + '\n' : ''}

AGENTES DISPONÍVEIS:
${enabledAgents.map(a => '- ' + a).join('\n')}

Analise a mensagem do cliente e retorne APENAS o nome do agente especializado (SEARCH, BOOKING, SALES, SUPPORT${permissions.payments ? ', PAYMENTS' : ''}) mais adequado para responder.

Responda com UMA ÚNICA PALAVRA: o nome do agente.`;

return [{
  json: {
    ...items[0].json,
    systemPrompt
  }
}];
```

**Usar no Router Agent:**
- System Message: `={{ $json.systemPrompt }}`

---

### 6️⃣ ATUALIZAR: Search Agent Prompt (DINÂMICO)

**Node:** `Search Agent`
**Campo:** System Message

```javascript
// Code Node para Search Agent Prompt

const aiConfig = $('fetch_ai_config').first().json.data;
const customPrompts = aiConfig.customPrompts || {};

const companyName = customPrompts.companyName || 'nossa imobiliária';
const welcome = customPrompts.welcome || 'Olá! Como posso ajudar você a encontrar o imóvel ideal?';

const searchPrompt = `Você é Sofia, especialista em busca de imóveis da ${companyName}.

MENSAGEM DE BOAS-VINDAS (use para novos clientes):
${welcome}

SUAS RESPONSABILIDADES:
- Buscar imóveis usando search-properties
- Apresentar detalhes com get_property_details
- Enviar fotos com send-property-media
- Enviar localização com send_property_map

${customPrompts.companyValues ? 'DIFERENCIAIS DA EMPRESA:\n' + customPrompts.companyValues : ''}

Seja consultiva, faça perguntas qualificadoras (datas, quantidade de pessoas, localização preferida, orçamento).`;

return [{ json: { ...items[0].json, searchPrompt } }];
```

---

### 7️⃣ ATUALIZAR: Sales Agent Prompt (DINÂMICO COM DESCONTO)

**Node:** `Sales Agent`
**Campo:** System Message

```javascript
// Code Node para Sales Agent Prompt

const aiConfig = $('fetch_ai_config').first().json.data;
const customPrompts = aiConfig.customPrompts || {};
const discountSettings = aiConfig.discountSettings || {};

const companyName = customPrompts.companyName || 'nossa imobiliária';

let discountInstructions = '';
if (discountSettings.enabled) {
  const criteria = discountSettings.allowedCriteria || {};
  const allowedCriteria = [];

  if (criteria.earlyBooking) allowedCriteria.push('reserva antecipada');
  if (criteria.longStay) allowedCriteria.push('estadia longa (7+ noites)');
  if (criteria.lowSeason) allowedCriteria.push('baixa temporada');
  if (criteria.lastMinute) allowedCriteria.push('última hora');
  if (criteria.multiProperty) allowedCriteria.push('múltiplos imóveis');

  discountInstructions = `
POLÍTICA DE DESCONTOS:
- Desconto máximo permitido: ${discountSettings.maxPercentage}%
- Descontos acima de ${discountSettings.approvalThreshold}% requerem aprovação gerencial
- Critérios permitidos: ${allowedCriteria.join(', ')}

Use a função calculate_dynamic_discount para calcular descontos automáticos.
NUNCA ofereça desconto acima do limite sem aprovação.
${discountSettings.requiresApproval ? 'Informe ao cliente que descontos acima de ' + discountSettings.approvalThreshold + '% precisam de aprovação.' : ''}`;
} else {
  discountInstructions = 'DESCONTOS DESABILITADOS: Não ofereça descontos. Use apenas preços calculados pela função calculate_price.';
}

const salesPrompt = `Você é Sofia, especialista em vendas e negociação da ${companyName}.

${discountInstructions}

SUAS RESPONSABILIDADES:
- Calcular preços com calculate_price
- Oferecer descontos estratégicos (respeitando limites)
- Acompanhar funil de vendas com track_conversion_step
- Qualificar leads com track_qualification_milestone

${customPrompts.specialInstructions || ''}

Seja persuasiva mas honesta. Foque em valor, não apenas em preço.`;

return [{ json: { ...items[0].json, salesPrompt } }];
```

---

### 8️⃣ ATUALIZAR: Booking Agent Prompt (DINÂMICO)

**Node:** `Booking Agent`
**Campo:** System Message

```javascript
// Code Node para Booking Agent Prompt

const aiConfig = $('fetch_ai_config').first().json.data;
const customPrompts = aiConfig.customPrompts || {};

const companyName = customPrompts.companyName || 'nossa imobiliária';

const bookingPrompt = `Você é Sofia, especialista em reservas e agendamentos da ${companyName}.

SUAS RESPONSABILIDADES:
- Verificar disponibilidade com check_availability
- Criar reservas com create-reservation
- Modificar reservas com modify_reservation
- Cancelar reservas com cancel_reservation
- Registrar clientes com register_client
- Agendar visitas com schedule_meeting e check_agenda_availability

${customPrompts.specialInstructions || ''}

IMPORTANTE: Sempre confirme dados antes de criar reserva (nome completo, CPF, datas, número de hóspedes).`;

return [{ json: { ...items[0].json, bookingPrompt } }];
```

---

### 9️⃣ ATUALIZAR: Support Agent Prompt (DINÂMICO)

**Node:** `Support Agent`
**Campo:** System Message

```javascript
// Code Node para Support Agent Prompt

const aiConfig = $('fetch_ai_config').first().json.data;
const customPrompts = aiConfig.customPrompts || {};

const companyName = customPrompts.companyName || 'nossa imobiliária';

const supportPrompt = `Você é Sofia, especialista em suporte e atendimento da ${companyName}.

SUAS RESPONSABILIDADES:
- Informar políticas com get_policies
- Agendar reuniões com schedule_meeting
- Enviar notificações urgentes com post_notification
- Responder dúvidas gerais sobre processos

${customPrompts.companyValues ? 'SOBRE A EMPRESA:\n' + customPrompts.companyValues : ''}

${customPrompts.specialInstructions || ''}

Seja paciente, empática e resolva problemas de forma proativa.`;

return [{ json: { ...items[0].json, supportPrompt } }];
```

---

### 🔟 NOVO AGENT: Payments Agent (Preparação Futura)

**Node:** Novo AI Agent
**Nome:** `Payments Agent`
**Condição no Switch:** Route "PAYMENTS" (só ativo se `agentPermissions.payments === true`)

**Prompt Base:**

```javascript
const aiConfig = $('fetch_ai_config').first().json.data;
const customPrompts = aiConfig.customPrompts || {};

const companyName = customPrompts.companyName || 'nossa imobiliária';

const paymentsPrompt = `Você é Sofia, especialista em cobranças e pagamentos da ${companyName}.

SUAS RESPONSABILIDADES (quando implementadas):
- Gerar boletos e PIX
- Verificar status de pagamentos
- Enviar lembretes de cobrança
- Processar estornos

${customPrompts.specialInstructions || ''}

Seja profissional e sensível ao tratar de valores financeiros.`;

return [{ json: { ...items[0].json, paymentsPrompt } }];
```

---

## 📋 Checklist de Implementação N8N

### Fase 1: Estrutura Base
- [ ] Adicionar node `fetch_ai_config` após `message_extraction`
- [ ] Adicionar node `check_ai_block` após `fetch_ai_config`
- [ ] Adicionar IF node `route_by_block_status`
- [ ] Adicionar node `send_block_notification`
- [ ] Conectar fluxo: Webhook → extraction → fetch_config → check_block → route_by_block → If (original)

### Fase 2: Prompts Dinâmicos
- [ ] Criar Code Nodes para construção de prompts dinâmicos
- [ ] Atualizar Router Agent para usar `systemPrompt` dinâmico
- [ ] Atualizar Search Agent com prompt personalizado
- [ ] Atualizar Sales Agent com instruções de desconto dinâmicas
- [ ] Atualizar Booking Agent com prompt personalizado
- [ ] Atualizar Support Agent com prompt personalizado

### Fase 3: Roteamento Inteligente
- [ ] Modificar Switch "Route to Specialist" para verificar permissões
- [ ] Adicionar casos condicionais no Switch:
  - SEARCH: só roteia se `agentPermissions.search === true`
  - BOOKING: só roteia se `agentPermissions.booking === true`
  - SALES: só roteia se `agentPermissions.sales === true`
  - SUPPORT: só roteia se `agentPermissions.support === true`
  - PAYMENTS: só roteia se `agentPermissions.payments === true` (futuro)
- [ ] Adicionar fallback para quando agente está desabilitado

### Fase 4: Validação de Descontos
- [ ] Modificar função `calculate_dynamic_discount` para ler settings
- [ ] Adicionar validação de `maxPercentage` antes de oferecer desconto
- [ ] Implementar lógica de `approvalThreshold` (notificar humano se exceder)
- [ ] Filtrar critérios de desconto baseado em `allowedCriteria`

### Fase 5: Testing
- [ ] Testar com agente desabilitado (deve ignorar rota)
- [ ] Testar com IA bloqueada em conversa (deve enviar notificação)
- [ ] Testar prompts personalizados (company name, tone, welcome)
- [ ] Testar limites de desconto (max percentage, approval threshold)
- [ ] Testar critérios de desconto (cada toggle on/off)

---

## 🔄 Fluxo Completo Atualizado

```
1. Webhook recebe mensagem do WhatsApp
   ↓
2. message_extraction (extrai phone, message, tenantId)
   ↓
3. fetch_ai_config (busca configurações do tenant)
   ↓
4. check_ai_block (verifica se IA está bloqueada para esta conversa)
   ↓
5. route_by_block_status (IF)
   ├─ BLOCKED → send_block_notification → END
   └─ NOT BLOCKED → Continua
   ↓
6. Redis check (histórico da conversa)
   ↓
7. If (lógica original)
   ↓
8. build_router_prompt (Code: cria prompt dinâmico do Router)
   ↓
9. Router Agent (decide qual agente usar, respeitando permissões)
   ↓
10. Route to Specialist (Switch com validação de permissões)
    ├─ SEARCH (se permissions.search)
    │   ↓
    │   build_search_prompt → Search Agent → send_property_map, search-properties, etc.
    │
    ├─ BOOKING (se permissions.booking)
    │   ↓
    │   build_booking_prompt → Booking Agent → create-reservation, check_availability, etc.
    │
    ├─ SALES (se permissions.sales)
    │   ↓
    │   build_sales_prompt → Sales Agent → calculate_dynamic_discount (com validação), track_conversion_step
    │
    ├─ SUPPORT (se permissions.support)
    │   ↓
    │   build_support_prompt → Support Agent → get_policies, schedule_meeting, post_notification
    │
    └─ PAYMENTS (se permissions.payments) [FUTURO]
        ↓
        build_payments_prompt → Payments Agent → [funções de pagamento]
   ↓
11. split_property (formata resposta)
    ↓
12. format_response_json
    ↓
13. Loop Over Items → final_send (envia via WhatsApp)
    ↓
14. send_confirmation
    ↓
15. format_post_conversation
    ↓
16. post_conversation (salva no sistema)
```

---

## 🛠️ Exemplos de Code Nodes

### Code Node: build_router_prompt

```javascript
const aiConfig = $('fetch_ai_config').first().json.data;
const customPrompts = aiConfig.customPrompts || {};
const permissions = aiConfig.agentPermissions || {};

// Lista de agentes habilitados
const enabledAgents = [];
if (permissions.search) enabledAgents.push('SEARCH: busca e apresentação de imóveis');
if (permissions.booking) enabledAgents.push('BOOKING: reservas e agendamentos');
if (permissions.sales) enabledAgents.push('SALES: negociação e descontos');
if (permissions.support) enabledAgents.push('SUPPORT: suporte geral e políticas');
if (permissions.payments) enabledAgents.push('PAYMENTS: cobranças e pagamentos');

const companyName = customPrompts.companyName || 'nossa imobiliária';
const tone = customPrompts.tone || 'friendly';
const specialInstructions = customPrompts.specialInstructions || '';

let toneInstruction = '';
if (tone === 'formal') toneInstruction = 'Mantenha um tom profissional e formal.';
else if (tone === 'casual') toneInstruction = 'Use linguagem casual e descontraída.';
else toneInstruction = 'Seja amigável e acolhedora.';

const systemPrompt = `Você é Sofia, consultora de imóveis da ${companyName}.

${toneInstruction}

${customPrompts.companyValues ? 'SOBRE A EMPRESA:\n' + customPrompts.companyValues + '\n' : ''}

${specialInstructions ? 'INSTRUÇÕES ESPECIAIS:\n' + specialInstructions + '\n' : ''}

AGENTES DISPONÍVEIS:
${enabledAgents.map(a => '- ' + a).join('\n')}

Analise a mensagem do cliente e retorne APENAS o nome do agente especializado mais adequado.

Responda com UMA ÚNICA PALAVRA: SEARCH, BOOKING, SALES, SUPPORT${permissions.payments ? ' ou PAYMENTS' : ''}.`;

return items.map(item => ({
  json: {
    ...item.json,
    systemPrompt,
    aiConfig
  }
}));
```

### Code Node: validate_agent_permission (antes de cada Specialist Agent)

```javascript
// Exemplo para Search Agent
const aiConfig = $json.aiConfig;
const requestedAgent = 'search'; // mude para: booking, sales, support, payments

if (!aiConfig.agentPermissions[requestedAgent]) {
  // Agente desabilitado, retornar mensagem padrão
  return [{
    json: {
      output: `Desculpe, esta funcionalidade não está disponível no momento. Entre em contato com nossa equipe pelo telefone.`,
      error: true,
      reason: `${requestedAgent} agent disabled`
    }
  }];
}

// Agente habilitado, continuar normalmente
return items;
```

### Switch Node: Route to Specialist (atualizado)

**Configuração de Casos:**

```javascript
// Caso 1: SEARCH
Expression: {{ $json.output === 'SEARCH' && $json.aiConfig.agentPermissions.search }}

// Caso 2: BOOKING
Expression: {{ $json.output === 'BOOKING' && $json.aiConfig.agentPermissions.booking }}

// Caso 3: SALES
Expression: {{ $json.output === 'SALES' && $json.aiConfig.agentPermissions.sales }}

// Caso 4: SUPPORT
Expression: {{ $json.output === 'SUPPORT' && $json.aiConfig.agentPermissions.support }}

// Caso 5: PAYMENTS (futuro)
Expression: {{ $json.output === 'PAYMENTS' && $json.aiConfig.agentPermissions.payments }}

// Default (fallback quando agente está desabilitado)
Output: "Desculpe, não consigo processar sua solicitação no momento. Nossa equipe entrará em contato em breve."
```

---

## 🧪 Testes Recomendados

### Teste 1: Agente Desabilitado
1. No Settings, desabilitar "Search Agent"
2. Enviar mensagem: "Quero ver imóveis na praia"
3. **Resultado esperado:** Router deve redirecionar para Support ou retornar mensagem padrão

### Teste 2: IA Bloqueada
1. Na tela de conversas, clicar em "Bloquear IA" para um número
2. Enviar mensagem desse número
3. **Resultado esperado:** N8N detecta bloqueio, envia notificação ao sistema, não responde automaticamente

### Teste 3: Desconto Limitado
1. No Settings, configurar "Desconto Máximo: 10%"
2. Tentar negociar desconto acima de 10%
3. **Resultado esperado:** Sofia informa que só pode oferecer até 10%, ou solicita aprovação

### Teste 4: Prompt Personalizado
1. No Settings, configurar:
   - Nome da Empresa: "Imóveis Paradisíacos"
   - Tom: "formal"
   - Welcome: "Bom dia! Falo com quem?"
2. Iniciar nova conversa
3. **Resultado esperado:** Sofia usa nome da empresa e tom formal

### Teste 5: Critérios de Desconto
1. No Settings, desabilitar "Desconto por Baixa Temporada"
2. Solicitar desconto para período de baixa temporada
3. **Resultado esperado:** Sofia não oferece desconto automático, ou oferece apenas por outros critérios

---

## 📊 Monitoramento e Logs

### Pontos de Log no N8N

Adicionar logs em:
1. **fetch_ai_config:** Log de sucesso/erro ao buscar config
2. **check_ai_block:** Log quando detectar conversa bloqueada
3. **build_prompts:** Log de prompts gerados (debug mode)
4. **Route to Specialist:** Log de agente escolhido + se estava habilitado

### Exemplo de Log Node

```javascript
// Code Node para logging
const aiConfig = $json.aiConfig;
const phone = $json.phone;
const tenantId = $json.tenantId;

console.log('[SOFIA-N8N] Config loaded:', {
  tenantId: tenantId.substring(0, 8) + '***',
  phone: phone.substring(0, 5) + '***',
  enabled: aiConfig.enabled,
  enabledAgents: Object.keys(aiConfig.agentPermissions).filter(k => aiConfig.agentPermissions[k]),
  discountEnabled: aiConfig.discountSettings.enabled,
  maxDiscount: aiConfig.discountSettings.maxPercentage
});

return items;
```

---

## ⚠️ Pontos de Atenção

1. **Timeout nas chamadas HTTP**: Configurar retry e timeout adequados (5s recomendado)
2. **Fallback de Config**: Se API falhar, usar configuração padrão hardcoded
3. **Cache de Config**: Considerar cachear aiConfig por 5 minutos no Redis para performance
4. **Validação de Permissões**: SEMPRE validar antes de executar tools
5. **Logging**: Log todas as decisões de roteamento para debug
6. **Backward Compatibility**: Sistema deve funcionar mesmo se Settings não foi configurado (usar defaults)

---

## 🚀 Deployment

### Ordem de Deploy

1. **Primeiro:** Deploy do sistema Locai (APIs de config e bloqueio)
2. **Testar:** APIs manualmente com Postman/curl
3. **Depois:** Atualizar workflow N8N
4. **Testar:** Fluxo completo com mensagens reais
5. **Migrar:** Tenants existentes (criar configs padrão via script)

### Script de Migração de Tenants

```bash
# Executar no servidor Locai
curl -X POST https://alugazap.com/api/admin/migrate-ai-configs \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

Criar endpoint `/api/admin/migrate-ai-configs` que:
- Lista todos os tenants
- Para cada tenant sem aiConfig, criar configuração padrão
- Log de sucesso/erro

---

## 📞 Suporte e Dúvidas

**Documentação Adicional:**
- Tipos TypeScript: `lib/types/ai-config.ts`
- API Endpoints: `/api/ai/config`, `/api/ai/block-conversation`
- Componentes UI: `app/dashboard/settings/components/AIConfigSection.tsx`

**Contato:**
- Para dúvidas técnicas sobre Locai: Verificar logs em `/api/ai/config`
- Para dúvidas sobre N8N: Logs no workflow N8N

---

**✅ Checklist Final**

Antes de considerar a migração completa:

- [ ] Todas as APIs de config funcionando
- [ ] Componente de Settings renderizando corretamente
- [ ] Botão de bloqueio de IA funcional nas conversas
- [ ] Workflow N8N atualizado com todos os nodes
- [ ] Prompts dinâmicos testados
- [ ] Validação de permissões funcionando
- [ ] Limites de desconto respeitados
- [ ] Bloqueio de conversas funcionando
- [ ] Logs e monitoramento ativos
- [ ] Documentação atualizada

---

**Data de Conclusão:** _____________________
**Responsável pela Implementação:** _____________________
**Versão do Workflow N8N:** _____________________
