# 🔗 ABACATEPAY WEBHOOK SETUP - Notificações em Tempo Real

Este documento explica como configurar o **webhook da AbacatePay** para receber notificações automáticas quando o status de um pagamento mudar.

---

## 📋 **O QUE SÃO WEBHOOKS?**

Webhooks são **notificações automáticas** enviadas pela AbacatePay quando algo acontece:

✅ **Pagamento confirmado** (PIX pago)
✅ **Link de pagamento expirou**
✅ **Pagamento foi cancelado**
✅ **Reembolso processado**
✅ **Saque concluído**

Ao invés de ficar **consultando** a API o tempo todo, a AbacatePay **avisa você** instantaneamente!

---

## ⚡ **POR QUE CONFIGURAR?**

**Sem webhook:**
- Sistema só atualiza quando o cron roda (30 em 30 min)
- Cliente paga PIX às 10:05, mas sistema só atualiza às 10:30 ⏰

**Com webhook:**
- Cliente paga PIX às 10:05
- AbacatePay avisa **instantaneamente** 🚀
- Sistema atualiza status em **2 segundos**
- Notificação enviada imediatamente 📬

---

## 🔧 **PASSO 1: Verificar Endpoint Webhook**

Seu endpoint webhook já está criado em:
```
https://seusite.netlify.app/api/webhooks/abacatepay
```

### **Testar se está funcionando:**

```bash
curl https://seusite.netlify.app/api/webhooks/abacatepay
```

**Resposta esperada:**
```json
{
  "service": "AbacatePay Webhook",
  "status": "active",
  "timestamp": "2025-01-14T10:30:00.000Z"
}
```

Se receber essa resposta, está funcionando! ✅

---

## 🌐 **PASSO 2: Configurar Webhook na AbacatePay**

### **2.1 Acessar Dashboard AbacatePay**

1. Acesse: https://dashboard.abacatepay.com/
2. Faça login com sua conta
3. Vá em **Configurações** → **Webhooks** (ou **API** → **Webhooks**)

### **2.2 Adicionar Novo Webhook**

Clique em **"Adicionar Webhook"** ou **"+ Novo Webhook"**

Preencha:

| Campo | Valor |
|-------|-------|
| **Nome** | `Locai - Produção` |
| **URL** | `https://seusite.netlify.app/api/webhooks/abacatepay` |
| **Eventos** | ✅ Selecione TODOS (explicação abaixo) |
| **Ativo** | ✅ Sim |

### **2.3 Eventos Recomendados**

Marque TODOS esses eventos:

**PIX:**
- ✅ `pix.paid` - PIX foi pago
- ✅ `pix.expired` - PIX expirou sem pagamento
- ✅ `pix.cancelled` - PIX foi cancelado

**Billing (Links de Pagamento):**
- ✅ `billing.paid` - Link de pagamento foi pago
- ✅ `billing.expired` - Link expirou sem pagamento
- ✅ `billing.cancelled` - Link foi cancelado
- ✅ `billing.refunded` - Pagamento foi reembolsado

**Withdrawals (Saques):**
- ✅ `withdraw.pending` - Saque em processamento
- ✅ `withdraw.completed` - Saque concluído
- ✅ `withdraw.failed` - Saque falhou

### **2.4 Salvar Webhook**

1. Clique em **"Salvar"** ou **"Criar Webhook"**
2. Anote o **Webhook ID** ou **Secret** se fornecido
3. Status deve aparecer como **"Ativo"** ✅

---

## ✅ **PASSO 3: Testar Webhook**

### **3.1 Teste Via AbacatePay Dashboard**

Muitas plataformas oferecem um botão **"Testar Webhook"**:

1. Encontre seu webhook na lista
2. Clique em **"Testar"** ou **"Send Test"**
3. Verifique se o status muda para **"Success"**

### **3.2 Teste Real - Criar PIX de Teste**

**Opção A: Via Interface (recomendado)**
1. Vá em seu dashboard → Financeiro → Nova Transação
2. Crie uma transação de teste de R$ 0,01
3. Gere um PIX QR Code
4. **NÃO pague ainda!** Apenas crie

**Opção B: Via API**
```bash
curl -X POST https://seusite.netlify.app/api/ai/functions/generate-pix-qrcode \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "SEU_TENANT_ID",
    "amount": 0.01,
    "description": "Teste de webhook",
    "expiresIn": 30
  }'
```

