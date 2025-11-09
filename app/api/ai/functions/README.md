# 🚀 API Functions - Guia Completo para N8N

## 📋 Visão Geral

Este diretório contém todas as funções CRUD disponíveis para o N8N chamar. Cada função é um endpoint independente que executa uma operação específica no sistema.

**Base URL**: `https://seu-dominio.com/api/ai/functions`
**Método**: `POST` para todas as funções (exceto health checks)
**Autenticação**: Não requerida (chamadas internas)
**Content-Type**: `application/json`

## 📑 Índice de Functions

### 🏠 **1. PROPRIEDADES** (3 functions)
- `search-properties` - Busca propriedades com filtros
- `get-property-details` - Obtém detalhes completos
- `send-property-media` - Envia mídia via WhatsApp

### 💰 **2. PREÇOS E DISPONIBILIDADE** (2 functions)
- `calculate-price` - Calcula preço com descontos
- `check-availability` - Verifica disponibilidade

### 📋 **3. RESERVAS** (3 functions)
- `create-reservation` - Cria nova reserva
- `cancel-reservation` - Cancela reserva
- `modify-reservation` - Modifica reserva existente

### 👤 **4. CLIENTES E LEADS** (5 functions)
- `register-client` - Registra/atualiza cliente
- `create-lead` - Cria novo lead no CRM
- `update-lead` - Atualiza informações do lead
- `classify-lead` - Classifica lead (quente/morno/frio)
- `update-lead-status` - Move lead no pipeline

### 🏠 **5. VISITAS** (2 functions)
- `schedule-visit` - Agenda visita à propriedade
- `check-visit-availability` - Verifica horários disponíveis

### 💳 **6. TRANSAÇÕES E PAGAMENTOS** (2 functions)
- `create-transaction` - Registra transação financeira
- `generate-quote` - Gera orçamento detalhado

### 📜 **7. POLÍTICAS E CONFIGURAÇÕES** (4 functions) ⭐
- `get-policies` - Obtém políticas gerais
- `get-negotiation-settings` - Configurações de negociação ⭐ NOVO
- `get-cancellation-policies` - Políticas de cancelamento ⭐ NOVO
- `get-company-address` - Endereço da imobiliária ⭐ NOVO

### 🎯 **8. METAS E ANÁLISES** (5 functions)
- `create-goal` - Cria meta de negócio
- `update-goal-progress` - Atualiza progresso
- `analyze-performance` - Analisa performance
- `track-metrics` - Registra métricas
- `generate-report` - Gera relatórios

### ✅ **9. TAREFAS** (2 functions)
- `create-task` - Cria nova tarefa
- `update-task` - Atualiza tarefa existente

### 🔔 **10. NOTIFICAÇÕES** (1 function)
- `post-notification` - Cliente quer falar com humano (ULTRA SIMPLIFICADO)

**TOTAL: 48+ Functions Disponíveis**

---

## 📊 **1. PROPRIEDADES**

### 🔍 **search-properties**
Busca propriedades com filtros diversos.

**Endpoint**: `POST /api/ai/functions/search-properties`

```json
{
  "tenantId": "seu-tenant-id",
  "location": "Praia Grande",
  "bedrooms": 2,
  "bathrooms": 1,
  "minPrice": 1000,
  "maxPrice": 5000,
  "hasPool": true,
  "petFriendly": false,
  "propertyType": "apartamento",
  "maxGuests": 4
}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "id": "prop-123",
        "name": "Apartamento Vista Mar",
        "location": "Praia Grande, SP",
        "bedrooms": 2,
        "bathrooms": 1,
        "price": 3500,
        "maxGuests": 4,
        "amenities": ["wifi", "pool", "parking"],
        "photos": ["url1", "url2"]
      }
    ],
    "total": 1,
    "filters": {...}
  }
}
```

### 🏠 **get-property-details**
Obtém detalhes completos de uma propriedade específica.

