# Arquitetura Firestore - Sistema de Notificações

## 🏗️ Estrutura de Dados Otimizada

### Coleções e Subcoleções

```
firestore
└── tenants/
    └── {tenantId}/
        ├── notifications/                    # Notificações do tenant
        │   └── {notificationId}
        │       ├── id: string
        │       ├── tenantId: string          # Redundante para queries
        │       ├── targetUserId: string      # INDEXED
        │       ├── type: string              # INDEXED
        │       ├── priority: string          # INDEXED
        │       ├── status: string            # INDEXED
        │       ├── readAt: Timestamp | null  # INDEXED (TTL enabled)
        │       ├── createdAt: Timestamp      # INDEXED
        │       ├── expiresAt: Timestamp      # TTL ENABLED
        │       ├── entityType: string
        │       ├── entityId: string
        │       ├── title: string
        │       ├── message: string
        │       ├── channels: string[]
        │       ├── deliveryStatus: map
        │       ├── actions: array
        │       └── metadata: map
        │
        └── notificationPreferences/          # Preferências por usuário
            └── {userId}                      # Document ID = userId
                ├── userId: string
                ├── email: map
                ├── dashboard: map
                ├── whatsapp: map
                ├── quietHours: map
                ├── createdAt: Timestamp
                └── updatedAt: Timestamp
```

## 📊 Índices Compostos (Composite Indexes)

### Índice 1: Busca por Usuário + Status de Leitura + Ordem Cronológica
```javascript
{
  fields: [
    { fieldPath: "targetUserId", order: "ASCENDING" },
    { fieldPath: "readAt", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" }
  ]
}
```
**Uso**: `getUserNotifications({ unreadOnly: true })`

### Índice 2: Busca por Usuário + Tipo + Ordem Cronológica
```javascript
{
  fields: [
    { fieldPath: "targetUserId", order: "ASCENDING" },
    { fieldPath: "type", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" }
  ]
}
```
**Uso**: `getUserNotifications({ type: 'reservation_created' })`

### Índice 3: Busca por Usuário + Prioridade + Ordem Cronológica
```javascript
{
  fields: [
    { fieldPath: "targetUserId", order: "ASCENDING" },
    { fieldPath: "priority", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" }
  ]
}
```
**Uso**: Filtros de prioridade

### Índice 4: Busca por Usuário + Status + Ordem Cronológica
```javascript
{
  fields: [
    { fieldPath: "targetUserId", order: "ASCENDING" },
    { fieldPath: "status", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" }
  ]
}
```
**Uso**: Filtros por status (sent, read, expired, etc.)

### Índice 5: Busca por Entidade
```javascript
{
  fields: [
    { fieldPath: "entityType", order: "ASCENDING" },
    { fieldPath: "entityId", order: "ASCENDING" },
    { fieldPath: "createdAt", order: "DESCENDING" }
  ]
}
```
**Uso**: Buscar todas notificações relacionadas a uma reserva/ticket específico

## ⚡ Otimizações de Performance

### 1. TTL (Time To Live) para Limpeza Automática

```javascript
// Configuração TTL no campo expiresAt
fieldOverrides: [{
  collectionGroup: "notifications",
  fieldPath: "expiresAt",
  ttlConfig: {
    state: "ACTIVE"
  }
}]
```

**Benefícios:**
- Limpeza automática de notificações expiradas
- Reduz custos de storage
- Melhora performance de queries
- Sem necessidade de Cloud Functions para limpeza

**Uso:**
```typescript
// Notificações expiram automaticamente após 30 dias
const expiresAt = new Date()
expiresAt.setDate(expiresAt.getDate() + 30)

await notificationService.createNotification({
  // ... outros campos
  expiresAt
})
```

### 2. Denormalização Estratégica

**Campo `targetUserName` duplicado:**
```typescript
{
  targetUserId: "user123",
  targetUserName: "João Silva"  // Denormalizado para evitar JOIN
}
```

**Benefício**: Exibir nome do usuário sem query adicional.

