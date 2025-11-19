# Sistema de Cobranças Automáticas

Sistema simplificado de lembretes via WhatsApp para recebimentos pendentes.

## 📋 Visão Geral

O sistema permite configurar e enviar lembretes via WhatsApp para clientes com recebimentos pendentes. O envio pode ser feito manualmente via interface ou agendado externamente.

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

3. **API de Envio de Lembretes**
   - Localização: `/app/api/billing/send-reminders/route.ts`
   - Endpoints:
     - `POST /api/billing/send-reminders` - Enviar lembretes agora
     - `GET /api/billing/send-reminders` - Status e estatísticas
   - Autenticação: Firebase Auth (token obrigatório)
   - Uso: Interface web (botão "Enviar Lembretes Agora") ou chamada externa

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

### 2. Envio de Lembretes (manual ou agendado)

```
1. Usuário clica em "Enviar Lembretes Agora" OU serviço externo chama a API
2. API valida autenticação Firebase
3. Busca configuração do tenant
4. Verifica se está habilitado
5. Calcula data-alvo: hoje + daysBeforeDue
6. Busca transações pendentes com dueDate = data-alvo
7. Para cada transação:
   - Verifica se tem clientId
   - Busca dados do cliente (whatsappNumber)
   - Verifica se lembrete já foi enviado
   - Envia mensagem via WhatsApp Microservice
   - Marca lembrete como enviado
8. Retorna estatísticas (enviados, ignorados, falhas)
```

### 3. Envio de Mensagem

```typescript
// Chamada para WhatsApp Microservice (mesma usada em conversas)
POST ${WHATSAPP_MICROSERVICE_URL}/api/v1/messages/${tenantId}/send
Headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {WHATSAPP_MICROSERVICE_API_KEY}'
}
Body: {
  tenantId: string,
  to: string,               // Número do cliente
  message: string,          // Mensagem configurada
  type: 'text',
  source: 'billing_reminder'
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

**Todas as APIs:** Firebase Auth
- Token JWT validado em todas as rotas
- TenantId extraído do token
- Usuário deve estar autenticado na plataforma

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

**Já configuradas (não precisa adicionar nada novo):**

```bash
# WhatsApp Microservice (já existe)
WHATSAPP_MICROSERVICE_URL=http://your-server:3001
WHATSAPP_MICROSERVICE_API_KEY=your_key

# Firebase (já existe)
# Usado para autenticação
```

**Nota:** O sistema usa apenas variáveis que já existem na aplicação. Nenhuma configuração adicional é necessária.

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

## 🚀 Como Usar

### 1. Configurar Lembretes

1. Acesse `/dashboard/financeiro/cobrancas-automaticas`
2. Ative o sistema
3. Configure:
   - Quantos dias antes do vencimento enviar
   - Horário preferido (informativo)
   - Mensagem personalizada
4. Salve a configuração

### 2. Enviar Lembretes

**Opção 1: Manual (pela interface)**
- Clique no botão "Enviar Lembretes Agora"
- Veja resultado imediato (enviados, ignorados, falhas)

**Opção 2: Via API**
```bash
curl -X POST https://your-app.com/api/billing/send-reminders \
  -H "Authorization: Bearer {FIREBASE_TOKEN}"
```

**Opção 3: Agendar externamente** (futuro)
- Use um serviço externo (cron, scheduler, etc)
- Chame a API diariamente no horário configurado
- Sistema envia apenas para transações na data correta

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