**Endpoint**: `POST /api/ai/functions/get-property-details`

```json
{
  "tenantId": "seu-tenant-id",
  "propertyId": "prop-123"
}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "id": "prop-123",
    "name": "Apartamento Vista Mar",
    "description": "Lindo apartamento...",
    "location": "Praia Grande, SP",
    "bedrooms": 2,
    "bathrooms": 1,
    "maxGuests": 4,
    "basePrice": 3500,
    "amenities": ["wifi", "pool", "parking"],
    "photos": ["url1", "url2"],
    "videos": ["url1"],
    "policies": {...},
    "availability": {...}
  }
}
```

### 📸 **send-property-media**
Envia mídia (fotos/vídeos) de uma propriedade via WhatsApp.

**Endpoint**: `POST /api/ai/functions/send-property-media`

```json
{
  "tenantId": "seu-tenant-id",
  "propertyId": "prop-123",
  "clientPhone": "5511999999999",
  "mediaType": "photos",
  "maxItems": 5,
  "includeDescription": true
}
```

## 💰 **2. PREÇOS E DISPONIBILIDADE**

### 💰 **calculate-price**
Calcula preço para um período específico.

**Endpoint**: `POST /api/ai/functions/calculate-price`

```json
{
  "tenantId": "seu-tenant-id",
  "propertyId": "prop-123",
  "checkIn": "2024-03-01",
  "checkOut": "2024-03-05",
  "guests": 2,
  "couponCode": "DESCONTO10"
}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "total": 14000,
    "basePrice": 12000,
    "taxes": 1200,
    "fees": 800,
    "discounts": 0,
    "currency": "BRL",
    "breakdown": {
      "dailyRate": 3500,
      "nights": 4,
      "cleaningFee": 200,
      "serviceFee": 600,
      "taxRate": 0.1
    }
  }
}
```

### 📅 **check-availability**
Verifica disponibilidade de uma propriedade para período específico.

**Endpoint**: `POST /api/ai/functions/check-availability`

```json
{
  "tenantId": "seu-tenant-id",
  "propertyId": "prop-123",
  "checkIn": "2024-03-01",
  "checkOut": "2024-03-05",
  "guests": 2
}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "available": true,
    "propertyId": "prop-123",
    "checkIn": "2024-03-01",
    "checkOut": "2024-03-05",
    "conflictingReservations": [],
    "suggestedAlternatives": [],
    "maxGuests": 4,
    "minStay": 2
  }
}
```

## 📋 **3. RESERVAS**

### 📅 **create-reservation**
Cria uma nova reserva.

**Endpoint**: `POST /api/ai/functions/create-reservation`

```json
{
  "tenantId": "seu-tenant-id",
  "propertyId": "prop-123",
  "clientPhone": "5511999999999",
  "clientName": "João Silva",
  "checkIn": "2024-03-01",
  "checkOut": "2024-03-05",
  "guests": 2,
  "totalPrice": 14000,
  "paymentMethod": "pix",
  "specialRequests": "Check-in tardio"
}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "reservationId": "res-456",
    "status": "confirmed",
    "propertyId": "prop-123",
    "propertyName": "Apartamento Vista Mar",
    "clientId": "cli-789",
    "checkIn": "2024-03-01",
    "checkOut": "2024-03-05",
    "totalPrice": 14000,
    "confirmationCode": "ABC123"
  }
}
```

### 🚫 **cancel-reservation**
Cancela uma reserva existente.

**Endpoint**: `POST /api/ai/functions/cancel-reservation`

```json
{
  "tenantId": "seu-tenant-id",
  "reservationId": "res-456",
  "reason": "Cliente cancelou",
  "refundAmount": 12000,
  "notifyClient": true
}
```

### 🔄 **modify-reservation**
Modifica uma reserva existente (datas, hóspedes, etc.).

**Endpoint**: `POST /api/ai/functions/modify-reservation`

