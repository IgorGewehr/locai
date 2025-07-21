# DOSSIÊ DO AGENTE DE IA - SISTEMA LOCAI
*Análise Técnica Completa | Janeiro 2025*

---

## 🔍 **RESUMO EXECUTIVO**

O sistema Locai possui um agente de IA **enterprise-grade** chamado **Sofia**, especializado em vendas imobiliárias. É um sistema robusto baseado em OpenAI GPT-4 com arquitetura ReAct (Reasoning and Acting), capaz de processar mensagens WhatsApp e executar 26 funções especializadas para cobrir todo o ciclo de vida do cliente no setor imobiliário.

### **Características Principais**
- **Personalidade**: Sofia - Vendedora especializada em conversão
- **Arquitetura**: ReAct com 8 turnos máximos e 2 minutos de timeout
- **Funções**: 26 ferramentas organizadas em 7 categorias
- **Integração**: WhatsApp Business API + WhatsApp Web (Baileys)
- **Controles**: Rate limiting, validação, cache, métricas de qualidade
- **Multi-tenant**: Isolamento completo de dados por tenant

---

## 🏗️ **ARQUITETURA DO SISTEMA**

### **Componentes Principais**

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO PRINCIPAL                          │
├─────────────────────────────────────────────────────────────┤
│ WhatsApp → API Endpoint → Orquestrador → OpenAI → Funções  │
│     ↓           ↓             ↓          ↓         ↓       │
│  Webhook    Rate Limit    ReAct Loop   GPT-4    Execução   │
│                ↓             ↓          ↓         ↓       │
│          Validação      Context Mgmt  Function   WhatsApp  │
│                ↓             ↓        Calling      Response │
│              Cache         Firestore     ↓          ↓      │
│                ↓             ↓       Validation   Analytics│
└─────────────────────────────────────────────────────────────┘
```

### **Arquivos Core do Sistema**

#### **📁 Núcleo de IA (`lib/ai/`)**
- `agent-functions.ts` (28.866 tokens) - **Definições de todas as 26 funções**
- `response-generator.ts` - Gerador principal de respostas
- `conversation-context.ts` - Gerenciamento de contexto e memória
- `sales-personality.ts` - Personalidade e características da Sofia
- `response-cache.ts` - Sistema de cache para otimização
- `predefined-responses.ts` - Respostas pré-definidas

#### **📁 Orquestradores (`lib/services/`)**
- `agent-orchestrator-enhanced.service.ts` - **Orquestrador principal com ReAct**
- `agent-simple.service.ts` - Versão simplificada
- `commercial-agent.service.ts` - Agente comercial especializado
- `agent-vendedor.service.ts` - Agente focado em vendas

#### **📁 APIs (`app/api/agent*/`)**
- `app/api/agent/route.ts` - **API principal com autenticação e rate limiting**
- `app/api/agent-simple/route.ts` - API do agente simplificado
- `app/api/agent-commercial/route.ts` - API comercial
- `app/api/agent-vendedor/route.ts` - API vendedor

#### **📁 Controles de Qualidade (`lib/services/`)**
- `response-validator.service.ts` - Validação de respostas
- `quality-metrics.service.ts` - Métricas de qualidade
- `cost-control.service.ts` - Controle de custos OpenAI
- `intent-detector.service.ts` - Detecção de intenções
- `follow-up.service.ts` - Sistema de follow-up automático
- `offline-responses.service.ts` - Respostas offline

---

## 🧠 **PERSONALIDADE: SOFIA**

### **Prompt Master** (`lib/prompts/master-prompt-react.ts`)

```
Você é Sofia, vendedora da locai. Objetivo: CONVERTER leads em reservas.

REGRAS SIMPLES:
1. Responda em 2-3 linhas no máximo
2. Seja amigável mas direta ao ponto  
3. Sempre sugira próxima ação
4. Use 1-2 emojis por mensagem 😊
5. Crie urgência natural ("está disponível", "posso reservar")

FLUXO SIMPLES:
1. Sem cidade? SEMPRE pergunte a cidade PRIMEIRO
2. Com cidade? Busque imóveis
3. Achou imóveis? Mostre com urgência
4. Cliente interessado? Calcule valores
5. Cliente confirmou? Crie reserva
```

### **Características Comportamentais**
- **Foco**: Conversão de leads em reservas
- **Tom**: Amigável, direta e persuasiva
- **Estratégia**: Criar urgência natural
- **Limitação**: Máximo 2-3 linhas por resposta
- **Emojis**: 1-2 por mensagem para humanização

---

## ⚙️ **FLUXO DE PROCESSAMENTO DE MENSAGENS**

### **Diagrama do Fluxo ReAct**

```
📱 MENSAGEM WHATSAPP
       ↓
