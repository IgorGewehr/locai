# Guia de Implementação - Índices Firestore

## 📋 Visão Geral

Este documento contém instruções completas para implementar **todos os índices otimizados** do Firestore para o sistema Locai.

## 📁 Arquivo de Índices

**Localização**: `/firestore.indexes.complete.json`

**Conteúdo**: 100+ índices compostos otimizados para todas as coleções do sistema.

## 🚀 Como Implementar

### Opção 1: Firebase Console (Interface Gráfica)

#### Passo 1: Acessar Console
1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto
3. Navegue para **Firestore Database** → **Indexes**

#### Passo 2: Criar Índices Manualmente
Para cada índice no arquivo `firestore.indexes.complete.json`:

**Exemplo:**
```json
{
  "collectionGroup": "notifications",
  "fields": [
    { "fieldPath": "targetUserId", "order": "ASCENDING" },
    { "fieldPath": "readAt", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

**Ação:**
1. Clique em "Create Index"
2. Collection ID: `notifications`
3. Adicione campos:
   - `targetUserId` → Ascending
   - `readAt` → Ascending
   - `createdAt` → Descending
4. Query scope: `Collection`
5. Clique em "Create"

⚠️ **Limitação**: Processo manual, demorado para 100+ índices.

---

### Opção 2: Firebase CLI (Recomendado) ⭐

#### Passo 1: Instalar Firebase CLI
```bash
npm install -g firebase-tools
```

#### Passo 2: Login
```bash
firebase login
```

#### Passo 3: Inicializar Projeto (se ainda não inicializou)
```bash
firebase init firestore
```

Selecione:
- ✅ Firestore Rules
- ✅ Firestore Indexes

#### Passo 4: Substituir Arquivo de Índices
```bash
# Backup do arquivo atual (se existir)
cp firestore.indexes.json firestore.indexes.backup.json

# Copiar novo arquivo completo
cp firestore.indexes.complete.json firestore.indexes.json
```

#### Passo 5: Deploy dos Índices
```bash
firebase deploy --only firestore:indexes
```

**Saída esperada:**
```
✔ Deploy complete!

Indexes deployed:
  - notifications (3 composite indexes)
  - properties (8 composite indexes)
  - reservations (9 composite indexes)
  - transactions (14 composite indexes)
  - clients (4 composite indexes)
  - conversations (5 composite indexes)
  - messages (3 composite indexes)
  - leads (8 composite indexes)
  ...
  Total: 102 indexes

Field overrides deployed:
  - notifications.expiresAt (TTL enabled)
  - conversations.tags (Array contains)
  - clients.tags (Array contains)
  - properties.amenities (Array contains)
  - reservations.deletedAt (TTL enabled)
  - transactions.deletedAt (TTL enabled)
```

#### Passo 6: Verificar Status
```bash
firebase firestore:indexes
```

**Tempo estimado**: 5-15 minutos para todos os índices serem criados.

---

### Opção 3: Google Cloud CLI (gcloud)

```bash
# Autenticar
gcloud auth login

# Definir projeto
gcloud config set project YOUR_PROJECT_ID

# Deploy indexes
gcloud firestore indexes create --async \
  --database="(default)" \
  --collection-group="notifications" \
  --field-config=field-path=targetUserId,order=ascending \
  --field-config=field-path=readAt,order=ascending \
  --field-config=field-path=createdAt,order=descending