```json
{
  "tenantId": "seu-tenant-id",
  "reservationId": "res-456",
  "newCheckIn": "2024-03-02",
  "newCheckOut": "2024-03-06",
  "newGuests": 3,
  "reason": "Cliente solicitou mudança"
}
```

## 👤 **4. CLIENTES E LEADS**

### 👤 **register-client**
Registra um novo cliente ou atualiza existente.

**Endpoint**: `POST /api/ai/functions/register-client`

```json
{
  "tenantId": "seu-tenant-id",
  "phone": "5511999999999",
  "name": "João Silva",
  "email": "joao@email.com",
  "cpf": "12345678901",
  "address": {
    "street": "Rua das Flores, 123",
    "city": "São Paulo",
    "state": "SP",
    "zipCode": "01234-567"
  },
  "source": "whatsapp"
}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "clientId": "cli-789",
    "phone": "5511999999999",
    "name": "João Silva",
    "email": "joao@email.com",
    "isNew": true,
    "registrationDate": "2024-01-01T10:00:00Z"
  }
}
```

### 🆕 **create-lead**
Cria um novo lead no CRM.

**Endpoint**: `POST /api/ai/functions/create-lead`

```json
{
  "tenantId": "seu-tenant-id",
  "clientPhone": "5511999999999",
  "source": "whatsapp",
  "campaign": "facebook-ads",
  "interest": "apartamento-praia",
  "budget": 5000,
  "priority": "high"
}
```

### 🔄 **update-lead**
Atualiza informações de um lead.

**Endpoint**: `POST /api/ai/functions/update-lead`

```json
{
  "tenantId": "seu-tenant-id",
  "leadId": "lead-123",
  "status": "qualified",
  "notes": "Cliente interessado em reserva para março",
  "score": 85,
  "nextFollowUp": "2024-02-01T14:00:00Z"
}
```

### 🎯 **classify-lead**
Classifica um lead automaticamente (quente/morno/frio).

**Endpoint**: `POST /api/ai/functions/classify-lead`

```json
{
  "tenantId": "seu-tenant-id",
  "leadId": "lead-123",
  "conversationContext": {
    "messageCount": 5,
    "hasShownInterest": true,
    "hasBudget": true,
    "responseTime": "fast"
  }
}
```

### 🔄 **update-lead-status**
Atualiza status de um lead no pipeline.

**Endpoint**: `POST /api/ai/functions/update-lead-status`

```json
{
  "tenantId": "seu-tenant-id",
  "leadId": "lead-123",
  "newStatus": "converted",
  "reason": "Reserva criada",
  "reservationId": "res-456"
}
```

## 🏠 **5. VISITAS**

### 🗓️ **schedule-visit**
Agenda uma visita à propriedade.

**Endpoint**: `POST /api/ai/functions/schedule-visit`

```json
{
  "tenantId": "seu-tenant-id",
  "propertyId": "prop-123",
  "clientPhone": "5511999999999",
  "preferredDate": "2024-02-15",
  "preferredTime": "14:00",
  "visitType": "presencial",
  "notes": "Cliente quer ver a vista do apartamento"
}
```

### 📅 **check-visit-availability**
Verifica horários disponíveis para visitas.

**Endpoint**: `POST /api/ai/functions/check-visit-availability`

```json
{
  "tenantId": "seu-tenant-id",
  "propertyId": "prop-123",
  "date": "2024-02-15",
  "timeSlots": ["09:00", "14:00", "16:00"]
}
```

## 💳 **6. TRANSAÇÕES E PAGAMENTOS**

### 💳 **create-transaction**
Cria uma transação financeira.

**Endpoint**: `POST /api/ai/functions/create-transaction`

```json
{
  "tenantId": "seu-tenant-id",
  "reservationId": "res-456",
  "clientId": "cli-789",
  "amount": 14000,
  "type": "payment",
  "method": "pix",
  "description": "Pagamento reserva - Apartamento Vista Mar",
  "dueDate": "2024-02-01"
}
```

