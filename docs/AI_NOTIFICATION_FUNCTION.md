# AI Function: post-notification

## 📋 Visão Geral

Função AI dedicada para Sofia Agent enviar notificações ao admin quando um cliente solicita atendimento humano.

## 🎯 Propósito

Permitir que Sofia (AI Agent) notifique automaticamente o admin quando:
- Cliente solicita falar com humano
- Cliente está insatisfeito
- Cliente precisa de assistência especializada
- Situação requer intervenção humana

## 📡 Endpoint

```
POST /api/ai/functions/post-notification
```

## 🔐 Autenticação

Não requer autenticação Firebase (função pública para AI agent).
Valida apenas dados via Zod schema.

## 📝 Request Body

```typescript
{
  // Obrigatórios
  "tenantId": string,          // ID do tenant
  "targetUserId": string,      // ID do admin a ser notificado
  "clientPhone": string,       // Telefone do cliente (formato: +5511999999999)
  "message": string,           // Mensagem descritiva (max 500 chars)

  // Opcionais
  "clientName"?: string,       // Nome do cliente
  "conversationId"?: string,   // ID da conversa no sistema
  "urgency"?: "low" | "medium" | "high" | "critical",  // Default: "high"
  "metadata"?: Record<string, any>  // Dados adicionais
}
```

## ✅ Validation Rules

| Campo | Tipo | Obrigatório | Validação |
|-------|------|-------------|-----------|
| `tenantId` | string | ✅ | Min 1 caractere |
| `targetUserId` | string | ✅ | Min 1 caractere |
| `clientPhone` | string | ✅ | Min 1 caractere |
| `message` | string | ✅ | Min 1, Max 500 caracteres |
| `clientName` | string | ❌ | - |
| `conversationId` | string | ❌ | - |
| `urgency` | enum | ❌ | `low|medium|high|critical` (default: `high`) |
| `metadata` | object | ❌ | Qualquer estrutura JSON |

## 📤 Response

### Success (200)
```json
{
  "success": true,
  "data": {
    "notificationId": "notif_abc123",
    "message": "Notification sent to admin successfully"
  },
  "meta": {
    "requestId": "post_notification_1699999999_a1b2",
    "processingTime": 145,
    "timestamp": "2025-11-07T14:30:00.000Z"
  }
}
```

### Validation Error (400)
```json
{
  "success": false,
  "error": "Validation error",
  "details": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "path": ["tenantId"],
      "message": "TenantId is required"
    }
  ],
  "requestId": "post_notification_1699999999_a1b2"
}
```

### Server Error (500)
```json
{
  "success": false,
  "error": "Failed to post notification",
  "requestId": "post_notification_1699999999_a1b2",
  "details": "Error message (only in development)"
}
```

## 🎨 Notification Details

### Gerada Automaticamente

**Tipo:** `TICKET_ASSIGNED`

**Título:**
- Com nome: `🙋 {clientName} solicita atendimento humano`
- Sem nome: `🙋 Cliente solicita atendimento humano`

**Mensagem:**
```
📞 Telefone: {clientPhone}

{message}
```

**Prioridade:**
- `urgency: "low"` → `NotificationPriority.LOW`
- `urgency: "medium"` → `NotificationPriority.MEDIUM`
- `urgency: "high"` → `NotificationPriority.HIGH` (default)
- `urgency: "critical"` → `NotificationPriority.CRITICAL`

**Canais:** `DASHBOARD` apenas (por padrão)

**Ações (se conversationId fornecido):**
```json
[
  {
    "id": "view_conversation",
    "label": "Ver Conversa",
    "type": "primary",
    "action": "navigate",
    "config": {
      "url": "/dashboard/conversas?id={conversationId}"
    }
  }
]
```

## 🔧 Uso no N8N (Sofia Agent)

### Node HTTP Request

**Configuração:**
```json
{
  "method": "POST",
  "url": "https://yourdomain.com/api/ai/functions/post-notification",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "tenantId": "{{$json.tenantId}}",
    "targetUserId": "{{$json.adminId}}",
    "clientPhone": "{{$json.clientPhone}}",
    "clientName": "{{$json.clientName}}",
    "message": "Cliente solicitou falar com atendente humano durante a conversa sobre {{$json.topic}}",
    "conversationId": "{{$json.conversationId}}",
    "urgency": "high",
    "metadata": {
      "aiContext": "{{$json.context}}",
      "lastMessage": "{{$json.lastMessage}}",
      "timestamp": "{{$now}}"
    }
  }
}
```

### Exemplo de Workflow N8N

```
[Webhook] → [Detectar Intenção] → [IF: Precisa Humano?]
                                       ↓ YES
                                   [HTTP Request: post-notification]
                                       ↓
                                   [Enviar Resposta Cliente]
```

## 💡 Casos de Uso

### 1. Cliente Solicita Atendimento Humano
```json
{
  "tenantId": "tenant_abc",
  "targetUserId": "admin_xyz",
  "clientPhone": "+5511999999999",
  "clientName": "João Silva",
  "message": "Cliente solicitou falar com atendente humano",
  "conversationId": "conv_123",
  "urgency": "high"
}
```

### 2. Cliente Insatisfeito
```json
{
  "tenantId": "tenant_abc",
  "targetUserId": "admin_xyz",
  "clientPhone": "+5511888888888",
  "message": "Cliente demonstrou insatisfação com atendimento. Precisa de intervenção urgente.",
  "urgency": "critical",
  "metadata": {
    "sentiment": "negative",
    "reason": "service_complaint"
  }
}
```

