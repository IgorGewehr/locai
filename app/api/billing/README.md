# Sistema de Cobranças Automáticas

Sistema de lembretes automáticos via WhatsApp para recebimentos pendentes.

## 📋 Visão Geral

O sistema envia lembretes automáticos via WhatsApp para clientes com recebimentos pendentes, baseado em configurações personalizáveis por tenant.

## 🏗️ Arquitetura

### Componentes

1. **Interface de Configuração**
   - Localização: `/app/dashboard/financeiro/cobrancas-automaticas/page.tsx`
   - Funcionalidades:
     - Toggle para ativar/desativar
     - Seletor de dias antes do vencimento (1, 2, 3, 5, 7, 15 dias)
     - Seletor de horário de envio
     - Editor de mensagem personalizada (máx. 1000 caracteres)

2. **API de Configuração**
   - Localização: `/app/api/billing/config/route.ts`
   - Endpoints:
     - `GET /api/billing/config` - Buscar configuração
     - `PUT /api/billing/config` - Atualizar configuração
   - Autenticação: Firebase Auth (token obrigatório)
   - Storage: `tenants/{tenantId}/billing_config/auto_charge`

3. **API de Processamento**
   - Localização: `/app/api/billing/process/route.ts`
   - Endpoint: `POST /api/billing/process`
   - Autenticação: Bearer token com `CRON_SECRET`
   - Executado via Vercel Cron (a cada 30 minutos)

4. **Cron Job**
   - Localização: `vercel.json`
   - Schedule: `*/30 * * * *` (a cada 30 minutos)
   - Path: `/api/billing/process`

## 🔄 Fluxo de Execução

### 1. Configuração (pelo usuário)

```typescript
interface AutoBillingConfig {
  enabled: boolean;           // Sistema ativo/inativo
  daysBeforeDue: number;      // Dias antes do vencimento (1-30)
  message: string;            // Mensagem personalizada (máx. 1000 chars)
  sendTime: string;           // Horário de envio (formato "HH:MM")
}
```

**Exemplo de configuração:**
```json
{
  "enabled": true,
  "daysBeforeDue": 3,
  "message": "Olá! Lembramos que o pagamento de R$ {valor} vence em 3 dias...",
  "sendTime": "09:00"
}
```

### 2. Processamento Automático (a cada 30 min)

```
1. Cron Job (Vercel) chama /api/billing/process
2. API valida CRON_SECRET
3. Para cada tenant (usando DEFAULT_TENANT_ID no MVP):
   a. Busca configuração do tenant
   b. Verifica se está habilitado
   c. Verifica se está na janela de horário (±30 min)
   d. Calcula data-alvo: hoje + daysBeforeDue
   e. Busca transações pendentes com dueDate = data-alvo
   f. Para cada transação:
      - Verifica se tem clientId
      - Busca dados do cliente (whatsappNumber)
      - Verifica se lembrete já foi enviado
      - Envia mensagem via /api/whatsapp/send-n8n
      - Marca lembrete como enviado
4. Retorna estatísticas de processamento
```

### 3. Envio de Mensagem

```typescript
// Chamada para API de WhatsApp (N8N)
POST /api/whatsapp/send-n8n
Headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {N8N_API_KEY}'
}
Body: {
  tenantId: string,
  clientPhone: string,      // Formato: 554799999999 (sem sufixos)
  finalMessage: string      // Mensagem configurada pelo usuário
}
```

## 💾 Estrutura de Dados

### Configuração (Firestore)

**Path:** `tenants/{tenantId}/billing_config/auto_charge`

```typescript
{
  enabled: boolean,
  daysBeforeDue: number,
  message: string,
  sendTime: string,
  updatedAt: Timestamp,
  updatedBy: string  // userId
}
```

### Histórico de Lembretes (Firestore)

**Path:** `tenants/{tenantId}/billing_reminders/{transactionId}`

```typescript
{
  transactionId: string,
  sentAt: Timestamp,
  status: 'sent'
}
```

**Objetivo:** Prevenir envio duplicado de lembretes para a mesma transação.

### Transações (Existente)

**Path:** `tenants/{tenantId}/transactions/{transactionId}`

```typescript
{
  id: string,
  type: 'income' | 'expense',
  status: 'pending' | 'paid' | 'cancelled',
  amount: number,
  dueDate: Timestamp,
  clientId: string,
  // ... outros campos
}
```

**Filtros aplicados:**
- `type === 'income'` (apenas recebimentos)
- `status === 'pending'` (não pagos)
- `dueDate >= targetDate AND dueDate <= targetDate (fim do dia)`

## 🔐 Segurança

### Autenticação

1. **Interface Web:** Firebase Auth
   - Token JWT validado em `GET/PUT /api/billing/config`
   - TenantId extraído do token

2. **Cron Job:** CRON_SECRET
   - Header: `Authorization: Bearer {CRON_SECRET}`
   - Validado em `POST /api/billing/process`

### Validação de Dados

```typescript
// Schema Zod para validação
const AutoBillingConfigSchema = z.object({
  enabled: z.boolean(),
  daysBeforeDue: z.number().int().min(1).max(30),
  message: z.string().max(1000),
  sendTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/),
});
```