### 📋 **generate-quote**
Gera um orçamento detalhado.

**Endpoint**: `POST /api/ai/functions/generate-quote`

```json
{
  "tenantId": "seu-tenant-id",
  "propertyId": "prop-123",
  "checkIn": "2024-03-01",
  "checkOut": "2024-03-05",
  "guests": 2,
  "clientPhone": "5511999999999",
  "includeExtras": true
}
```

## 📜 **7. POLÍTICAS E CONFIGURAÇÕES**

### 📜 **get-policies**
Obtém políticas da propriedade ou tenant.

**Endpoint**: `POST /api/ai/functions/get-policies`

```json
{
  "tenantId": "seu-tenant-id",
  "propertyId": "prop-123",
  "policyType": "cancellation"
}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "cancellationPolicy": {
      "type": "moderate",
      "description": "Cancelamento gratuito até 7 dias antes...",
      "rules": [
        {
          "period": "7+ dias antes",
          "refund": 100
        },
        {
          "period": "3-6 dias antes",
          "refund": 50
        }
      ]
    },
    "checkInPolicy": {...},
    "houseRules": [...]
  }
}
```

### ⚙️ **get-negotiation-settings** ⭐ NOVO
Obtém configurações de negociação do tenant (descontos, parcelamento, limites).

**Endpoint**: `POST /api/ai/functions/get-negotiation-settings`

```json
{
  "tenantId": "seu-tenant-id"
}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "settings": {
      "allowAINegotiation": true,
      "pixDiscountEnabled": true,
      "pixDiscountPercentage": 5,
      "cashDiscountEnabled": true,
      "cashDiscountPercentage": 3,
      "installmentEnabled": true,
      "maxInstallments": 10,
      "minInstallmentValue": 100,
      "extendedStayDiscountEnabled": true,
      "extendedStayRules": [
        {
          "minNights": 7,
          "discountPercentage": 10,
          "description": "10% off para 7+ noites"
        }
      ],
      "bookNowDiscountEnabled": false,
      "bookNowDiscountPercentage": 5,
      "bookNowTimeLimit": 2,
      "maxDiscountPercentage": 25,
      "minPriceAfterDiscount": 500,
      "allowSuggestAlternatives": true,
      "upsellEnabled": true
    },
    "isDefault": false
  },
  "meta": {
    "requestId": "get_negotiation_1234...",
    "processingTime": 45,
    "timestamp": "2025-11-08T..."
  }
}
```

**Quando usar:**
- Antes de calcular preços com desconto
- Para informar cliente sobre opções de pagamento
- Para validar se pode oferecer parcelamento
- Para verificar limites de desconto permitidos

### 🚫 **get-cancellation-policies** ⭐ NOVO
Obtém políticas de cancelamento formatadas para a IA.

**Endpoint**: `POST /api/ai/functions/get-cancellation-policies`

```json
{
  "tenantId": "seu-tenant-id"
}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "policies": [
      {
        "id": "default-flexible",
        "name": "Política Flexível",
        "description": "Cancelamento gratuito até 7 dias antes do check-in",
        "rules": [
          {
            "daysBeforeCheckIn": 7,
            "refundPercentage": 100,
            "description": "Reembolso total para cancelamentos com 7+ dias de antecedência"
          },
          {
            "daysBeforeCheckIn": 3,
            "refundPercentage": 50,
            "description": "Reembolso de 50% para cancelamentos entre 3-7 dias"
          },
          {
            "daysBeforeCheckIn": 0,
            "refundPercentage": 0,
            "description": "Sem reembolso para cancelamentos com menos de 3 dias"
          }
        ],
        "isDefault": true
      }
    ],
    "hasCustomPolicies": true,
    "defaultPolicy": {...}
  },
  "meta": {
    "requestId": "get_policies_1234...",
    "processingTime": 32,
    "timestamp": "2025-11-08T..."
  }
}
```