### 3. Dúvida Complexa
```json
{
  "tenantId": "tenant_abc",
  "targetUserId": "admin_xyz",
  "clientPhone": "+5511777777777",
  "clientName": "Maria Santos",
  "message": "Cliente tem dúvida complexa sobre contrato que requer expertise humano",
  "conversationId": "conv_456",
  "urgency": "medium",
  "metadata": {
    "topic": "contract",
    "complexity": "high"
  }
}
```

## 🔍 Logs e Monitoramento

### Logs Gerados

```
[INFO] [POST-NOTIFICATION] Starting AI function execution
  - requestId
  - function: post-notification
  - source: sofia-agent

[INFO] [POST-NOTIFICATION] Creating notification for human assistance
  - requestId
  - tenantId (masked)
  - targetUserId (masked)
  - clientPhone (masked)
  - urgency

[INFO] [POST-NOTIFICATION] Notification created successfully
  - requestId
  - notificationId
  - processingTime
  - tenantId (masked)
  - urgency
```

### Métricas a Monitorar

1. **Taxa de Sucesso**: > 99%
2. **Tempo de Processamento**: < 300ms
3. **Erros de Validação**: < 1%
4. **Volume por Hora**: Alertar se > 100/hora (possível problema)

## 🚨 Troubleshooting

### Erro: "Validation error"
**Causa**: Dados obrigatórios faltando ou inválidos
**Solução**: Verificar todos os campos obrigatórios no payload

### Erro: "Failed to post notification"
**Causa**: Erro no Firestore ou serviço indisponível
**Solução**: Verificar logs, tentar novamente, verificar permissões Firestore

### Notificação não aparece no dashboard
**Causa**: `targetUserId` incorreto ou usuário não autenticado
**Solução**: Verificar se targetUserId corresponde a usuário válido

## 📊 Exemplo Completo

### Request (cURL)
```bash
curl -X POST https://yourdomain.com/api/ai/functions/post-notification \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_demo",
    "targetUserId": "admin_001",
    "clientPhone": "+5511987654321",
    "clientName": "Pedro Oliveira",
    "message": "Cliente solicitou contato urgente sobre reserva cancelada inesperadamente",
    "conversationId": "conv_789",
    "urgency": "critical",
    "metadata": {
      "reservationId": "res_456",
      "issue": "unexpected_cancellation",
      "aiConfidence": 0.95
    }
  }'
```

### Response
```json
{
  "success": true,
  "data": {
    "notificationId": "nYz9mKLp3QxR7sT2vWd8",
    "message": "Notification sent to admin successfully"
  },
  "meta": {
    "requestId": "post_notification_1699999999_x9y2",
    "processingTime": 132,
    "timestamp": "2025-11-07T14:30:00.789Z"
  }
}
```

### Notificação Criada no Firestore
```json
{
  "id": "nYz9mKLp3QxR7sT2vWd8",
  "tenantId": "tenant_demo",
  "targetUserId": "admin_001",
  "type": "ticket_assigned",
  "title": "🙋 Pedro Oliveira solicita atendimento humano",
  "message": "📞 Telefone: +5511987654321\n\nCliente solicitou contato urgente sobre reserva cancelada inesperadamente",
  "entityType": "ticket",
  "entityId": "conv_789",
  "entityData": {
    "clientPhone": "+5511987654321",
    "clientName": "Pedro Oliveira",
    "conversationId": "conv_789",
    "source": "sofia_ai_agent",
    "requestType": "human_assistance",
    "timestamp": "2025-11-07T14:30:00.789Z",
    "reservationId": "res_456",
    "issue": "unexpected_cancellation",
    "aiConfidence": 0.95
  },
  "status": "sent",
  "priority": "critical",
  "channels": ["dashboard"],
  "actions": [
    {
      "id": "view_conversation",
      "label": "Ver Conversa",
      "type": "primary",
      "action": "navigate",
      "config": {
        "url": "/dashboard/conversas?id=conv_789"
      }
    }
  ],
  "metadata": {
    "source": "sofia_ai_agent",
    "triggerEvent": "human_assistance_requested",
    "clientPhone": "+5511987654321",
    "urgency": "critical",
    "conversationId": "conv_789",
    "reservationId": "res_456",
    "issue": "unexpected_cancellation",
    "aiConfidence": 0.95
  },
  "createdAt": "2025-11-07T14:30:00.789Z",
  "sentAt": "2025-11-07T14:30:00.789Z",
  "deliveryStatus": {
    "dashboard": {
      "status": "pending",
      "attempts": 0
    }
  }
}
```

## ✨ Features

- ✅ Validação Zod completa
- ✅ Sanitização de inputs (XSS protection)
- ✅ Logging profissional com requestId
- ✅ Masking de PII nos logs
- ✅ Mensagens contextualizadas automáticas
- ✅ Suporte a urgências customizadas
- ✅ Metadata flexível para contexto adicional
- ✅ Ações de navegação automáticas
- ✅ Health check endpoint (GET)

## 🎯 Integração com Sistema

A função cria notificações que são automaticamente:
1. **Exibidas** no sino de notificações (header)
2. **Listadas** na página `/dashboard/notifications`
3. **Entregues** em tempo real via Firestore onSnapshot
4. **Animadas** com pulse effect para novas notificações
5. **Acionáveis** com botão "Ver Conversa" (se conversationId fornecido)

---

**Função criada especificamente para integração Sofia AI Agent → Admin Dashboard**