**Campo `tenantId` duplicado:**
```typescript
{
  tenantId: "tenant123"  // Redundante mas necessário para segurança
}
```

**Benefício**: Security rules mais eficientes.

### 3. Estrutura de deliveryStatus Otimizada

```typescript
deliveryStatus: {
  dashboard: {
    status: 'delivered',
    sentAt: Timestamp,
    attempts: 1
  },
  email: {
    status: 'sent',
    sentAt: Timestamp,
    attempts: 1
  }
}
```

**Benefício**: Single document write, sem subcoleções.

### 4. Actions Array (não subcoleção)

```typescript
actions: [
  {
    id: 'view_reservation',
    label: 'Ver Reserva',
    type: 'primary',
    action: 'navigate',
    config: { url: '/dashboard/reservations/123' }
  }
]
```

**Benefício**: Menos reads, dados sempre disponíveis.

## 🔍 Queries Otimizadas

### Query 1: Notificações não lidas do usuário
```typescript
const q = query(
  collection(db, `tenants/${tenantId}/notifications`),
  where('targetUserId', '==', userId),
  where('readAt', '==', null),
  orderBy('createdAt', 'desc'),
  limit(20)
)
```
**Índice usado**: targetUserId + readAt + createdAt

### Query 2: Notificações por tipo
```typescript
const q = query(
  collection(db, `tenants/${tenantId}/notifications`),
  where('targetUserId', '==', userId),
  where('type', '==', 'reservation_created'),
  orderBy('createdAt', 'desc'),
  limit(20)
)
```
**Índice usado**: targetUserId + type + createdAt

### Query 3: Contagem de não lidas (otimizada)
```typescript
const q = query(
  collection(db, `tenants/${tenantId}/notifications`),
  where('targetUserId', '==', userId),
  where('readAt', '==', null)
)
const snapshot = await getDocs(q)
const count = snapshot.size  // Não itera documentos
```

### Query 4: Real-time subscription (otimizada)
```typescript
const q = query(
  collection(db, `tenants/${tenantId}/notifications`),
  where('targetUserId', '==', userId),
  orderBy('createdAt', 'desc'),
  limit(20)  // SEMPRE use limit em subscriptions
)

const unsubscribe = onSnapshot(q, (snapshot) => {
  // Firestore automatically sends only changes
  snapshot.docChanges().forEach((change) => {
    if (change.type === 'added') {
      // Nova notificação
    } else if (change.type === 'modified') {
      // Notificação atualizada (ex: marcada como lida)
    } else if (change.type === 'removed') {
      // Notificação deletada
    }
  })
})
```

## 🔐 Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Função helper para verificar tenant
    function isTenantMember(tenantId) {
      return request.auth != null &&
             request.auth.token.tenantId == tenantId;
    }

    // Notificações
    match /tenants/{tenantId}/notifications/{notificationId} {
      // Leitura: apenas o destinatário
      allow read: if isTenantMember(tenantId) &&
                     resource.data.targetUserId == request.auth.uid;

      // Criação: qualquer membro do tenant (para sistema/admin)
      allow create: if isTenantMember(tenantId) &&
                       request.resource.data.tenantId == tenantId &&
                       request.resource.data.keys().hasAll([
                         'targetUserId', 'type', 'title', 'message',
                         'entityType', 'entityId', 'status', 'priority',
                         'channels', 'createdAt'
                       ]);

      // Atualização: apenas o destinatário (marcar lida/deletar)
      allow update: if isTenantMember(tenantId) &&
                       resource.data.targetUserId == request.auth.uid &&
                       // Só pode atualizar readAt e status
                       request.resource.data.diff(resource.data)
                         .affectedKeys().hasOnly(['readAt', 'status', 'expiresAt']);

      // Deletar: apenas o destinatário (soft delete via status)
      allow delete: if isTenantMember(tenantId) &&
                       resource.data.targetUserId == request.auth.uid;
    }

    // Preferências de notificação
    match /tenants/{tenantId}/notificationPreferences/{userId} {
      // Leitura/escrita: apenas o próprio usuário
      allow read, write: if isTenantMember(tenantId) &&
                            userId == request.auth.uid;
    }
  }
}
```

## 💾 Estimativa de Custos

### Cenário: 1000 usuários, 50 notificações/dia cada

**Writes:**
- 50,000 notificações/dia
- ~1,500,000 writes/mês
- Custo: ~$1.80/mês

**Reads (com cache):**
- 10 reads/usuário/dia (com real-time)
- 10,000 reads/dia
- ~300,000 reads/mês
- Custo: ~$0.12/mês

**Storage:**
- ~2KB por notificação
- 30 dias de retenção
- 1,500,000 notificações
- ~3GB storage
- Custo: ~$0.54/mês

**Total estimado: ~$2.50/mês para 1000 usuários ativos**

## 🚀 Melhores Práticas Implementadas

### ✅ 1. Sempre usar limit() em queries
```typescript
// ❌ Ruim - sem limit
const q = query(collection(db, 'notifications'))