**Quando usar:**
- Cliente pergunta sobre cancelamento
- Antes de criar reserva (informar política)
- Ao processar solicitação de cancelamento
- Para explicar regras de reembolso

### 🏢 **get-company-address** ⭐ NOVO
Obtém endereço e informações de contato da imobiliária.

**Endpoint**: `POST /api/ai/functions/get-company-address`

```json
{
  "tenantId": "seu-tenant-id"
}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "address": {
      "companyName": "Imóveis Premium Ltda",
      "street": "Rua das Flores",
      "number": "123",
      "complement": "Sala 456",
      "neighborhood": "Jardins",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01234-567",
      "country": "Brasil",
      "phone": "+5511999999999",
      "email": "contato@imoveis.com.br",
      "website": "https://imoveis.com.br",
      "workingHours": "Segunda a Sexta: 9h às 18h",
      "googleMapsUrl": "https://maps.google.com/...",
      "latitude": -23.550520,
      "longitude": -46.633308
    },
    "hasAddress": true,
    "formattedAddress": "Imóveis Premium Ltda, Rua das Flores, 123 - Sala 456, Jardins, São Paulo - SP, CEP: 01234-567, Tel: +5511999999999, Email: contato@imoveis.com.br, Horário: Segunda a Sexta: 9h às 18h"
  },
  "meta": {
    "requestId": "get_address_1234...",
    "processingTime": 28,
    "timestamp": "2025-11-08T..."
  }
}
```

**Quando usar:**
- Cliente pergunta onde fica a empresa
- Para fornecer informações de contato
- Ao agendar visita presencial no escritório
- Para enviar localização no WhatsApp
- Em assinaturas de emails/mensagens

## 🎯 **8. METAS E ANÁLISES**

### 🎯 **create-goal**
Cria uma nova meta de negócio.

**Endpoint**: `POST /api/ai/functions/create-goal`

```json
{
  "tenantId": "seu-tenant-id",
  "title": "Meta de Reservas - Março",
  "type": "reservations",
  "target": 50,
  "period": "monthly",
  "startDate": "2024-03-01",
  "endDate": "2024-03-31"
}
```

### 📈 **update-goal-progress**
Atualiza progresso de uma meta.

**Endpoint**: `POST /api/ai/functions/update-goal-progress`

```json
{
  "tenantId": "seu-tenant-id",
  "goalId": "goal-123",
  "currentValue": 25,
  "notes": "Meta 50% atingida"
}
```

### 📊 **analyze-performance**
Analisa performance do negócio.

**Endpoint**: `POST /api/ai/functions/analyze-performance`

```json
{
  "tenantId": "seu-tenant-id",
  "period": "monthly",
  "year": 2024,
  "month": 3,
  "metrics": ["reservations", "revenue", "occupancy"]
}
```

### 📈 **track-metrics**
Registra métricas específicas.

**Endpoint**: `POST /api/ai/functions/track-metrics`

```json
{
  "tenantId": "seu-tenant-id",
  "eventType": "reservation_created",
  "eventData": {
    "reservationId": "res-456",
    "amount": 14000,
    "source": "whatsapp"
  },
  "timestamp": "2024-01-01T10:00:00Z"
}
```

### 📊 **generate-report**
Gera relatório detalhado.

**Endpoint**: `POST /api/ai/functions/generate-report`

```json
{
  "tenantId": "seu-tenant-id",
  "reportType": "monthly_summary",
  "period": {
    "startDate": "2024-03-01",
    "endDate": "2024-03-31"
  },
  "includeCharts": true,
  "format": "pdf"
}
```

## ✅ **9. TAREFAS**

### ✅ **create-task**
Cria uma nova tarefa.

**Endpoint**: `POST /api/ai/functions/create-task`

```json
{
  "tenantId": "seu-tenant-id",
  "title": "Ligar para cliente João",
  "description": "Confirmar detalhes da reserva",
  "priority": "high",
  "dueDate": "2024-02-01T15:00:00Z",
  "assignedTo": "user-123",
  "relatedTo": {
    "type": "reservation",
    "id": "res-456"
  }
}
```