### **3.3 Simular Pagamento (Ambiente Dev)**

Se a AbacatePay tiver **modo sandbox/dev**:

1. Use a API Key de desenvolvimento
2. Crie um PIX de teste
3. Use os dados de teste da AbacatePay para "pagar"
4. Verifique se o webhook foi recebido

### **3.4 Verificar Logs**

Após o teste, verifique:

**No Dashboard AbacatePay:**
- Vá em **Webhooks** → **Logs** ou **Histórico**
- Procure pela requisição enviada
- Status deve ser **200 OK**

**Na Sua Aplicação:**
- Verifique os logs (se usa Sentry, CloudWatch, etc.)
- Procure por `[ABACATEPAY-WEBHOOK] Received webhook`
- Verifique se a transação foi atualizada no Firestore

---

## 🔍 **PASSO 4: Verificar Notificações**

Quando um pagamento for confirmado via webhook, o sistema:

1. ✅ Atualiza status da transação no Firestore
2. ✅ Envia notificação para o dashboard
3. ✅ Envia email (se configurado)

**Tipos de notificação:**

| Status | Título | Prioridade | Email |
|--------|--------|------------|-------|
| `PAID` | 💰 Pagamento Confirmado | Alta (se ≥ R$ 1000) | ✅ Sim |
| `EXPIRED` | ⏰ Pagamento Expirado | Média | ❌ Não |
| `CANCELLED` | ❌ Pagamento Cancelado | Baixa | ❌ Não |
| `REFUNDED` | ↩️ Pagamento Reembolsado | Alta | ✅ Sim |

---

## 🔧 **TROUBLESHOOTING**

### **❌ Webhook não está sendo recebido**

**Possíveis causas:**

1. **URL incorreta**
   - Verifique se a URL no dashboard AbacatePay está correta
   - Deve ter `https://` (não `http://`)
   - Não deve ter trailing slash (`/`)

2. **Firewall bloqueando**
   - Se usa CDN (Cloudflare), verifique WAF rules
   - Netlify geralmente não bloqueia, mas verifique logs

3. **Webhook desativado**
   - Verifique se está marcado como **"Ativo"** na AbacatePay

**Solução:**
```bash
# Teste manual simulando AbacatePay
curl -X POST https://seusite.netlify.app/api/webhooks/abacatepay \
  -H "Content-Type: application/json" \
  -d '{
    "event": "pix.paid",
    "timestamp": "2025-01-14T10:30:00.000Z",
    "devMode": true,
    "data": {
      "id": "pix_test_123",
      "amount": 1000,
      "status": "PAID",
      "metadata": {
        "tenantId": "SEU_TENANT_ID"
      }
    }
  }'
```

Se esse teste funcionar, o problema está na AbacatePay enviando.

---

### **❌ Webhook recebido mas transação não atualiza**

**Causa:** `tenantId` não está no metadata do pagamento.

**Solução:**
Ao criar PIX ou Billing, sempre inclua `tenantId` no metadata:

```typescript
// Exemplo correto
const pixRequest = {
  amount: toCents(100),
  expiresIn: 30,
  description: "Pagamento teste",
  metadata: {
    tenantId: "SEU_TENANT_ID",  // ⬅️ IMPORTANTE!
    externalId: "ext_123",
  }
};
```

---

### **❌ Erro: "Webhook timestamp too old"**

**Causa:** Webhook demorou mais de 5 minutos para chegar.

**Possível motivo:**
- Problema de rede entre AbacatePay e seu servidor
- Servidor estava offline quando webhook foi enviado

**Solução:**
- AbacatePay geralmente retentar automaticamente
- Se o erro persistir, use o **Cron Sync** como backup
- O cron rodando a cada 30min vai pegar qualquer pagamento perdido

---

### **❌ Notificação não foi enviada**

**Causa:** Erro no `NotificationService`.

**Verificar:**
1. Logs procurando por `[ABACATEPAY-WEBHOOK] Failed to send notification`
2. Verifique se `notification-service.ts` existe e está funcionando
3. Notificações são **non-blocking** (erro não quebra o webhook)

**Workaround:**
Mesmo sem notificação, o status da transação é atualizado corretamente.

---

## 📊 **MONITORAMENTO**

