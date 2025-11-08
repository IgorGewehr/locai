# Sistema de Notificações - Documentação Completa

## 📋 Visão Geral

Sistema robusto de notificações multi-tenant com suporte a tempo real, múltiplos canais de entrega e gerenciamento completo de preferências.

## 🏗️ Arquitetura

### Camadas do Sistema

```
┌─────────────────────────────────────────────────┐
│              Frontend (UI Layer)                │
│  ┌──────────────┐      ┌──────────────────┐    │
│  │NotificationBell│      │NotificationPage│     │
│  └──────────────┘      └──────────────────┘    │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│           Custom Hooks Layer                    │
│         ┌──────────────────────┐                │
│         │ useNotifications()   │                │
│         └──────────────────────┘                │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│              API Layer (REST)                   │
│  GET    /api/notifications                      │
│  POST   /api/notifications                      │
│  PATCH  /api/notifications/[id]                 │
│  DELETE /api/notifications/[id]                 │
│  POST   /api/notifications/mark-all-read        │
│  GET/PUT /api/notifications/preferences         │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│           Service Layer                         │
│    ┌────────────────────────────┐               │
│    │ NotificationService        │               │
│    │ NotificationServiceFactory │               │
│    └────────────────────────────┘               │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│         Database (Firestore)                    │
│  tenants/{tenantId}/notifications/              │
│  tenants/{tenantId}/notificationPreferences/    │
└─────────────────────────────────────────────────┘
```

## 📁 Estrutura de Arquivos

```
/lib
  /types
    notification.ts              # Tipos TypeScript completos
  /services
    notification-service.ts      # Serviço principal de notificações
  /hooks
    useNotifications.ts          # Custom hook React
  /utils
    notification-triggers.ts     # Funções auxiliares para criar notificações

/components
  /molecules
    /notifications
      NotificationBell.tsx       # Componente sino de notificações

/app
  /api
    /notifications
      route.ts                   # GET/POST notificações
      /[id]
        route.ts                 # PATCH/DELETE notificação específica
      /mark-all-read
        route.ts                 # POST marcar todas como lidas
      /preferences
        route.ts                 # GET/PUT preferências
      /agenda-event
        route.ts                 # POST criar notificação de evento

  /dashboard
    /notifications
      page.tsx                   # Página completa de gerenciamento
```

## 🔧 Componentes Principais

### 1. NotificationBell

**Localização**: `components/molecules/notifications/NotificationBell.tsx`

Componente de sino de notificações para o header com:
- Badge de contagem não lidas
- Menu dropdown com lista de notificações
- Animações para novas notificações
- Ações inline (marcar lida, deletar, expandir)
- Responsivo (mobile/desktop)

**Uso:**
```tsx
<NotificationBell
  size="medium"              // small | medium | large
  maxNotifications={15}      // Limite de notificações exibidas
  showCount={true}          // Mostrar badge de contagem
/>
```

**Recursos:**
- ✅ Real-time updates via Firestore onSnapshot
- ✅ Detecção automática de novas notificações
- ✅ Animação de "pulse" para novas notificações
- ✅ Expansão de detalhes inline
- ✅ Ações rápidas (marcar lida/deletar)

### 2. useNotifications Hook

**Localização**: `lib/hooks/useNotifications.ts`

Hook customizado para gerenciar notificações com estado e ações.

**Uso:**
```tsx
const {
  notifications,      // Lista de notificações
  unreadCount,       // Contador de não lidas
  loading,           // Estado de carregamento
  error,             // Erro se houver
  markAsRead,        // Função para marcar como lida
  markAllAsRead,     // Função para marcar todas como lidas
  deleteNotification, // Função para deletar
  refresh            // Função para recarregar manualmente
} = useNotifications({
  unreadOnly: false,  // Filtrar apenas não lidas
  limit: 20,         // Limite de notificações
  type: undefined,   // Filtrar por tipo específico
  autoSubscribe: true // Habilitar real-time updates
})
```

**Recursos:**
- ✅ Gerenciamento de estado automático
- ✅ Real-time subscriptions opcionais
- ✅ Cache e otimização de queries
- ✅ Error handling integrado
- ✅ Type-safe

### 3. NotificationService

**Localização**: `lib/services/notification-service.ts`

Serviço principal para todas operações de notificações.

**Métodos principais:**

