# 🚀 AbacatePay Integration - Deployment Guide

**Status:** Ready for Production
**Version:** 1.0.0
**Last Updated:** 2025-11-13

---

## 📋 Pre-Deployment Checklist

### 1. Environment Variables

Add to your `.env` or `.env.local`:

```bash
# AbacatePay API Key (REQUIRED)
ABACATEPAY_API_KEY=your_abacatepay_api_key_here

# App URLs (for payment redirects)
NEXT_PUBLIC_APP_URL=https://app.locai.com.br

# N8N Webhook (for WhatsApp integration)
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/send-whatsapp
```

### 2. AbacatePay Dashboard Configuration

1. **Login to AbacatePay Dashboard**
   - Access: https://dashboard.abacatepay.com

2. **Get your API Key**
   - Navigate to: Settings → API Keys
   - Copy your production API key
   - Add to `.env`: `ABACATEPAY_API_KEY=...`

3. **Register Webhook URL**
   - Navigate to: Settings → Webhooks
   - Add webhook URL: `https://yourdomain.com/api/webhooks/abacatepay`
   - Select all events:
     - `billing.paid`
     - `billing.expired`
     - `billing.cancelled`
     - `billing.refunded`
     - `pix.paid`
     - `pix.expired`
     - `pix.cancelled`
     - `withdraw.pending`
     - `withdraw.completed`
     - `withdraw.failed`

### 3. Verify Installation

Run health check:

```bash
curl https://yourdomain.com/api/webhooks/abacatepay

# Expected response:
{
  "service": "AbacatePay Webhook",
  "status": "active",
  "timestamp": "2025-11-13T..."
}
```

---

## 🔧 N8N Integration Setup

### Sofia AI N8N Workflow Configuration

Your existing N8N workflow needs to be updated to include the new AbacatePay functions.

### Available Functions (add to N8N)

```json
{
  "functions": [
    {
      "name": "generate-pix-qrcode",
      "description": "Gera QR Code PIX para pagamento instantâneo",
      "endpoint": "https://yourdomain.com/api/ai/functions/generate-pix-qrcode",
      "parameters": {
        "tenantId": "string (required)",
        "amount": "number (required)",
        "description": "string (required)",
        "clientId": "string (optional)",
        "expiresIn": "number (optional, default: 30 minutes)",
        "reservationId": "string (optional)",
        "propertyId": "string (optional)"
      }
    },
    {
      "name": "create-payment-link",
      "description": "Cria link de pagamento para o cliente",
      "endpoint": "https://yourdomain.com/api/ai/functions/create-payment-link",
      "parameters": {
        "tenantId": "string (required)",
        "amount": "number (required)",
        "description": "string (required)",
        "clientId": "string (optional)",
        "dueDate": "string (optional)",
        "reservationId": "string (optional)",
        "propertyId": "string (optional)"
      }
    },
    {
      "name": "check-payment-status",
      "description": "Verifica status de um pagamento",
      "endpoint": "https://yourdomain.com/api/ai/functions/check-payment-status",
      "parameters": {
        "tenantId": "string (required)",
        "transactionId": "string (required)",
        "forceSync": "boolean (optional)"
      }
    },
    {
      "name": "list-pending-payments",
      "description": "Lista todos os pagamentos pendentes",
      "endpoint": "https://yourdomain.com/api/ai/functions/list-pending-payments",
      "parameters": {
        "tenantId": "string (required)",
        "clientId": "string (optional)",
        "propertyId": "string (optional)",
        "limit": "number (optional, default: 50)"
      }
    },
    {
      "name": "cancel-payment",
      "description": "Cancela um pagamento pendente",
      "endpoint": "https://yourdomain.com/api/ai/functions/cancel-payment",
      "parameters": {
        "tenantId": "string (required)",
        "transactionId": "string (required)",
        "reason": "string (required)"
      }
    },
    {
      "name": "request-withdrawal",
      "description": "Solicita saque para conta bancária (REQUER CONFIRMAÇÃO DO USUÁRIO)",
      "endpoint": "https://yourdomain.com/api/ai/functions/request-withdrawal",
      "parameters": {
        "tenantId": "string (required)",
        "amount": "number (required)",
        "pixKey": "string (required)",
        "pixKeyType": "string (required: CPF, CNPJ, EMAIL, PHONE, RANDOM)",
        "userConfirmed": "boolean (required: must be true)"
      }
    },
    {
      "name": "get-financial-summary",
      "description": "Obtém resumo financeiro de um período",
      "endpoint": "https://yourdomain.com/api/ai/functions/get-financial-summary",
      "parameters": {
        "tenantId": "string (required)",
        "startDate": "string (optional)",
        "endDate": "string (optional)",
        "propertyId": "string (optional)"
      }
    },
    {
      "name": "send-payment-reminder",
      "description": "Envia lembrete de pagamento via WhatsApp",
      "endpoint": "https://yourdomain.com/api/ai/functions/send-payment-reminder",
      "parameters": {
        "tenantId": "string (required)",
        "transactionId": "string (required)",
        "tone": "string (optional: friendly, formal, urgent)"
      }
    }
  ]
}
```

---

## 🧪 Testing in Development

### Test PIX QR Code Generation

```bash
curl -X POST http://localhost:3000/api/ai/functions/generate-pix-qrcode \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "your_tenant_id",
    "amount": 100.00,
    "description": "Teste de pagamento PIX",
    "expiresIn": 30
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "transactionId": "trans_xxxxx",
    "pixId": "pix_char_xxxxx",
    "qrCodeBase64": "data:image/png;base64,iVBORw0...",
    "brCode": "00020101021226950014br.gov.bcb.pix...",
    "amount": 100.00,
    "expiresAt": "2025-11-13T15:30:00.000Z"
  }
}
```