### Sanitização

- Mensagem de cobrança é sanitizada via `sanitizeUserInput()`
- Prevenção contra XSS e injection attacks

## 🌍 Variáveis de Ambiente

**Requeridas:**

```bash
# Cron authentication
CRON_SECRET=your_random_secret_min_32_chars

# N8N integration (para envio de mensagens)
N8N_API_KEY=your_n8n_api_key

# Tenant configuration (MVP mode)
DEFAULT_TENANT_ID=your_tenant_id

# Application URL (para construir URLs internas)
NEXT_PUBLIC_APP_URL=https://your-app-domain.com
```

## 📊 Logging e Monitoramento

### Logs Principais

```typescript
// Início do processamento
logger.info('[BILLING-PROCESS] Starting billing process', {
  requestId,
  timestamp,
});

// Processamento por tenant
logger.info('[BILLING-PROCESS] Processing tenant', {
  tenantId: tenantId.substring(0, 8) + '***',
  targetDueDate,
  daysBeforeDue,
});

// Sucesso no envio
logger.info('[BILLING-PROCESS] Reminder sent successfully', {
  transactionId,
  phone: phone.substring(0, 8) + '***',
});

// Erros
logger.error('[BILLING-PROCESS] Operation failed', {
  error: error.message,
  transactionId,
});
```

### Resposta da API

```typescript
{
  success: true,
  message: 'Billing process completed',
  data: {
    summary: {
      totalTenants: number,
      totalProcessed: number,
      totalSent: number,
      totalFailed: number,
      totalSkipped: number,
      durationMs: number,
    },
    results: [
      {
        tenantId: string,
        processed: number,
        sent: number,
        failed: number,
        skipped: number,
        errors: [{ transactionId, error }]
      }
    ]
  },
  meta: {
    requestId: string,
    timestamp: string,
    durationMs: number,
  }
}
```

## 🚀 Deploy

### Vercel

1. **Adicionar variáveis de ambiente:**
   ```bash
   vercel env add CRON_SECRET
   vercel env add N8N_API_KEY
   vercel env add DEFAULT_TENANT_ID
   ```

2. **Deploy automático:**
   ```bash
   git push origin main
   ```

3. **Verificar cron jobs:**
   - Vercel Dashboard > Project > Settings > Cron Jobs
   - Deve aparecer: `/api/billing/process` com schedule `*/30 * * * *`

### Testes Manuais

```bash
# Testar configuração
curl -X GET https://your-app.vercel.app/api/billing/config \
  -H "Authorization: Bearer {FIREBASE_TOKEN}"

# Testar processamento (local)
curl -X POST http://localhost:3000/api/billing/process \
  -H "Authorization: Bearer {CRON_SECRET}"
```

## 🔧 Manutenção

### Adicionar Variáveis na Mensagem (Future Enhancement)

Para adicionar suporte a `{{clientName}}`, `{{amount}}`, `{{dueDate}}`:

```typescript
// Em /app/api/billing/process/route.ts
function formatMessage(template: string, transaction: Transaction, client: any): string {
  return template
    .replace(/\{\{clientName\}\}/g, client.name || 'Cliente')
    .replace(/\{\{amount\}\}/g, formatCurrency(transaction.amount))
    .replace(/\{\{dueDate\}\}/g, formatDate(transaction.dueDate));
}
```

### Implementar Multi-Tenant Completo

```typescript
// Em /app/api/billing/process/route.ts
async function getAllTenantIds(): Promise<string[]> {
  // Implementar query em coleção de tenants
  const tenantsSnapshot = await admin.firestore()
    .collection('tenants_registry')
    .where('billingEnabled', '==', true)
    .get();

  return tenantsSnapshot.docs.map(doc => doc.id);
}
```

### Estatísticas e Analytics (Future Enhancement)

Adicionar métricas:
- Taxa de envio bem-sucedido
- Taxa de resposta dos clientes
- Conversão (lembretes → pagamentos)
- Horários de maior engajamento

## ❓ Troubleshooting

### Lembretes não estão sendo enviados

1. **Verificar configuração:**
   - Sistema está `enabled: true`?
   - Horário `sendTime` está próximo do horário atual (±30 min)?

2. **Verificar transações:**
   - Transações têm `type: 'income'` e `status: 'pending'`?
   - `dueDate` corresponde a hoje + `daysBeforeDue`?
   - Transações têm `clientId` válido?

3. **Verificar clientes:**
   - Cliente existe no Firestore?
   - Cliente tem `whatsappNumber` válido?

4. **Verificar logs:**
   ```bash
   vercel logs --follow
   ```

### Lembretes duplicados

- Verificar coleção `billing_reminders`
- Sistema deve prevenir automaticamente duplicados

### Erros de autenticação no cron

- Verificar `CRON_SECRET` no Vercel
- Header deve ser: `Authorization: Bearer {CRON_SECRET}`

## 📚 Referências

- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
- [Firebase Firestore](https://firebase.google.com/docs/firestore)
- [N8N Webhooks](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [Zod Validation](https://zod.dev/)
