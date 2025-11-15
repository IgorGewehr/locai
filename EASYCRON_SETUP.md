# 🕐 EASYCRON SETUP - Sincronização Automática AbacatePay

Este documento explica como configurar o **EasyCron** para sincronizar automaticamente seus pagamentos com a AbacatePay a cada 30 minutos.

---

## 📋 **O QUE É ISSO?**

O sistema criou um **endpoint de sincronização** (`/api/cron/sync-abacatepay`) que:
- Consulta pagamentos pendentes no Firestore
- Verifica status na AbacatePay
- Atualiza automaticamente se o status mudou
- Detecta pagamentos expirados
- Envia notificações quando necessário

**EasyCron** é um serviço gratuito que chama esse endpoint automaticamente a cada 30 minutos.

---

## ⚙️ **PASSO 1: Configurar Variáveis de Ambiente**

### **1.1 Gerar CRON_SECRET**

Rode o comando:
```bash
npm run generate-cron-secret
```

Você verá algo assim:
```
🔐 Generated CRON_SECRET:
abc123xyz789...

📋 Add this to your .env file:
CRON_SECRET=abc123xyz789...
```

### **1.2 Adicionar no .env (Local)**

Edite seu `.env` e adicione:

```bash
# AbacatePay
ABACATEPAY_API_KEY=sua_chave_api_abacatepay

# Cron Job Security
CRON_SECRET=abc123xyz789...  # Gerado no passo anterior

# Tenant IDs (separados por vírgula)
TENANT_IDS=seu_tenant_id_1,seu_tenant_id_2

# URL pública da aplicação
NEXT_PUBLIC_APP_URL=https://seusite.netlify.app
```

### **1.3 Adicionar no Netlify (Produção)**

1. Acesse: **Site Settings** → **Environment Variables**
2. Adicione as mesmas variáveis:
   - `ABACATEPAY_API_KEY`
   - `CRON_SECRET`
   - `TENANT_IDS`
   - `NEXT_PUBLIC_APP_URL`

3. **Importante:** Clique em **"Redeploy"** depois de adicionar as variáveis!

---

## 🌐 **PASSO 2: Configurar EasyCron**

### **2.1 Criar Conta Gratuita**

1. Acesse: https://www.easycron.com/user/register
2. Cadastre-se (é grátis!)
3. Confirme seu email

### **2.2 Criar Novo Cron Job**

1. Faça login no EasyCron
2. Clique em **"+ Cron Job"**
3. Preencha os campos:

#### **A) Informações Básicas**

| Campo | Valor |
|-------|-------|
| **Cron Job Name** | `AbacatePay Sync - Locai` |
| **URL** | `https://seusite.netlify.app/api/cron/sync-abacatepay` |
| **Cron Expression** | `*/30 * * * *` (a cada 30 minutos) |

#### **B) HTTP Method & Headers**

- **HTTP Method**: `POST`
- **HTTP Headers**: Clique em **"Add HTTP Header"** e adicione:

```
Authorization: Bearer SEU_CRON_SECRET_AQUI
Content-Type: application/json
```

> ⚠️ **IMPORTANTE:** Substitua `SEU_CRON_SECRET_AQUI` pelo valor gerado no Passo 1.1

#### **C) POST Data (Opcional)**

Se quiser especificar tenants específicos, adicione no **POST Data**:

```json
{
  "tenantIds": ["tenant_id_1", "tenant_id_2"]
}
```

> 💡 **Nota:** Se não adicionar, vai usar os `TENANT_IDS` da variável de ambiente.

#### **D) Configurações Avançadas (Opcionais)**

- **Timeout**: `60` segundos
- **When URL returns error**: `Retry 3 times`
- **Email notification**: ✅ Ativar (para receber alertas de falha)

### **2.3 Salvar e Testar**

1. Clique em **"Create Cron Job"**
2. Na lista de Cron Jobs, clique em **"Run Now"** para testar
3. Verifique se aparece **"Success"** no status

---

## ✅ **PASSO 3: Verificar se Está Funcionando**

### **3.1 Testar o Endpoint Manualmente**

Rode no terminal (ou Postman):

```bash
curl -X POST https://seusite.netlify.app/api/cron/sync-abacatepay \
  -H "Authorization: Bearer SEU_CRON_SECRET_AQUI" \
  -H "Content-Type: application/json"
```

**Resposta esperada:**
```json
{
  "success": true,
  "cronId": "cron_sync_...",
  "processingTime": 2345,
  "tenants": {
    "total": 2,
    "successful": 2,
    "failed": 0
  },
  "totals": {
    "pixChecked": 5,
    "pixUpdated": 2,
    "billingChecked": 3,
    "billingUpdated": 1,
    "expired": 0,
    "errors": 0
  }
}
```

### **3.2 Verificar Logs do EasyCron**

1. No EasyCron, clique no nome do Cron Job
2. Vá em **"Execution Logs"**
3. Verifique se as execuções aparecem como **"Success"**
4. Clique em um log para ver a resposta completa

### **3.3 Verificar Logs da Aplicação**

Se você usa logging (Firestore, Sentry, etc.), procure por:
- `[CRON-SYNC] Starting AbacatePay sync`
- `[CRON-SYNC] Sync completed`

---

## 🔧 **TROUBLESHOOTING**