// ✅ Bom - com limit
const q = query(
  collection(db, 'notifications'),
  limit(20)
)
```

### ✅ 2. Batch operations para múltiplas writes
```typescript
const batch = writeBatch(db)
notifications.forEach(notif => {
  const ref = doc(collection(db, `tenants/${tenantId}/notifications`))
  batch.set(ref, notif)
})
await batch.commit()  // Single round-trip
```

### ✅ 3. Use serverTimestamp() para timestamps
```typescript
{
  createdAt: serverTimestamp(),  // ✅ Timestamp do servidor
  // NOT: new Date()              // ❌ Timestamp do cliente
}
```

### ✅ 4. Cache de preferências (5min TTL)
```typescript
private static preferencesCache = new Map<string, {
  preferences: NotificationPreferences | null
  timestamp: number
}>()
```

### ✅ 5. Async email sending (non-blocking)
```typescript
if (channels.includes(NotificationChannel.EMAIL)) {
  // Fire and forget - não bloqueia criação
  this.sendEmailNotification(notificationId, data).catch(error => {
    logger.error('Email failed', error)
  })
}
```

### ✅ 6. Single document update (otimizado)
```typescript
// ✅ Single update
await updateDoc(notificationRef, {
  'deliveryStatus.email.status': 'delivered',
  'deliveryStatus.email.deliveredAt': serverTimestamp(),
  'deliveryStatus.email.attempts': 1
})

// ❌ Múltiplas updates
await updateDoc(notificationRef, { 'deliveryStatus.email.status': 'delivered' })
await updateDoc(notificationRef, { 'deliveryStatus.email.deliveredAt': serverTimestamp() })
```

## 📈 Monitoramento

### Métricas a acompanhar:

1. **Read/Write Ratios**
   - Ideal: 10:1 (10 reads por 1 write)
   - Monitore via Firebase Console

2. **Query Performance**
   - Tempo médio de query < 100ms
   - Use Firebase Performance Monitoring

3. **Cache Hit Rate**
   - Preferências: > 90% hit rate
   - Monitore via logs

4. **Real-time Connection Count**
   - Máximo recomendado: 100k concurrent
   - Monitore via Firebase Console

5. **Document Size**
   - Alvo: < 5KB por notificação
   - Máximo: 1MB (limite Firestore)

## 🔄 Migração e Backup

### Exportar notificações
```bash
gcloud firestore export gs://[BUCKET_NAME]/notifications \
  --collection-ids=notifications
```

### Importar notificações
```bash
gcloud firestore import gs://[BUCKET_NAME]/notifications
```

## 📝 Changelog de Arquitetura

### v1.0.0 (2025-11-07)
- ✅ Estrutura inicial multi-tenant
- ✅ 5 índices compostos otimizados
- ✅ TTL automático para expiração
- ✅ Security Rules implementadas
- ✅ Validation schemas (Zod)
- ✅ Cache de preferências
- ✅ Batch operations para marcar todas lidas

---

**Arquitetura revisada e otimizada para produção enterprise-grade**