### ✏️ **update-task**
Atualiza uma tarefa existente.

**Endpoint**: `POST /api/ai/functions/update-task`

```json
{
  "tenantId": "seu-tenant-id",
  "taskId": "task-789",
  "status": "completed",
  "notes": "Cliente confirmou todos os detalhes",
  "completedAt": "2024-01-01T16:00:00Z"
}
```

## 🔔 **10. NOTIFICAÇÕES**

### 🙋 **post-notification** ⭐ ULTRA SIMPLIFICADO
Notifica admin quando cliente quer falar com humano.

**SIMPLIFICAÇÃO**: Apenas 2 campos obrigatórios! Mensagem é sempre fixa.

**Endpoint**: `POST /api/ai/functions/post-notification`

```json
{
  "tenantId": "seu-tenant-id",
  "clientPhone": "+5511999999999"
}
```

**Resposta**:
```json
{
  "success": true,
  "data": {
    "notificationId": "notif-abc123",
    "message": "Notification sent successfully"
  },
  "meta": {
    "requestId": "notification_1234...",
    "processingTime": 45,
    "timestamp": "2025-11-08T..."
  }
}
```

**Mensagem gerada automaticamente:**
```
Título: 🙋 Cliente Solicita Atendimento Humano
Mensagem: Cliente de número +5511999999999 quer falar com um humano
```

**Características:**
- ✅ **Ultra simples**: Apenas tenantId e clientPhone
- ✅ **Mensagem fixa**: "Cliente de número X quer falar com um humano"
- ✅ **Prioridade alta**: Sempre HIGH
- ✅ **Ação rápida**: Botão "Ver Conversas" para /dashboard/conversas
- ✅ **Broadcast**: Notifica todos os admins do tenant
- ✅ **Performance**: ~45ms, 1 write no Firestore

**Quando usar:**
- Cliente solicita atendimento humano
- Cliente pergunta "quero falar com atendente"
- Sofia AI detecta frustração ou necessidade de escalação
- Cliente pede para falar com gerente/dono

**Exemplo N8N:**
```javascript
// Detectar solicitação de humano
if (messageText.includes('falar com humano') ||
    messageText.includes('atendente') ||
    messageText.includes('pessoa real')) {

  // Chamar API simplificada
  await httpRequest('post-notification', {
    tenantId: tenantId,
    clientPhone: clientPhone
  });
}
```

## 🔧 **CONFIGURAÇÃO NO N8N**

### Headers Obrigatórios
```json
{
  "Content-Type": "application/json",
  "x-source": "n8n"
}
```

### Template Base para HTTP Request
```json
{
  "method": "POST",
  "url": "https://seu-dominio.com/api/ai/functions/NOME-DA-FUNCAO",
  "headers": {
    "Content-Type": "application/json",
    "x-source": "n8n",
    "User-Agent": "N8N-Workflow/1.0"
  },
  "body": {
    "tenantId": "{{ $json.tenantId }}",
    "param1": "{{ $json.param1 }}",
    "param2": "{{ $json.param2 }}"
  }
}
```

### Tratamento de Resposta no N8N
```javascript
// Verificar se foi sucesso
if (!$input.all()[0].json.success) {
  throw new Error('Função falhou: ' + $input.all()[0].json.error);
}

// Usar os dados
const result = $input.all()[0].json.data;
const requestId = $input.all()[0].json.meta.requestId;
```

## 📊 **MONITORAMENTO E LOGS**

### Logs Estruturados
Todas as funções agora geram logs detalhados:

```bash
# Ver execuções de uma função específica
grep "SEARCH-PROPERTIES" logs/app.log

# Ver todas as execuções
grep "🔍\|📅\|💰\|👤\|🆕\|🎯" logs/app.log

# Ver erros
grep "❌.*Falha na execução" logs/app.log

# Rastrear por requestId
grep "search_1703123456_abc123" logs/app.log
```