🔐 AUTENTICAÇÃO & VALIDAÇÃO
       ↓
⏱️ RATE LIMITING (20 msgs/min)
       ↓
💾 BUSCAR/CRIAR CLIENTE & CONVERSA
       ↓
🧠 ENHANCED AGENT ORCHESTRATOR
       ↓
┌─────────────────────────────────┐
│         LOOP REACT              │
│  (Máximo 8 turnos, 2 min)      │
│                                 │
│ 1️⃣ VERIFICAR CACHE              │
│     ↓ (cache hit = resposta)    │
│ 2️⃣ BUSCAR CONTEXTO             │
│     ↓                           │
│ 3️⃣ CHAMAR OPENAI GPT-4         │
│     ↓                           │
│ 4️⃣ ANALISAR RESPOSTA:          │
│     • reply → finalizar         │
│     • call_tool → executar      │
│     ↓                           │
│ 5️⃣ EXECUTAR FERRAMENTA         │
│     ↓                           │
│ 6️⃣ ATUALIZAR CONTEXTO          │
│     ↓                           │
│ 7️⃣ VERIFICAR SE COMPLETO       │
│     ↓ (não = volta ao passo 3)  │
│ 8️⃣ CRIAR RESPOSTA FINAL        │
└─────────────────────────────────┘
       ↓
📲 ENVIAR VIA WHATSAPP
       ↓
💾 SALVAR NO FIRESTORE
       ↓
