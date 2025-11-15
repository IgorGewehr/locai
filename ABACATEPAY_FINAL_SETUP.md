# ✅ ABACATEPAY - GUIA RÁPIDO DE CONFIGURAÇÃO FINAL

Este documento resume **tudo que você precisa configurar** para deixar o sistema de pagamentos 100% funcional.

---

## 📋 **CHECKLIST GERAL**

### **1️⃣ Variáveis de Ambiente** ⚙️

Adicione no **Netlify** (Site Settings → Environment Variables):

```bash
# AbacatePay
ABACATEPAY_API_KEY=sua_chave_api_abacatepay_aqui

# Cron Security
CRON_SECRET=gere_com_comando_npm_run_generate-cron-secret

# Tenants (separados por vírgula)
TENANT_IDS=tenant_id_1,tenant_id_2,tenant_id_3

# URL pública
NEXT_PUBLIC_APP_URL=https://seusite.netlify.app
```

**Importante:** Clique em **"Redeploy site"** após adicionar!

---

### **2️⃣ Webhook AbacatePay** 🔗

Configure no [Dashboard AbacatePay](https://dashboard.abacatepay.com/):

| Campo | Valor |
|-------|-------|
| **Nome** | `Locai - Produção` |
| **URL** | `https://seusite.netlify.app/api/webhooks/abacatepay` |
| **Eventos** | ✅ TODOS (pix.*, billing.*, withdraw.*) |
| **Ativo** | ✅ Sim |

📄 **Guia detalhado:** `ABACATEPAY_WEBHOOK_SETUP.md`

---

### **3️⃣ EasyCron** 🕐

Configure no [EasyCron](https://www.easycron.com/):

| Campo | Valor |
|-------|-------|
| **Name** | `AbacatePay Sync - Locai` |
| **URL** | `https://seusite.netlify.app/api/cron/sync-abacatepay` |
| **Interval** | `*/30 * * * *` (a cada 30min) |
| **Method** | `POST` |
| **Headers** | `Authorization: Bearer SEU_CRON_SECRET`<br>`Content-Type: application/json` |

📄 **Guia detalhado:** `EASYCRON_SETUP.md`

---

## 🚀 **ORDEM DE CONFIGURAÇÃO**

### **Passo 1: Gerar Secrets**
```bash
npm run generate-cron-secret
```

Copie o valor gerado.

### **Passo 2: Configurar Netlify**
1. Site Settings → Environment Variables
2. Adicione as 4 variáveis acima
3. Clique em **"Redeploy site"**
4. Aguarde deploy terminar (~2min)

### **Passo 3: Configurar AbacatePay Webhook**
1. Acesse dashboard AbacatePay
2. Webhooks → Adicionar novo
3. Preencha conforme tabela acima
4. Salve e teste

### **Passo 4: Configurar EasyCron**
1. Cadastre-se no EasyCron (grátis)
2. Crie novo Cron Job
3. Preencha conforme tabela acima
4. Salve e clique em "Run Now" para testar

### **Passo 5: Testar Tudo**
```bash
# Teste webhook
curl https://seusite.netlify.app/api/webhooks/abacatepay

# Teste cron (use seu CRON_SECRET)
curl -X POST https://seusite.netlify.app/api/cron/sync-abacatepay \
  -H "Authorization: Bearer SEU_CRON_SECRET"
```

---

## ✅ **COMO SABER SE ESTÁ FUNCIONANDO?**

### **Webhook AbacatePay**

**Teste 1:** Criar PIX
1. Vá em Dashboard → Financeiro → Nova Transação
2. Crie uma transação de R$ 0,01
3. Gere PIX QR Code
4. **Não pague ainda!** Apenas verifique se criou

**Teste 2:** Verificar logs AbacatePay
1. Dashboard AbacatePay → Webhooks → Logs
2. Deve aparecer requisições enviadas
3. Status code: **200 OK** ✅

---

### **EasyCron**

**Teste 1:** Execução manual
1. EasyCron Dashboard → Cron Jobs
2. Clique em "Run Now" no job criado
3. Status deve aparecer como **"Success"** ✅

**Teste 2:** Verificar logs
1. Clique no nome do Cron Job
2. Vá em "Execution Logs"
3. Última execução deve ter status 200

---

## 🎯 **RESULTADO ESPERADO**

Quando tudo estiver configurado:

### **Fluxo Normal (Pagamento)**
1. Cliente recebe link de pagamento ou PIX QR Code
2. Cliente paga
3. **AbacatePay envia webhook** (instantâneo ⚡)
4. Sistema atualiza status → `paid`
5. Notificação enviada 📬
6. **30min depois:** Cron valida novamente (redundância)

### **Fluxo de Backup (Webhook falhou)**
1. Cliente paga mas webhook não chegou
2. **30min depois:** Cron consulta AbacatePay
3. Detecta que foi pago
4. Atualiza status → `paid`
5. Notificação enviada 📬

**Sistema SEMPRE fica atualizado!** ✅

---

## 📊 **MONITORAMENTO**

### **Diário**
✅ Verificar emails do EasyCron (se houver falhas)
✅ Ver se notificações estão chegando

### **Semanal**
✅ Checar logs do EasyCron (execuções)
✅ Verificar logs do webhook AbacatePay

### **Mensal**
✅ Rotacionar `CRON_SECRET` (segurança)
✅ Revisar pagamentos pendentes

---

## 🔧 **TROUBLESHOOTING RÁPIDO**

| Problema | Solução |
|----------|---------|
| **Webhook não chega** | Verifique URL no dashboard AbacatePay<br>Teste manual com `curl` |
| **Cron retorna 401** | CRON_SECRET está errado<br>Verifique header no EasyCron |
| **"No tenants to sync"** | Adicione `TENANT_IDS` no Netlify<br>Redesploy |
| **Notificação não envia** | Verifique logs (não quebra o webhook)<br>Transação é atualizada mesmo assim |
| **EasyCron mostra Failed** | Aumente timeout para 120s<br>Verifique logs da aplicação |

---

## 📄 **DOCUMENTAÇÃO COMPLETA**

Para mais detalhes, consulte:

- 📗 **`EASYCRON_SETUP.md`** - Guia completo EasyCron (passo a passo)
- 📘 **`ABACATEPAY_WEBHOOK_SETUP.md`** - Guia completo Webhook (troubleshooting)
- 📙 **`ABACATEPAY_INTEGRATION.md`** - Documentação técnica completa
- 📕 **`ABACATEPAY_DEPLOYMENT.md`** - Deploy e produção

---

## ⏱️ **TEMPO ESTIMADO**

| Tarefa | Tempo |
|--------|-------|
| Gerar secrets | 1 min |
| Configurar Netlify | 5 min |
| Configurar Webhook | 5 min |
| Configurar EasyCron | 10 min |
| Testar tudo | 10 min |
| **TOTAL** | **~30 minutos** |

---

## 🎉 **CHECKLIST FINAL**

Marque conforme concluir:

**Variáveis de Ambiente:**
- [ ] `ABACATEPAY_API_KEY` adicionada no Netlify
- [ ] `CRON_SECRET` gerado e adicionado
- [ ] `TENANT_IDS` configurado
- [ ] `NEXT_PUBLIC_APP_URL` configurado
- [ ] Site redesployado no Netlify

**Webhook AbacatePay:**
- [ ] Webhook criado no dashboard
- [ ] URL correta (`https://seusite.netlify.app/api/webhooks/abacatepay`)
- [ ] Todos eventos marcados
- [ ] Webhook ativo
- [ ] Teste enviado com sucesso

**EasyCron:**
- [ ] Conta criada
- [ ] Cron Job criado
- [ ] Authorization header configurado
- [ ] Primeira execução manual bem-sucedida
- [ ] Email de notificação configurado

**Testes:**
- [ ] Webhook endpoint respondendo (GET)
- [ ] Cron endpoint respondendo (POST com auth)
- [ ] PIX de teste criado
- [ ] Logs verificados (EasyCron + AbacatePay)

---

## 🆘 **SUPORTE**

Documentos de referência:
- `EASYCRON_SETUP.md` - Configuração detalhada do cron
- `ABACATEPAY_WEBHOOK_SETUP.md` - Configuração detalhada do webhook
- `ABACATEPAY_INTEGRATION.md` - Documentação técnica da API

---

**🚀 Tudo configurado? Seu sistema de pagamentos está 100% operacional!**

Próximos passos:
1. Implementar as 3 AI functions faltando (opcional)
2. Testar com pagamentos reais
3. Monitorar notificações
4. Profit! 💰