```typescript
// Criar notificação genérica
await notificationService.createNotification({
  targetUserId: 'user123',
  type: NotificationType.RESERVATION_CREATED,
  title: 'Nova Reserva',
  message: 'Você tem uma nova reserva...',
  entityType: 'reservation',
  entityId: 'res123',
  priority: NotificationPriority.HIGH,
  channels: [NotificationChannel.DASHBOARD, NotificationChannel.EMAIL]
})

// Criar notificação de evento de agenda
await notificationService.createAgendaEventNotification({
  targetUserId: 'user123',
  eventId: 'evt123',
  eventTitle: 'Reunião com cliente',
  eventDate: new Date('2025-11-10T14:00:00')
})

// Criar notificação de resposta de ticket
await notificationService.createTicketResponseNotification({
  targetUserId: 'user123',
  ticketId: 'ticket123',
  ticketTitle: 'Problema no sistema',
  respondedBy: 'Suporte',
  responsePreview: 'Estamos analisando...'
})

// Buscar notificações
const notifications = await notificationService.getUserNotifications(
  'user123',
  { unreadOnly: true, limit: 10 }
)

// Marcar como lida
await notificationService.markAsRead('notif123')

// Marcar todas como lidas
await notificationService.markAllAsRead('user123')

// Deletar notificação
await notificationService.deleteNotification('notif123')

// Subscription em tempo real
const unsubscribe = notificationService.subscribeToNotifications(
  'user123',
  (notifications) => {
    console.log('Notificações atualizadas:', notifications)
  },
  { unreadOnly: false, limit: 20 }
)
```

## 🌐 API Endpoints

### GET /api/notifications

Buscar notificações do usuário autenticado.

**Query Parameters:**
- `unreadOnly` (boolean): Filtrar apenas não lidas
- `limit` (number): Limite de resultados (padrão: 20)
- `type` (NotificationType): Filtrar por tipo

**Resposta:**
```json
{
  "success": true,
  "data": {
    "notifications": [...],
    "unreadCount": 5,
    "total": 20
  }
}
```

### POST /api/notifications

Criar nova notificação (admin/sistema).

**Body:**
```json
{
  "targetUserId": "user123",
  "type": "reservation_created",
  "title": "Nova Reserva",
  "message": "Você tem uma nova reserva...",
  "entityType": "reservation",
  "entityId": "res123",
  "priority": "high",
  "channels": ["dashboard", "email"]
}
```

### PATCH /api/notifications/[id]

Marcar notificação como lida.

**Resposta:**
```json
{
  "success": true,
  "message": "Notification marked as read"
}
```

### DELETE /api/notifications/[id]

Deletar notificação.

**Resposta:**
```json
{
  "success": true,
  "message": "Notification deleted"
}
```

### POST /api/notifications/mark-all-read

Marcar todas as notificações como lidas.

**Resposta:**
```json
{
  "success": true,
  "message": "All notifications marked as read"
}
```

### GET/PUT /api/notifications/preferences

Gerenciar preferências de notificação do usuário.

**GET Response:**
```json
{
  "success": true,
  "data": {
    "userId": "user123",
    "email": {
      "enabled": true,
      "address": "user@example.com",
      "frequency": "immediate",
      "types": []
    },
    "dashboard": {
      "enabled": true,
      "types": []
    },
    "quietHours": {
      "enabled": false,
      "start": "22:00",
      "end": "08:00"
    }
  }
}
```

## 📊 Tipos de Notificação

### Agenda
- `AGENDA_EVENT_CREATED` - Evento criado na agenda
- `AGENDA_EVENT_REMINDER` - Lembrete de evento
- `AGENDA_EVENT_UPDATED` - Evento atualizado
- `AGENDA_EVENT_CANCELLED` - Evento cancelado

### Tickets
- `TICKET_RESPONSE_RECEIVED` - Resposta recebida
- `TICKET_STATUS_CHANGED` - Status alterado
- `TICKET_ASSIGNED` - Ticket atribuído

### Reservas
- `RESERVATION_CREATED` - Nova reserva
- `RESERVATION_CHECK_IN_REMINDER` - Lembrete check-in
- `RESERVATION_CHECK_OUT_REMINDER` - Lembrete check-out

### Financeiro
- `PAYMENT_DUE_REMINDER` - Pagamento vencendo
- `PAYMENT_OVERDUE` - Pagamento atrasado
- `PAYMENT_RECEIVED` - Pagamento recebido

### Sistema
- `SYSTEM_ALERT` - Alerta do sistema
- `SYSTEM_MAINTENANCE` - Manutenção

## 🎨 Prioridades