📊 ATUALIZAR MÉTRICAS
```

### **Controles Anti-Loop**
- **Detecção de loops**: Mesmo tool usado consecutivamente
- **Request fulfilled**: Verifica se solicitação foi atendida
- **Forced reply**: Gera resposta baseada em resultado anterior
- **Timeout protection**: 2 minutos máximo por sessão

---

## 🛠️ **CATÁLOGO DE FUNÇÕES (26 FERRAMENTAS)**

### **🏠 1. GESTÃO DE PROPRIEDADES (6 funções)**

#### `search_properties` ⭐ **PRINCIPAL**
- **Uso**: Primeira função obrigatória para busca de imóveis
- **Parâmetros**: location (obrigatório), checkIn, checkOut, guests, budget, amenities
- **Retorno**: Lista de propriedades com fotos, preços e detalhes

#### `send_property_media`
- **Uso**: Enviar fotos/vídeos após ter propertyId
- **Parâmetros**: propertyId (obrigatório), mediaType
- **Retorno**: Mídia enviada via WhatsApp

#### `get_property_details`
- **Uso**: Detalhes completos de imóvel específico
- **Parâmetros**: propertyId
- **Retorno**: Informações detalhadas

#### `suggest_alternatives`
- **Uso**: Sugerir outras opções
- **Parâmetros**: Preferências do cliente
- **Retorno**: Propriedades alternativas

#### `update_property_availability`
- **Uso**: Gestão de calendário
- **Parâmetros**: propertyId, dates, action
- **Retorno**: Disponibilidade atualizada

#### `update_property_pricing`
- **Uso**: Ajustes dinâmicos de preço
- **Parâmetros**: propertyId, basePrice, cleaningFee
- **Retorno**: Preços atualizados

### **💰 2. PRECIFICAÇÃO E RESERVAS (5 funções)**

#### `calculate_total_price` ⭐ **PRINCIPAL**
- **Uso**: Cotação completa com taxas
- **Parâmetros**: propertyId, checkIn, checkOut, appliedDiscount
- **Retorno**: Preço detalhado com breakdown

#### `check_availability`
- **Uso**: Validação antes de reserva
- **Parâmetros**: propertyId, checkIn, checkOut
- **Retorno**: true/false + detalhes

#### `create_reservation` ⭐ **CONVERSÃO**
- **Uso**: Finalizar booking
- **Parâmetros**: propertyId, checkIn, checkOut, guestInfo, paymentInfo
- **Retorno**: Reserva confirmada + ID

#### `apply_discount`
- **Uso**: Negociação para fechamento
- **Parâmetros**: propertyId, discountPercentage (1-30%), reason
- **Retorno**: Preço com desconto

#### `schedule_follow_up`
- **Uso**: Agendar retorno
- **Parâmetros**: clientInfo, followUpDate, notes
- **Retorno**: Follow-up agendado

### **👥 3. CRM E LEADS (6 funções)**

#### `create_or_update_lead` ⭐ **CAPTURA**
- **Uso**: Criar/atualizar prospect automaticamente
- **Parâmetros**: name, phone, email, source, temperature, preferences
- **Retorno**: Lead criado/atualizado

#### `update_lead_status`
- **Uso**: Gestão de pipeline
- **Parâmetros**: leadId, status, reason, wonValue
- **Status**: new, contacted, qualified, opportunity, negotiation, won, lost, nurturing

#### `track_lead_interaction`
- **Uso**: Histórico detalhado
- **Parâmetros**: leadId, type, content, sentiment
- **Retorno**: Interação registrada

#### `get_lead_insights`
- **Uso**: Inteligência comercial
- **Parâmetros**: leadId, type (individual/pipeline/conversion_probability)
- **Retorno**: Análise preditiva

#### `schedule_lead_task`
- **Uso**: Workflow de follow-up
- **Parâmetros**: leadId, title, description, priority, dueDate
- **Retorno**: Tarefa criada

#### `schedule_property_viewing`
- **Uso**: Agendar visitas
- **Parâmetros**: propertyId, clientName, clientPhone, viewingDate, viewingTime
- **Retorno**: Visita agendada

### **📋 4. GESTÃO DE RESERVAS (2 funções)**

#### `cancel_reservation`
- **Uso**: Cancelamentos
- **Parâmetros**: reservationId, reason, refundAmount
- **Retorno**: Cancelamento processado

#### `modify_reservation`
- **Uso**: Alterações pós-booking
- **Parâmetros**: reservationId, newCheckIn, newCheckOut
- **Retorno**: Reserva modificada

### **💳 5. GESTÃO FINANCEIRA (5 funções)**

#### `create_financial_movement`
- **Uso**: Controle financeiro completo
- **Parâmetros**: type, category, amount, dueDate, paymentMethod
- **Retorno**: Movimentação registrada

#### `get_financial_summary`
- **Uso**: Relatórios executivos
- **Parâmetros**: period, type (overview/receivables/payables)
- **Retorno**: Resumo financeiro

#### `create_payment_reminder`
- **Uso**: Cobrança automatizada
- **Parâmetros**: clientName, amount, dueDate, sendNow
- **Retorno**: Lembrete enviado

#### `generate_financial_report`
- **Uso**: DRE e análises
- **Parâmetros**: reportType, period
- **Retorno**: Relatório detalhado

#### `check_overdue_accounts`
- **Uso**: Gestão de inadimplência
- **Parâmetros**: sendReminders, includeInterest
- **Retorno**: Contas vencidas + ações

### **💰 6. PAGAMENTOS E DESPESAS (3 funções)**

#### `confirm_payment_received`
- **Uso**: Controle de recebimentos
- **Parâmetros**: transactionId, paymentDate, paymentMethod
- **Retorno**: Pagamento confirmado

#### `create_expense`
- **Uso**: Gestão de custos
- **Parâmetros**: description, amount, category, propertyId
- **Retorno**: Despesa registrada

#### `process_billing_response`
- **Uso**: Interação de cobrança
- **Parâmetros**: clientId, responseType, promisedDate
- **Retorno**: Resposta processada

### **🌐 7. INTEGRAÇÃO EXTERNA (2 funções)**

#### `process_mini_site_inquiry`
- **Uso**: Leads de sites próprios
- **Parâmetros**: propertyId, clientName, source
- **Retorno**: Inquiry processada

#### `register_client`
- **Uso**: Cadastro autônomo
- **Parâmetros**: name, email, phone, document
- **Retorno**: Cliente registrado

---

## 🔧 **CONTROLES DE QUALIDADE E SEGURANÇA**

### **Rate Limiting**
- **Limite**: 20 mensagens por minuto por telefone
- **Implementação**: `getRateLimitService()` em `app/api/agent/route.ts:79`
- **Headers**: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset

### **Validação e Sanitização**
- **Input**: `validateMessageContent()`, `validatePhoneNumber()`, `validateTenantId()`
- **Output**: `sanitizeAIResponse()`, `sanitizeFunctionResults()`, `sanitizeClientData()`
- **Local**: `lib/utils/validation.ts` e `lib/utils/sanitizer.ts`

### **Error Handling Profissional**
- **Classificação**: `ErrorFilterService` para categorização
- **Recovery**: Retry com exponential backoff
- **Fallback**: Respostas amigáveis em português
- **Logging**: `RequestLogContext` para auditoria completa

### **Cache e Performance**
- **Response Cache**: `responseCacheService` para respostas < 10s
- **Context Cache**: Contexto de conversa persistente
- **Rate**: Cache hit = resposta instantânea
- **TTL**: Configurável por tenant

### **Métricas de Qualidade**
- **Confidence Scoring**: 0-1 para cada resposta
- **Tool Usage Stats**: Estatísticas de uso de ferramentas
- **Turn Count**: Número de turnos por sessão
- **Response Time**: Tempo de processamento
- **Error Count**: Contadores de erro por tipo

---

## 📊 **TIPOS E INTERFACES**

### **Principais Tipos** (`lib/types/ai-agent.ts`)

```typescript
interface AIInput {
  userMessage: string;
  conversationContext: ConversationContext;
  conversationHistory?: ConversationMessage[];
  previousToolResult?: ToolOutput;
  turnNumber?: number;
  clientPhone: string;
  tenantId: string;
  originalIntent?: string;
}

