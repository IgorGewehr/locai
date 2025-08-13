# 🚀 Deploy LocAI no Railway - GUIA ATUALIZADO 2025

## 📋 Visão Geral

Este guia atualizado mostra como fazer deploy do LocAI no Railway com todas as correções aplicadas. O projeto agora está 100% pronto para produção.

## 🎯 Por que Railway?

### ❌ **Netlify (Serverless) - Limitações:**
- Functions timeout em 10-26s
- Stateless - mata conexões WebSocket
- Filesystem read-only
- Cold starts constantes

### ✅ **Railway (Persistente) - Vantagens:**
- Servidor sempre ativo 24/7
- WebSockets funcionam perfeitamente
- Filesystem completo para sessões
- Baileys funciona nativamente
- $5/mês - preço justo

## 🚀 Deploy Rápido

### 1. Preparar Repositório GitHub

```bash
# Fazer commit das mudanças
git add .
git commit -m "Prepare for Railway deployment with Baileys"
git push origin main
```

### 2. Deploy no Railway

1. **Acesse [railway.app](https://railway.app)**
2. **Login com GitHub**
3. **New Project > Deploy from GitHub repo**
4. **Selecione seu repositório LocAI**
5. **Railway detecta automaticamente o `railway.json`**
6. **Deploy automático em ~3-5 minutos**

### 3. Configurar Variáveis de Ambiente

⚠️ **IMPORTANTE: O Railway agora usa Node.js 20 automaticamente** (configurado via `Dockerfile`)

No Railway Dashboard, adicione TODAS estas variáveis (copie exatamente):

```bash
# ===== FIREBASE CONFIGURATION =====
NEXT_PUBLIC_FIREBASE_PROJECT_ID=locai-76dcf
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBKRDtn0BqMhE0Dk0wHI6iLaMmtForeChs
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=locai-76dcf.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=locai-76dcf.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1000449765567
NEXT_PUBLIC_FIREBASE_APP_ID=1:1000449765567:web:43b5a6e5c2948462f9a3b2

# Firebase Admin (Server-side)
FIREBASE_PROJECT_ID=locai-76dcf
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@locai-76dcf.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDASTbJp3VRgZpl\ntr2uvLkwpcR5sVmIQA33ziSCktN1tjTAfjLROFvoh4LfJs3Vv6h4qgXvpXpCW8vH\nyCJlDIkzKlPkm/3RuDshdnzHRKpNDRmee3VCcyS3KNJCO2Jwjcl6bSA0IJis6nJa\nLArB/rgh1KclZcHZtN5wur9GDzHiXGdaaSOSO2Jnl8UPTb0Hrbf0ZVXGX2mWRwOx\nTnJGnmNXzmrDHgWmEZlqu8PYmOTSNJZO6Ra+wCXqX25QjR9Do1ICdymBnSl7i/Hw\nxgL+I0kovYkrN+qm2BbQRsy4eaTxn+K+6DOhlbBTEhuZr/uaUUpEHDCorXg+btnk\nW7l476WpAgMBAAECggEAGrDO+xTUkxjDXsUL9Vpa9ma8LAwzGleR2MjzhnBtC9Tb\n47Bgy2vgThmpT+JqBfaRoxYutsIog1eMpNGh/JbN4J1KgdwpUlgZVR7GWT6tyP49\nhSMr9qpW+VmgPfNSSb9UrTrCkpnHt5DfiKa+Y4lA8+k5vlYun1Kc4db6P/ZR/VKK\nqJY0J4C2+2j8nW1GrOxkSaP0HGkaS35LCsFLPGYWcrC6egeh7sO8GfO7VrlRW0Wp\nnT8QTVf64dR0894Lm7Re2CeOTeFZ7nS786rbSg7wLHrVnkabZyS8UKSvflYkJJmC\nDWjGjZSvPQefrrGCqzYZ+j3RzBR5qkPn1IzyNW8uJQKBgQDgyQZWF1UTLBL6Vx8C\n8Z/dWt2rcP4OlOSTBbGMYfg3x4BZEXUjBXcxnPdbKMPFpd5KrlrjHe7nNtrwR8uo\niwwsDPc1A14adh/VFp7oBi509eTandhQ0iGyAZrvPEf+M+tkAHjrornBGNP0l/6A\nlrQei+5+jy7apfA9QwnrqSNuiwKBgQDa/NxhM4Jd3MSzICOUgxlixhlGT0SE5At/\nPwG6XhGsdNWQZGjArY6z2ZdYxjbhwKsk6FMPywVpiZPkQwk9Ces/KJ77WOmn1UEL\nlyA9eNYe0TJHzknpwj98Co5BwFyxnF4cj89FkLxzGt6Jb3dqRyi+3B7WCeWQJsnN\nYsvUqt2XGwKBgAe7IjqnxsdIBscRZAGn6cWlMGaLFlHOESZ1VavsWqsgc2uczBiO\nQZE1QtShzEnp8IFFCd8x0lulaVZGQdzkG2EQeRgbq4rhcSrVAlYckFB5fIuATkZJ\nU9tZbsi3nApEIt5nncEM8bKQdgm9iIVHqZ47VdKIfiYK+v5AZgDy6kMNAoGALiKd\nj0DZ00qCijZYKJ6iB4QyqPRkPBcLMQimJYxR7uJCaAQvaYBnEw7hast/nnoH1GO5\ntBcSkdRxOuLAnIJtdEXrkIp/12L/LCDvouPFQILUM/qK6duJomla5RFQtf56eUv2\n3/IJMbrUbWH1Z4eMVwFq4a7+FSuG0mVhCfHhc0cCgYBjMbgal53mlfOFZmgMB14r\nj1K0R1oo+daZhYWSPQXLS3hfTXgSxPoz8YG9H9O1uOOHII2wRIJE7Gm4jFq7DhIr\n1mK13TR6WLNH1gJeIp/eH781RiCbBTzMikjGEu4bAunGu8rS0czTQreDI62VHfS/\n/suP25cNFjVc1+xWcoL7Ig==\n-----END PRIVATE KEY-----\n"

# ===== OPENAI CONFIGURATION =====
OPENAI_API_KEY=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
AGENT_MODEL_SIMPLE=gpt-4o-mini
AGENT_MODEL_COMPLEX=gpt-4o-mini

# ===== APPLICATION CONFIG (IMPORTANTE MUDAR) =====
# ⚠️ MUDE ESTAS URLs PARA SUA DOMAIN DA RAILWAY APÓS O DEPLOY
NEXT_PUBLIC_APP_URL=https://seu-projeto.up.railway.app
NEXT_PUBLIC_BASE_URL=https://seu-projeto.up.railway.app
NEXTAUTH_URL=https://seu-projeto.up.railway.app
NODE_ENV=production
TENANT_ID=default
NEXT_PUBLIC_TENANT_ID=default

# ===== SECURITY (IMPORTANTE GERAR NOVAS) =====
# ⚠️ GERE NOVAS SECRETS PARA PRODUÇÃO (comandos abaixo)
JWT_SECRET=gere-uma-secret-forte-para-producao-123456789
NEXTAUTH_SECRET=gere-uma-nextauth-secret-forte-para-producao

# ===== FEATURE FLAGS =====
ENABLE_WHATSAPP_INTEGRATION=true
ENABLE_AI_AGENT=true
ENABLE_PAYMENT_PROCESSING=false
ENABLE_ANALYTICS=true
PROFESSIONAL_AGENT_ENABLED=true

# ===== PERFORMANCE =====
CACHE_TTL_SECONDS=300
MAX_CONCURRENT_AI_REQUESTS=10
AI_REQUEST_TIMEOUT_MS=30000
API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
NEXT_PUBLIC_DEBUG_MODE=false

# ===== WHATSAPP =====
DISABLE_WHATSAPP_WEB=false
ENABLE_WHATSAPP_WEB=true
```

### 🔐 IMPORTANTE: Gerar Secrets de Produção

Execute estes comandos localmente para gerar secrets seguras:

```bash
# Gerar JWT Secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Gerar NextAuth Secret  
node -e "console.log('NEXTAUTH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

Use os valores gerados no lugar das secrets de exemplo acima.

### 4. Atualizar URLs Após o Deploy

⚠️ **CRÍTICO**: Após o primeiro deploy, você DEVE atualizar as URLs:

1. **Railway gerará uma URL como**: `https://locai-production-xxxx.up.railway.app`
2. **Volte em Variables e atualize estas 3 variáveis**:
   ```bash
   NEXT_PUBLIC_APP_URL=https://SUA-URL-REAL.up.railway.app
   NEXT_PUBLIC_BASE_URL=https://SUA-URL-REAL.up.railway.app
   NEXTAUTH_URL=https://SUA-URL-REAL.up.railway.app
   ```
3. **Railway fará redeploy automático**

### 5. Verificar o Deploy

Após alguns minutos, teste:

```bash
# Health Check
curl https://sua-url.up.railway.app/api/health

# Deve retornar: {"status":"ok","timestamp":"..."}
```

## ✅ **O que funciona automaticamente:**

- ✅ **Baileys WhatsApp Web** - conexões persistentes
- ✅ **QR codes reais** - geração nativa
- ✅ **Sofia AI** - processamento completo
- ✅ **Firebase** - todas as operações
- ✅ **Dashboard** - interface completa
- ✅ **Multi-tenant** - isolamento perfeito
- ✅ **Sessões persistentes** - salvam automaticamente

## 🔧 Configurações Railway

O arquivo `railway.json` e `Dockerfile` já estão configurados:

**`railway.json`:**
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

**`Dockerfile`:**
- Node.js 20 Alpine (otimizado)
- Sessões Baileys com permissões corretas
- Health check para monitoramento
- Segurança com usuário não-root

## 📊 Monitoramento

### Logs
```bash
# Ver logs em tempo real
railway logs --tail
```

### Métricas
- Railway Dashboard mostra CPU, RAM, rede
- Uptime 99.9% garantido
- Alertas automáticos

## 🎉 Após o Deploy

### 1. Testar WhatsApp
1. Acesse `https://sua-url.up.railway.app/dashboard/whatsapp`
2. Clique "Conectar WhatsApp"
3. **QR code real** aparece imediatamente
4. Escaneie com WhatsApp
5. Sofia AI responde automaticamente

### 2. Configurar Domínio (Opcional)
- Railway permite domínio personalizado
- Configure DNS apontando para Railway
- SSL automático

### 3. Migrar Dados (Se necessário)
- Dados Firebase já funcionam
- Sessões WhatsApp são criadas automaticamente
- Clientes podem reconectar

## 💰 Custos

### Railway
- **Starter Plan**: $5/mês
- **Pro Plan**: $20/mês (para escala)
- Sem cobrança por função/request
- Previsível e fixo

### Comparação
- **Netlify**: $0-19/mês + limitações
- **Railway**: $5/mês sem limitações
- **Economia**: Melhor custo-benefício

## 🔄 Workflow de Desenvolvimento

```bash
# Desenvolvimento local
npm run dev

# Deploy automático
git push origin main
# Railway deploys automaticamente

# Ver logs
railway logs --tail

# Conectar ao projeto
railway link
```

## 🆘 Resolução de Problemas

### Build falha:
```bash
railway logs --tail
# Verificar variáveis de ambiente
```

### WhatsApp não conecta:
- Verificar se `WHATSAPP_USE_CLOUD_API` NÃO está definido
- Baileys é padrão no Railway
- Logs mostram processo de conexão

### Performance:
- Railway fornece métricas em tempo real
- Upgrade automático conforme necessário

## 🎯 Resultado Final

Após o deploy no Railway:
- ✅ **Baileys funcionando 100%** nativamente
- ✅ **QR codes reais** sem limitações
- ✅ **Sofia AI** processando 24/7
- ✅ **Sessões persistentes** automáticas
- ✅ **Custo baixo** $5/mês fixo
- ✅ **Deploy automático** com Git

**O LocAI funcionará exatamente como deveria desde o início! 🎉**

## 📞 Próximos Passos

1. **Fazer deploy agora**: Railway.app
2. **Configurar variáveis**: Copiar do Netlify
3. **Testar WhatsApp**: QR codes reais
4. **Migrar DNS**: Apontar para Railway
5. **Cancelar Netlify**: Economia imediata

Railway é a solução perfeita para o LocAI - ambiente onde tudo funciona como deveria! 🚀