### Test Payment Link Creation

```bash
curl -X POST http://localhost:3000/api/ai/functions/create-payment-link \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "your_tenant_id",
    "amount": 150.00,
    "description": "Pagamento de reserva",
    "clientId": "client_xxxxx"
  }'
```

### Test Webhook Endpoint

```bash
curl -X POST http://localhost:3000/api/webhooks/abacatepay \
  -H "Content-Type: application/json" \
  -d '{
    "event": "pix.paid",
    "timestamp": "2025-11-13T14:30:00.000Z",
    "devMode": true,
    "data": {
      "id": "pix_char_test123",
      "status": "PAID",
      "amount": 10000,
      "metadata": {
        "tenantId": "your_tenant_id"
      }
    }
  }'
```

---

## 📊 Monitoring & Analytics

### Key Metrics to Monitor

1. **Payment Success Rate**
   - Target: >95%
   - Track: `paid / (paid + expired + cancelled)`

2. **Webhook Processing Time**
   - Target: <2 seconds
   - Alert if: >5 seconds

3. **AI Function Success Rate**
   - Target: >99%
   - Alert if: <95%

4. **Failed Payments**
   - Monitor daily
   - Investigate if spike occurs

### Logging

All operations are logged with:
- Request ID (for tracing)
- Tenant ID (masked)
- Processing time
- Status
- Errors (if any)

Access logs via your logging system or check Firestore logs.

---

## 🔐 Security Best Practices

### Production Checklist

- [ ] API key stored in environment variables (never in code)
- [ ] Webhook signature validation enabled
- [ ] Rate limiting configured
- [ ] HTTPS enforced on all endpoints
- [ ] Firestore security rules updated
- [ ] Sensitive data masked in logs
- [ ] Error messages don't expose internal details
- [ ] Withdrawal operations require user confirmation

### Firestore Security Rules

Update your Firestore rules to include:

```javascript
// Transactions collection rules
match /tenants/{tenantId}/transactions/{transactionId} {
  allow read, write: if isAuthenticated()
    && (request.auth.token.tenantId == tenantId
        || request.auth.token.role == 'admin');

  // Prevent direct modification of AbacatePay fields
  allow update: if !request.resource.data.diff(resource.data).affectedKeys()
    .hasAny(['abacatepayBillingId', 'abacatepayPixId', 'abacatepayCustomerId']);
}
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Webhook not received

**Symptoms:** Payment status not updating automatically

**Solutions:**
- Verify webhook URL is correct in AbacatePay dashboard
- Check firewall allows AbacatePay IPs
- Run manual sync: Call `check-payment-status` with `forceSync: true`
- Check webhook logs in your server

#### 2. API Key invalid

**Symptoms:** All API calls return 401 Unauthorized

**Solutions:**
- Verify `ABACATEPAY_API_KEY` in `.env`
- Check key is for correct environment (dev vs prod)
- Regenerate key in AbacatePay dashboard if needed

#### 3. Transaction not found in webhook

**Symptoms:** Webhook received but transaction not updated

**Solutions:**
- Ensure `tenantId` is included in transaction metadata
- Check transaction was created successfully in Firestore
- Verify transaction has correct `abacatepayPixId` or `abacatepayBillingId`

#### 4. PIX QR Code not generating

**Symptoms:** Function returns error when creating PIX

**Solutions:**
- Check amount is >= R$ 1.00
- Verify client data is valid (if provided)
- Check AbacatePay balance/status
- Review API error details in logs

---

## 📈 Scaling Considerations

### Performance Optimization

1. **Caching**
   - Cache AbacatePay customer IDs
   - Cache property/client data for 5 minutes
   - Don't cache transaction statuses (need real-time data)

2. **Rate Limiting**
   - Current limits (per tenant/day):
     - PIX QR Code: 100
     - Payment Links: 50
     - Withdrawals: 3
   - Adjust based on your needs

3. **Database Indexing**
   - Index on `abacatepayPixId`
   - Index on `abacatepayBillingId`
   - Index on `status` + `tenantId`
   - Index on `createdAt` for date queries

---

## 🔄 Backup & Recovery

### Data Backup

All transaction data is stored in Firestore with automatic backups.

**Manual backup recommended for:**
- AbacatePay API responses
- Webhook events
- Transaction states before/after payment

### Disaster Recovery

In case of data loss:

1. Transactions can be reconstructed from AbacatePay:
   - List all billings via API
   - List all PIX via API
   - Match with local transactions

2. Webhooks can be replayed:
   - Contact AbacatePay support
   - Request webhook replay for date range

---

## ✅ Go-Live Checklist

- [ ] All environment variables configured
- [ ] AbacatePay webhook registered
- [ ] Test transactions completed successfully
- [ ] N8N workflow updated with new functions
- [ ] Security rules updated in Firestore
- [ ] Monitoring dashboards configured
- [ ] Team trained on new features
- [ ] Backup procedures documented
- [ ] Support process updated
- [ ] Sofia AI tested with payment functions

---

## 📞 Support

### AbacatePay Support
- Website: https://abacatepay.com
- Email: suporte@abacatepay.com
- Documentation: https://api.abacatepay.com/docs

### Internal Support
- Check logs: `/var/log/app.log`
- Firestore console: Firebase Console → Firestore
- N8N workflows: N8N Dashboard → Workflows

---

**Deployment Guide Version:** 1.0.0
**Maintained By:** Development Team
**Last Updated:** 2025-11-13