### **❌ Erro: "Unauthorized"**

**Causa:** `CRON_SECRET` incorreto ou não configurado.

**Solução:**
1. Verifique se adicionou `CRON_SECRET` nas variáveis de ambiente (Netlify)
2. Certifique-se que o valor no EasyCron (**Authorization header**) é o mesmo
3. Redesploy no Netlify após adicionar a variável

---

### **❌ Erro: "No tenants to sync"**

**Causa:** `TENANT_IDS` não configurado.

**Solução:**
1. Adicione `TENANT_IDS` nas variáveis de ambiente (Netlify)
2. Formato: `tenant1,tenant2,tenant3` (separado por vírgula, sem espaços)
3. Redesploy no Netlify

---

### **❌ Erro: "CRON_SECRET not configured"**

**Causa:** Variável de ambiente não existe no servidor.

**Solução:**
1. Acesse Netlify → Site Settings → Environment Variables
2. Adicione `CRON_SECRET` com o valor gerado
3. Clique em **"Redeploy site"**

---

### **❌ EasyCron mostra "Failed" ou timeout**

**Causas possíveis:**
1. Endpoint demora mais de 60 segundos (muitos tenants)
2. API da AbacatePay está lenta
3. Erro no código

**Soluções:**
1. Aumente o timeout no EasyCron para 120 segundos
2. Reduza o número de `TENANT_IDS` por execução
3. Verifique os logs da aplicação para erros específicos

---

### **❌ "This cron expression is not supported"**

**Causa:** Plano gratuito do EasyCron não suporta cron expressions complexas.

**Solução:**
Use a interface visual do EasyCron:
- **Repeat Type**: `Interval`
- **Interval**: `Every 30 minutes`

---

## 📊 **MONITORAMENTO**

### **Ver Última Execução**

Endpoint de health check:
```bash
curl https://seusite.netlify.app/api/cron/sync-abacatepay
```

**Resposta:**
```json
{
  "service": "AbacatePay Sync Cron",
  "status": "active",
  "timestamp": "2025-01-14T10:30:00.000Z",
  "configured": true,
  "interval": "30 minutes"
}
```

### **Notificações por Email**

Configure no EasyCron:
1. Edite o Cron Job
2. **Email notification on execution failure**: ✅ Ativado
3. Adicione seu email

Você receberá email automático se o cron falhar!

---

## 🎯 **FREQUÊNCIA RECOMENDADA**

| Frequência | Cron Expression | Quando Usar |
|------------|-----------------|-------------|
| **30 minutos** | `*/30 * * * *` | ⭐ **Recomendado** - Bom equilíbrio |
| 15 minutos | `*/15 * * * *` | Pagamentos urgentes, alto volume |
| 1 hora | `0 * * * *` | Baixo volume, economizar quota |

---

## 💰 **LIMITES DO PLANO GRATUITO**

EasyCron Free Plan:
- ✅ **20 cron jobs** gratuitos
- ✅ **Intervalo mínimo:** 1 minuto
- ✅ **Email notifications:** Incluídas
- ✅ **Logs:** 7 dias de histórico

**Suficiente para:**
- 1 cron job rodando a cada 30 min = **~1,440 execuções/mês** ✅
- Múltiplos tenants em uma única execução ✅

---

## 🔐 **SEGURANÇA**

### **Checklist de Segurança**

- ✅ `CRON_SECRET` deve ter **mínimo 32 caracteres**
- ✅ Nunca commitar `.env` com secrets reais
- ✅ Usar HTTPS (`https://`) na URL do cron
- ✅ Rotacionar `CRON_SECRET` a cada 90 dias
- ✅ Monitorar logs de execução periodicamente

### **Regenerar CRON_SECRET**

Se o secret foi exposto:
1. Gere novo: `npm run generate-cron-secret`
2. Atualize no `.env` e Netlify
3. Atualize no EasyCron (Authorization header)
4. Redesploy no Netlify

---

## 📚 **RECURSOS ADICIONAIS**

- **EasyCron Dashboard**: https://www.easycron.com/user
- **Cron Expression Tester**: https://crontab.guru/
- **Netlify Docs**: https://docs.netlify.com/environment-variables/overview/

---

## ✅ **CHECKLIST FINAL**

Antes de considerar concluído:

- [ ] Variáveis de ambiente configuradas (`.env` local)
- [ ] Variáveis de ambiente configuradas (Netlify)
- [ ] `CRON_SECRET` gerado e seguro
- [ ] Netlify redesployado após adicionar variáveis
- [ ] Conta EasyCron criada
- [ ] Cron Job criado no EasyCron
- [ ] Authorization header configurado
- [ ] Teste manual executado com sucesso
- [ ] Primeira execução automática verificada
- [ ] Email de notificação configurado
- [ ] Logs verificados

---

## 🆘 **PRECISA DE AJUDA?**

Se algo não funcionar:

1. **Verifique os logs** do EasyCron (Execution Logs)
2. **Teste manualmente** com `curl` (comando no Passo 3.1)
3. **Verifique as variáveis** no Netlify (devem estar todas lá)
4. **Redesploy** no Netlify após adicionar variáveis
5. Verifique se a URL está correta (sem trailing slash)

---

**🎉 Pronto! Seus pagamentos serão sincronizados automaticamente a cada 30 minutos!**