interface AIResponse {
  thought: string;
  action: {
    type: 'reply' | 'call_tool';
    payload: {
      message?: string;
      toolName?: string;
      parameters?: Record<string, any>;
    };
  };
  confidence: number;
  updatedContext: ConversationContext;
}

interface ConversationContext {
  searchFilters: Record<string, any>;
  interestedProperties: string[];
  pendingReservation?: PendingReservation;
  clientProfile: ClientProfile;
  currentPropertyId?: string;
}
```

---

## 🔄 **AGENTES ESPECIALIZADOS**

### **Agent Simple** (`lib/services/agent-simple.service.ts`)
- **Uso**: Casos simples e diretos
- **Características**: Menos turnos, respostas mais rápidas
- **Ideal para**: Perguntas básicas, informações simples

### **Commercial Agent** (`lib/services/commercial-agent.service.ts`)
- **Uso**: Vendas comerciais e empresariais
- **Características**: Foco em volume e empresas
- **Ideal para**: Clientes B2B, múltiplas propriedades

### **Agent Vendedor** (`lib/services/agent-vendedor.service.ts`)
- **Uso**: Conversão agressiva
- **Características**: Técnicas de vendas avançadas
- **Ideal para**: Leads quentes, negociação

---

## 📈 **MÉTRICAS E MONITORAMENTO**

### **Métricas Coletadas**
- **Total de Interações**: Contador de sessões
- **Taxa de Sucesso**: % de sessões bem-sucedidas
- **Turnos Médios**: Eficiência do agente
- **Tempo de Resposta**: Performance
- **Uso de Ferramentas**: Estatísticas por função
- **Taxa de Conversão**: Leads → Reservas
- **Confidence Score**: Qualidade das respostas

### **Debug e Análise**
- **AgentDebugger**: `lib/utils/agent-debugger.ts`
- **Session Analysis**: Análise pós-execução
- **Error Patterns**: Identificação de problemas
- **Recommendations**: Sugestões de melhoria

---

## 🔐 **SEGURANÇA E MULTI-TENANCY**

### **Isolamento de Tenant**
- **Validação**: `validateTenantId()` em todas as requisições
- **Contexto**: Tenant ID propagado para todos os serviços
- **Firestore**: Filtragem automática por tenant
- **WhatsApp**: Configurações isoladas por tenant

### **Autenticação**
- **Middleware**: `validateAuth()` e `requireTenant()`
- **Context**: `authContext` com dados do usuário
- **Optional**: WhatsApp webhooks podem ser anônimos
- **Required**: APIs de consulta requerem autenticação

---

## 🚀 **PERFORMANCE E OTIMIZAÇÕES**

### **ReAct Loop Optimizations**
- **Max Turns**: 8 turnos para evitar loops infinitos
- **Timeout**: 2 minutos máximo por sessão
- **Anti-Loop**: Detecção de ferramentas repetidas
- **Request Fulfilled**: Validação de completude

### **Cache Strategy**
- **Response Cache**: Respostas rápidas < 10s
- **Context Cache**: Contexto persistente
- **Tool Cache**: Resultados de ferramentas
- **Tenant Cache**: Configurações por tenant

### **Async Operations**
- **Timeouts**: Configuráveis por operação
- **Retries**: Exponential backoff
- **Circuit Breaker**: Proteção contra falhas
- **Batch Processing**: Operações em lote

---

## 🎯 **CASOS DE USO PRINCIPAIS**

### **1. Descoberta de Imóveis**
```
Cliente: "quero apartamento em Copacabana"
Sofia: search_properties(location="Copacabana") 
      → send_property_media(propertyId="123")
      → "Encontrei 5 opções! Enviei fotos da mais procurada! 📸"