```

⚠️ **Limitação**: Precisa criar um comando para cada índice.

---

## 📊 Índices por Coleção

### Resumo Executivo

| Coleção | Índices Compostos | TTL | Array Config |
|---------|-------------------|-----|--------------|
| **notifications** | 6 | ✅ expiresAt | ❌ |
| **properties** | 8 | ❌ | ✅ amenities |
| **reservations** | 9 | ✅ deletedAt | ❌ |
| **transactions** | 14 | ✅ deletedAt | ❌ |
| **clients** | 4 | ❌ | ✅ tags |
| **conversations** | 5 | ❌ | ✅ tags |
| **messages** | 3 | ❌ | ❌ |
| **leads** | 8 | ❌ | ❌ |
| **goals** | 3 | ❌ | ❌ |
| **agendaEvents** | 4 | ❌ | ❌ |
| **visits** | 3 | ❌ | ❌ |
| **amenities** | 2 | ❌ | ❌ |
| **tickets** | 13 | ❌ | ❌ |
| **responses** | 1 | ❌ | ❌ |
| **analytics** | 2 | ❌ | ❌ |
| **miniSiteAnalytics** | 2 | ❌ | ❌ |
| **automations** | 2 | ❌ | ❌ |
| **billing_reminders** | 2 | ❌ | ❌ |
| **TOTAL** | **102** | **3** | **3** |

---

## 🎯 Índices Críticos (Deploy Primeiro)

Se quiser fazer deploy progressivo, comece com estes:

### 1. Notifications (Sistema de Notificações)
```json
[
  {
    "collectionGroup": "notifications",
    "fields": [
      { "fieldPath": "targetUserId", "order": "ASCENDING" },
      { "fieldPath": "readAt", "order": "ASCENDING" },
      { "fieldPath": "createdAt", "order": "DESCENDING" }
    ]
  }
]
```
**Impacto**: NotificationBell, página de notificações

### 2. Reservations (Core do Sistema)
```json
[
  {
    "collectionGroup": "reservations",
    "fields": [
      { "fieldPath": "propertyId", "order": "ASCENDING" },
      { "fieldPath": "checkIn", "order": "ASCENDING" }
    ]
  }
]
```
**Impacto**: Disponibilidade, calendário de reservas

### 3. Conversations (WhatsApp)
```json
[
  {
    "collectionGroup": "conversations",
    "fields": [
      { "fieldPath": "status", "order": "ASCENDING" },
      { "fieldPath": "lastMessageAt", "order": "DESCENDING" }
    ]
  }
]
```
**Impacto**: Dashboard de conversas

### 4. Leads (CRM)
```json
[
  {
    "collectionGroup": "leads",
    "fields": [
      { "fieldPath": "stage", "order": "ASCENDING" },
      { "fieldPath": "score", "order": "DESCENDING" }
    ]
  }
]
```
**Impacto**: Pipeline CRM

---

## ⚙️ Field Overrides (Configurações Especiais)

### 1. TTL (Time To Live) - Limpeza Automática

#### notifications.expiresAt
```json
{
  "collectionGroup": "notifications",
  "fieldPath": "expiresAt",
  "ttlConfig": {}
}
```
**Função**: Deletar automaticamente notificações expiradas após 30 dias.

#### reservations.deletedAt
```json
{
  "collectionGroup": "reservations",
  "fieldPath": "deletedAt",
  "ttlConfig": {}
}
```
**Função**: Limpeza de reservas soft-deleted após período de retenção.

#### transactions.deletedAt
```json
{
  "collectionGroup": "transactions",
  "fieldPath": "deletedAt",
  "ttlConfig": {}
}
```
**Função**: Limpeza de transações soft-deleted após período de retenção.

---

### 2. Array Config - Queries com Arrays

#### conversations.tags
```json
{
  "collectionGroup": "conversations",
  "fieldPath": "tags",
  "indexes": [
    {
      "queryScope": "COLLECTION",
      "arrayConfig": "CONTAINS"
    }
  ]
}
```
**Uso**: `where('tags', 'array-contains', 'urgente')`

#### clients.tags
```json
{
  "collectionGroup": "clients",
  "fieldPath": "tags",
  "indexes": [
    {
      "queryScope": "COLLECTION",
      "arrayConfig": "CONTAINS"
    }
  ]
}
```
**Uso**: `where('tags', 'array-contains', 'vip')`

#### properties.amenities
```json
{
  "collectionGroup": "properties",
  "fieldPath": "amenities",
  "indexes": [
    {
      "queryScope": "COLLECTION",
      "arrayConfig": "CONTAINS"
    }
  ]
}
```
**Uso**: `where('amenities', 'array-contains', 'piscina')`

---

## 🔍 Validação Pós-Deploy

### Comando: Listar Índices Criados
```bash
firebase firestore:indexes
```

### Verificar no Console
1. Acesse Firebase Console → Firestore → Indexes
2. Verifique se todos estão com status **"Enabled"** (verde)
3. Aguarde índices com status "Building" terminarem

### Testar Queries

#### Teste 1: Notificações não lidas
```typescript
const q = query(
  collection(db, 'tenants/tenant123/notifications'),
  where('targetUserId', '==', 'user123'),
  where('readAt', '==', null),
  orderBy('createdAt', 'desc'),
  limit(20)
)
const snapshot = await getDocs(q)
// ✅ Deve funcionar SEM erro de índice faltando
```

#### Teste 2: Reservas por propriedade
```typescript
const q = query(
  collection(db, 'tenants/tenant123/reservations'),
  where('propertyId', '==', 'prop456'),
  where('status', '==', 'confirmed'),
  orderBy('checkIn', 'asc')
)
const snapshot = await getDocs(q)
// ✅ Deve funcionar SEM erro
```

#### Teste 3: Leads por stage
```typescript
const q = query(
  collection(db, 'tenants/tenant123/leads'),
  where('stage', '==', 'qualified'),
  orderBy('score', 'desc'),
  limit(50)
)
const snapshot = await getDocs(q)
// ✅ Deve funcionar SEM erro
```

---

## 💰 Estimativa de Custos

### Armazenamento de Índices
- **1GB de índices**: ~$0.18/mês
- **Estimado para 102 índices**: ~1-2GB
- **Custo mensal**: ~$0.20-$0.40/mês

### Reads (Não afeta custo)
Índices melhoram performance SEM custo adicional de reads.

### Writes (Overhead de Índices)
- Cada documento escrito atualiza todos os índices relacionados
- Overhead: ~10-20% mais writes
- **Exemplo**: 10,000 writes/dia → 11,000-12,000 writes/dia
- **Custo adicional**: ~$0.02/mês

**Total estimado: ~$0.25/mês para 102 índices**

---

## ⚠️ Avisos Importantes

### 1. Limite de Índices por Projeto
- **Firebase Free**: 200 índices compostos
- **Firebase Blaze**: 200 índices compostos (mesmo limite)
- **Este projeto**: 102 índices (50% do limite)
- ✅ **Seguro** - Margem de 98 índices para crescimento

### 2. Tempo de Criação
- Índices pequenos: 1-2 minutos
- Índices grandes (muitos docs): 5-15 minutos
- **Total estimado**: 10-20 minutos para todos

### 3. Índices Automáticos
Firestore cria automaticamente:
- Single-field indexes (ascendentes e descendentes)
- Não precisa criar manualmente

### 4. Ordem de Campos
⚠️ **IMPORTANTE**: A ordem dos campos no índice importa!

```javascript
// ✅ Funciona
where('status', '==', 'active')
  .where('priority', '==', 'high')
  .orderBy('createdAt', 'desc')

