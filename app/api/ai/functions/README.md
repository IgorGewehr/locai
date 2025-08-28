# 🚀 API Functions - Guia Completo para N8N

## 📋 Visão Geral

Este diretório contém todas as funções CRUD disponíveis para o N8N chamar. Cada função é um endpoint independente que executa uma operação específica no sistema.

**Base URL**: `https://seu-dominio.com/api/ai/functions`
**Método**: `POST` para todas as funções
**Autenticação**: Não requerida (já que são chamadas internas)
**Content-Type**: `application/json`

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

## 📜 **7. POLÍTICAS E INFORMAÇÕES**

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

## 📋 **CHECKLIST PARA N8N**

- [ ] Configurar headers corretos (`x-source: n8n`)
- [ ] Sempre incluir `tenantId` no body
- [ ] Verificar `success` na resposta
- [ ] Tratar erros adequadamente
- [ ] Usar `requestId` para debug quando necessário
- [ ] Logar chamadas importantes no N8N
- [ ] Testar cada função individualmente antes de usar no workflow