- `LOW` - Baixa (verde)
- `MEDIUM` - Média (azul)
- `HIGH` - Alta (laranja)
- `CRITICAL` - Crítica (vermelho)

## 📡 Canais de Entrega

- `DASHBOARD` - Notificação no painel
- `EMAIL` - Envio por email
- `WHATSAPP` - Mensagem WhatsApp
- `WEBHOOK` - Chamada HTTP webhook

## 🔔 Triggers Automáticos

O sistema possui triggers automáticos em:

### Reservas
```typescript
// app/api/reservations/route.ts
import { triggerReservationCreatedNotification } from '@/lib/utils/notification-triggers'

await triggerReservationCreatedNotification(
  tenantId,
  reservationId,
  {
    propertyName,
    clientName,
    checkIn,
    checkOut,
    totalAmount,
    guests,
    nights
  },
  userId,
  userEmail
)
```

### Pagamentos
```typescript
import { triggerPaymentReceivedNotification } from '@/lib/utils/notification-triggers'

await triggerPaymentReceivedNotification(
  tenantId,
  transactionId,
  {
    amount,
    paymentMethod,
    category,
    description
  },
  userId,
  userEmail
)
```

## 🎯 Integrações

### Header/TopAppBar

Já integrado no TopAppBar:
```tsx
// components/organisms/navigation/TopAppBar.tsx
<NotificationBell
  size="medium"
  maxNotifications={15}
  showCount={true}
/>
```

### N8N Webhook

Endpoint para receber eventos do N8N:
```
POST /api/notifications/agenda-event
```

**Body:**
```json
{
  "tenantId": "tenant123",
  "userId": "user123",
  "eventId": "evt123",
  "eventTitle": "Reunião",
  "eventDate": "2025-11-10T14:00:00Z",
  "eventType": "meeting",
  "source": "n8n"
}
```

## 📱 Página de Gerenciamento

Acesse `/dashboard/notifications` para:
- Visualizar todas as notificações
- Filtrar por lidas/não lidas
- Marcar como lida individualmente
- Marcar todas como lidas
- Deletar notificações
- Ver estatísticas

## 🔐 Segurança

- ✅ Autenticação via Firebase Auth em todas as rotas
- ✅ Isolamento multi-tenant (cada tenant só vê suas notificações)
- ✅ Validação de input com Zod
- ✅ Sanitização de dados
- ✅ Rate limiting
- ✅ PII masking em logs

## ⚡ Performance

- ✅ Real-time updates via Firestore onSnapshot
- ✅ Query optimization com índices
- ✅ Cache de preferências (5min TTL)
- ✅ Batch operations para marcar todas como lidas
- ✅ Limit/offset para paginação
- ✅ Lazy loading de notificações

## 🧪 Testando o Sistema

### 1. Criar notificação via API

```bash
curl -X POST http://localhost:3000/api/notifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "targetUserId": "user123",
    "type": "system_alert",
    "title": "Teste de Notificação",
    "message": "Esta é uma notificação de teste",
    "entityType": "system",
    "entityId": "test-123",
    "priority": "high",
    "channels": ["dashboard"]
  }'
```

### 2. Criar notificação via código

```typescript
import { NotificationServiceFactory } from '@/lib/services/notification-service'
import { NotificationType, NotificationPriority } from '@/lib/types/notification'

const service = NotificationServiceFactory.getInstance(tenantId)

await service.createNotification({
  targetUserId: userId,
  type: NotificationType.SYSTEM_ALERT,
  title: 'Teste',
  message: 'Mensagem de teste',
  entityType: 'system',
  entityId: 'test',
  priority: NotificationPriority.HIGH
})
```

### 3. Verificar no UI

- Abra o dashboard
- Verifique o sino de notificações no header
- Clique para ver a notificação
- Acesse `/dashboard/notifications` para ver a página completa

## 🚀 Próximos Passos

- [ ] Implementar notificações push (PWA)
- [ ] Sistema de templates personalizáveis
- [ ] Analytics de engajamento
- [ ] Agrupamento inteligente de notificações
- [ ] Integração com WhatsApp Business API
- [ ] Scheduler para notificações futuras
- [ ] Digest diário/semanal de notificações

## 📞 Suporte

Para questões técnicas:
- Consulte os logs: `lib/utils/logger.ts`
- Verifique o Firestore: `tenants/{tenantId}/notifications`
- Debug mode: Set `NODE_ENV=development`

---

**Sistema desenvolvido com Next.js 15, TypeScript, Material-UI e Firebase**