```

### **2. Cotação e Reserva**
```
Cliente: "quanto fica 3 noites?"
Sofia: calculate_total_price(propertyId="123", nights=3)
      → "R$ 900 total! Está disponível! Posso reservar? 😊"
Cliente: "confirma"
Sofia: create_reservation(...) 
      → "Perfeito! Reserva confirmada! Código: RES123 🎉"
```

### **3. Lead Management**
```
Novo cliente no WhatsApp
Sofia: create_or_update_lead(name="João", phone="+5511...", source="whatsapp_ai")
      → track_lead_interaction(leadId="L123", type="inquiry")
      → "Oi João! Em qual cidade você procura? 😊"
```

---

## 🔍 **DEBUGGING E TROUBLESHOOTING**

### **Logs de Execução**
- **Turn-by-turn**: Log de cada turno do ReAct
- **Tool Execution**: Resultado de cada ferramenta
- **Error Details**: Classificação e contexto de erros
- **Performance**: Tempos de execução detalhados

### **Health Checks**
```typescript
// Verificação de saúde do sistema
const health = await orchestrator.healthCheck();
// Retorna: status, services, details
```

### **Debug Session**
```typescript
// Análise de sessão específica
const debug = await orchestrator.debugSession(sessionLogs);
// Retorna: summary, issues, recommendations
```

---

## 📝 **CONFIGURAÇÃO E DEPLOYMENT**

### **Variáveis de Ambiente**
- `OPENAI_API_KEY` - Chave da OpenAI
- `TENANT_ID` - ID do tenant padrão
- `WHATSAPP_ACCESS_TOKEN` - Token do WhatsApp Business API
- `WHATSAPP_PHONE_NUMBER_ID` - ID do número WhatsApp

### **Configuração Visual**
- **Dashboard**: `/dashboard/settings` para configurar WhatsApp
- **Wizard**: Setup interativo com validação
- **Testing**: Teste de conectividade integrado

---

## 🎖️ **STATUS ENTERPRISE-GRADE**

### **Qualidade A+**
- ✅ **Code Patterns**: TypeScript + MUI best practices
- ✅ **Firebase Integration**: 100% real data, zero mocks
- ✅ **Component Architecture**: Atomic Design robusta
- ✅ **AI Agent**: Enterprise GPT-4 com 26+ funções
- ✅ **WhatsApp Integration**: Dual-mode (Business API + Web)
- ✅ **Security**: Input sanitization, rate limiting, validation
- ✅ **Performance**: Cache, timeout protection, circuit breaker
- ✅ **Multi-tenant**: Isolamento completo de dados

### **Capacidades Profissionais**
- **Error Recovery**: Retry automático e fallbacks
- **Quality Metrics**: Confidence scoring e analytics
- **Debug Tools**: Análise detalhada de sessões
- **Health Monitoring**: Status de sistema em tempo real
- **Cost Control**: Controle de gastos OpenAI
- **Multi-channel**: WhatsApp + Mini-sites integrados

---

## 📊 **CONCLUSÃO**

O agente de IA Sofia representa uma solução **enterprise-grade completa** para o setor imobiliário, combinando:

- **IA Avançada**: GPT-4 com ReAct loop e 26 funções especializadas
- **Robustez**: Rate limiting, validação, cache e métricas
- **Escalabilidade**: Multi-tenant com isolamento completo
- **Performance**: Otimizações anti-loop e timeouts inteligentes
- **Segurança**: Sanitização, autenticação e auditoria
- **Monitoramento**: Métricas de qualidade e debug avançado

**Status**: ✅ **PRODUÇÃO READY** - Sistema testado e otimizado para alto volume de transações imobiliárias.

---

*Dossiê gerado em: Janeiro 2025*  
*Versão do Sistema: Next.js 15.3.5 + OpenAI 4.20.0*  
*Status: Enterprise-Grade Production Ready*