// ❌ NÃO funciona (ordem errada no índice)
where('priority', '==', 'high')
  .where('status', '==', 'active')
  .orderBy('createdAt', 'desc')
```

### 5. Manutenção
- **Remover índices não utilizados** para economizar
- **Monitorar uso** via Firebase Console → Usage
- **Auditar periodicamente** (trimestral)

---

## 📊 Dashboard de Monitoramento

### Métricas a Acompanhar

1. **Index Status**
   - Firebase Console → Firestore → Indexes
   - Verificar se todos estão "Enabled"

2. **Query Performance**
   - Firebase Console → Performance
   - Tempo médio de query < 100ms

3. **Index Usage**
   - Firebase Console → Usage → Firestore
   - Verificar reads/writes por coleção

4. **Errors**
   - Logs de aplicação
   - Buscar por "index" ou "composite index"

---

## 🐛 Troubleshooting

### Erro: "The query requires an index"

**Causa**: Índice composto faltando

**Solução**:
1. Copiar URL do erro (Firebase fornece)
2. Clicar na URL (abre console com índice pré-configurado)
3. Criar índice

**Ou:**
1. Identificar campos da query
2. Adicionar ao `firestore.indexes.json`
3. `firebase deploy --only firestore:indexes`

---

### Erro: "Index already exists"

**Causa**: Índice duplicado no arquivo JSON

**Solução**:
1. Verificar `firestore.indexes.json`
2. Remover duplicatas
3. Re-deploy

---

### Índice demora muito para criar

**Causa**: Coleção com milhões de documentos

**Soluções**:
1. Aguardar (pode levar horas)
2. Criar índice em horário de baixo tráfego
3. Considerar criar índice antes de popular coleção

---

## ✅ Checklist de Implementação

- [ ] Backup arquivo atual: `firestore.indexes.json`
- [ ] Copiar novo arquivo: `firestore.indexes.complete.json` → `firestore.indexes.json`
- [ ] Login Firebase CLI: `firebase login`
- [ ] Deploy índices: `firebase deploy --only firestore:indexes`
- [ ] Aguardar conclusão (10-20min)
- [ ] Verificar status: `firebase firestore:indexes`
- [ ] Testar queries críticas (notificações, reservas, conversas)
- [ ] Monitorar erros nos próximos dias
- [ ] Documentar índices adicionados

---

## 📚 Referências

- [Firebase Indexes Documentation](https://firebase.google.com/docs/firestore/query-data/indexing)
- [Best Practices for Firestore](https://firebase.google.com/docs/firestore/best-practices)
- [Index Types](https://firebase.google.com/docs/firestore/query-data/index-overview)
- [TTL Policies](https://firebase.google.com/docs/firestore/ttl)

---

**Índices otimizados para máxima performance em produção enterprise-grade** 🚀