### **Dashboard AbacatePay**

Acesse periodicamente:
- **Webhooks** → **Logs** ou **Histórico**
- Veja quais webhooks foram enviados
- Status code (200 = sucesso)
- Retry attempts (tentativas de reenvio)

### **Sua Aplicação**

Se usa serviço de logs (Sentry, LogRocket, etc.):
```javascript
// Procurar por:
[ABACATEPAY-WEBHOOK] Received webhook
[ABACATEPAY-WEBHOOK] Webhook processed successfully
[ABACATEPAY-WEBHOOK] Notification sent successfully
```

### **Firestore**

Verifique campos da transação:
- `abacatepayWebhookReceived: true`
- `abacatepayLastWebhookEvent: "pix.paid"`
- `abacatepayLastWebhookAt: Timestamp`

---

## 🔐 **SEGURANÇA**

### **Validação de Timestamp**

O webhook **rejeita** automaticamente requisições com timestamp > 5 minutos:

```typescript
// Proteção contra replay attacks
if (ageMinutes > 5) {
  return NextResponse.json(
    { error: 'Webhook timestamp too old' },
    { status: 400 }
  );
}
```

### **Validação de TenantId**

Webhooks só processam se `tenantId` estiver presente:

```typescript
const tenantId = data.metadata?.tenantId;
if (!tenantId) {
  logger.warn('No tenantId in webhook');
  return { updated: false };
}
```

### **HTTPS Obrigatório**

AbacatePay só envia webhooks para URLs `https://`. Netlify fornece HTTPS automático ✅

---

## 🎯 **AMBIENTES (Dev vs Prod)**

### **Desenvolvimento**

1. Use **ngrok** para expor localhost:
   ```bash
   ngrok http 3000
   ```

2. Configure webhook com URL do ngrok:
   ```
   https://abc123.ngrok.io/api/webhooks/abacatepay
   ```

3. Use API Key de **desenvolvimento** da AbacatePay

### **Produção**

1. Use URL da Netlify:
   ```
   https://seusite.netlify.app/api/webhooks/abacatepay
   ```

2. Use API Key de **produção** da AbacatePay

3. Configure webhooks **separados** para dev e prod!

---

## 📚 **RECURSOS ADICIONAIS**

- **AbacatePay Docs**: https://api.abacatepay.com/docs
- **Webhook Best Practices**: https://docs.abacatepay.com/webhooks
- **Netlify Functions Docs**: https://docs.netlify.com/functions/overview/

---

## ✅ **CHECKLIST FINAL**

Antes de considerar concluído:

- [ ] Endpoint webhook testado manualmente (GET)
- [ ] Webhook cadastrado no dashboard AbacatePay
- [ ] Todos os eventos marcados (pix, billing, withdraw)
- [ ] Webhook marcado como **Ativo**
- [ ] URL webhook está correta (`https://` sem trailing slash)
- [ ] Teste de webhook enviado pela AbacatePay
- [ ] Status code 200 recebido
- [ ] Transação de teste criada
- [ ] Webhook recebido e transação atualizada
- [ ] Notificação enviada corretamente
- [ ] Logs verificados (AbacatePay + sua app)

---

## 🔄 **RELAÇÃO COM CRON SYNC**

**Webhook** e **Cron Sync** trabalham juntos:

| Cenário | Webhook | Cron Sync |
|---------|---------|-----------|
| Pagamento normal | ✅ Atualiza instantâneamente | ✅ Valida depois (redundância) |
| Webhook falhou | ❌ Não recebido | ✅ Pega na próxima execução |
| AbacatePay offline | ❌ Não envia | ✅ Consulta quando voltar |
| Pagamento expirado | ✅ Avisa quando expira | ✅ Verifica expirados |

**Resultado:** Sistema **sempre** fica atualizado! 🎯

---

## 🆘 **PRECISA DE AJUDA?**

Se algo não funcionar:

1. **Verifique logs** da AbacatePay (dashboard → webhooks → logs)
2. **Teste manualmente** com `curl` (comando no Troubleshooting)
3. **Verifique URL** (https, sem trailing slash, domínio correto)
4. **Teste com PIX real** de R$ 0,01
5. Confira se `tenantId` está no metadata ao criar pagamentos

---

**🎉 Pronto! Agora você receberá notificações instantâneas de todos os pagamentos!**