### Teste Rápido
```bash
# Testar todas as funções
curl -X POST http://localhost:3000/api/test/functions \
  -H "Content-Type: application/json" \
  -d '{"testAll": true}'
```

## ⚠️ **OBSERVAÇÕES IMPORTANTES**

1. **TenantId Obrigatório**: Todas as funções requerem `tenantId` no body
2. **Logs Detalhados**: Cada requisição gera logs com requestId único
3. **Tratamento de Erros**: Sempre verificar `success: true/false`
4. **Rate Limiting**: Não implementado ainda, mas use com moderação
5. **Dados Sensíveis**: Telefones e emails são mascarados nos logs
6. **Desenvolvimento vs Produção**: Detalhes de erro só aparecem em dev

## 🆕 **NOVAS FUNCTIONS (2025-11-08)**

### ⭐ **3 Novas APIs para Configurações**

As seguintes functions foram adicionadas para melhorar a capacidade da IA Sofia de fornecer informações precisas:

1. **get-negotiation-settings**
   - **Propósito**: Obter regras de desconto, parcelamento e limites
   - **Uso típico**: Antes de calcular preços ou oferecer condições
   - **Performance**: ~40ms, 1 read do Firestore
   - **Fallback**: Retorna configurações padrão se não configurado

2. **get-cancellation-policies**
   - **Propósito**: Obter políticas de cancelamento formatadas
   - **Uso típico**: Explicar regras de reembolso ao cliente
   - **Performance**: ~30ms, 1 read do Firestore
   - **Fallback**: Política flexível padrão (7/3/0 dias)

3. **get-company-address**
   - **Propósito**: Obter endereço, telefone, horário da imobiliária
   - **Uso típico**: Cliente pergunta onde fica, contato, horários
   - **Performance**: ~30ms, 1 read do Firestore
   - **Formato**: Retorna `formattedAddress` pronto para IA usar

**Estrutura Firestore:**
```
tenants/{tenantId}/settings/
  ├─ negotiation (document)
  ├─ cancellationPolicies (document)
  └─ companyAddress (document)
```

**Exemplo de uso em conjunto:**
```javascript
// N8N - Buscar todas as configurações antes de responder
const [negotiation, policies, address] = await Promise.all([
  httpRequest('get-negotiation-settings', { tenantId }),
  httpRequest('get-cancellation-policies', { tenantId }),
  httpRequest('get-company-address', { tenantId })
]);

// Usar nas respostas
const canDiscount = negotiation.data.settings.allowAINegotiation;
const cancelRules = policies.data.defaultPolicy.rules;
const location = address.data.formattedAddress;
```

## 📋 **CHECKLIST PARA N8N**

- [ ] Configurar headers corretos (`x-source: n8n`)
- [ ] Sempre incluir `tenantId` no body
- [ ] Verificar `success` na resposta
- [ ] Tratar erros adequadamente
- [ ] Usar `requestId` para debug quando necessário
- [ ] Logar chamadas importantes no N8N
- [ ] Testar cada função individualmente antes de usar no workflow
- [ ] ⭐ Usar novas functions de configurações para respostas mais precisas
- [ ] ⭐ Cachear configurações no N8N para reduzir chamadas

## 🎯 **RESUMO RÁPIDO**

**Total de Functions**: 48+
**Categorias**: 10
**Novas (Nov 2025)**: 3 (configurações)
**Latência média**: 30-100ms
**Custo por call**: 1-3 reads Firestore
**Fallbacks**: Todas têm valores padrão
**Health Checks**: GET em todas as rotas

**Mais usadas:**
1. `search-properties` (busca)
2. `calculate-price` (preços)
3. `create-reservation` (conversão)
4. `get-negotiation-settings` ⭐ (novo - configurações)
5. `post-notification` (alertas)