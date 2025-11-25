# 🧹 Limpeza de Variáveis de Ambiente da Netlify

**Problema:** Variáveis de ambiente excedem 4KB (limite do AWS Lambda)

## ✅ Variáveis que DEVEM PERMANECER na Netlify:

### Firebase (Backend)
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY` (mantém, mas é a maior variável)

### Firebase (Frontend - Next Public)
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

### N8N Integration
- `N8N_WEBHOOK_URL`
- `N8N_WEBHOOK_SECRET`
- `N8N_API_KEY`

### OpenAI
- `OPENAI_API_KEY`

### Security
- `JWT_SECRET`
- `NEXTAUTH_SECRET`
- `CRON_SECRET`
- `FACEBOOK_VERIFY_TOKEN`

### WhatsApp
- `WHATSAPP_MICROSERVICE_URL`
- `WHATSAPP_MICROSERVICE_API_KEY`
- `WHATSAPP_USE_EXTERNAL` (true)
- `ENABLE_WHATSAPP_INTEGRATION` (true)

### Facebook
- `NEXT_PUBLIC_FACEBOOK_APP_ID`

### App Config
- `NEXT_PUBLIC_APP_URL` (https://www.alugazap.com)
- `NEXTAUTH_URL` (https://www.alugazap.com)
- `MAPS_KEY`
- `AIRBNB`

### Redis
- `REDIS_URL` (mantém apenas 1)

---

## ❌ Variáveis que DEVEM SER REMOVIDAS da Netlify:

### Desenvolvimento (só para localhost)
- ❌ `NEXT_PUBLIC_BASE_URL` (http://localhost:3002)
- ❌ `NEXT_PUBLIC_DEBUG_MODE`
- ❌ `NODE_ENV` (Netlify já define automaticamente)
- ❌ `TENANT_ID=default` (não usar em produção!)
- ❌ `NEXT_PUBLIC_TENANT_ID` (não usar em produção!)

### Duplicadas/Redundantes
- ❌ `REDIS_URL_BACKUP` (use só REDIS_URL)
- ❌ `DISABLE_WHATSAPP_WEB` (redundante)
- ❌ `ENABLE_WHATSAPP_WEB` (redundante)

### Não Utilizadas
- ❌ `ENABLE_PAYMENT_PROCESSING` (false)
- ❌ `ENABLE_AI_AGENT` (sempre true, não precisa)
- ❌ `ENABLE_ANALYTICS` (sempre true, não precisa)
- ❌ `PROFESSIONAL_AGENT_ENABLED` (sempre true)
- ❌ `CACHE_TTL_SECONDS` (padrão no código)
- ❌ `MAX_CONCURRENT_AI_REQUESTS` (padrão no código)
- ❌ `AI_REQUEST_TIMEOUT_MS` (padrão no código)
- ❌ `API_RATE_LIMIT_WINDOW_MS` (padrão no código)
- ❌ `API_RATE_LIMIT_MAX_REQUESTS` (padrão no código)
- ❌ `LOG_LEVEL` (padrão no código)
- ❌ `WHATSAPP_WEBHOOK_SECRET` (não usado)

---

## 📊 Economia Estimada:

**Removendo as variáveis acima, você economiza aproximadamente 1.5-2KB**, o que deve resolver o problema do limite de 4KB.

---

## 🔧 Como Remover na Netlify:

1. Vá para: https://app.netlify.com/sites/seu-site/configuration/env
2. Para cada variável marcada com ❌, clique em **"Options" → "Delete"**
3. Após remover todas, clique em **"Save"**
4. Faça um novo deploy

---

## ⚙️ Variáveis Corretas para Produção:

```bash
# Firebase Backend
FIREBASE_PROJECT_ID=locai-76dcf
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@locai-76dcf.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Firebase Frontend
NEXT_PUBLIC_FIREBASE_PROJECT_ID=locai-76dcf
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBKRDtn0BqMhE0Dk0wHI6iLaMmtForeChs
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=locai-76dcf.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=locai-76dcf.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1000449765567
NEXT_PUBLIC_FIREBASE_APP_ID=1:1000449765567:web:43b5a6e5c2948462f9a3b2

# N8N
N8N_WEBHOOK_URL=https://alugazap.app.n8n.cloud/webhook/61d4590e-41ec-4ba0-a9f9-4746c29364cb
N8N_WEBHOOK_SECRET=gGN2nsle3GBw67Eyzg4uUfhnig3NH7jm9nDw2FWnje4=
N8N_API_KEY=f423ae223f4b7d2297f72f39390a70cd8b50560a12fef2330e2f638d2c9aa3eb

# OpenAI
OPENAI_API_KEY=sk-proj-...

# Security
JWT_SECRET=temp-secret-for-testing-sofia-fixed-123456789-production-ready-secure-key
NEXTAUTH_SECRET=nextauth-secret-for-testing-sofia-fixed-production-ready
CRON_SECRET=cr2NtJgQdBoGVzvChd+NnCzQSQRn9DBm89YLwm+jP/I=
FACEBOOK_VERIFY_TOKEN=a14dc3ecd83604ce8539d73a0d461b7d

# WhatsApp
WHATSAPP_MICROSERVICE_URL=http://167.71.126.123:3000
WHATSAPP_MICROSERVICE_API_KEY=tTmMQE3Rdgu1UpwEwTBow4GmBU9XstTaGva2kIqGjCU=
WHATSAPP_USE_EXTERNAL=true
ENABLE_WHATSAPP_INTEGRATION=true

# Facebook
NEXT_PUBLIC_FACEBOOK_APP_ID=851509160734111

# App
NEXT_PUBLIC_APP_URL=https://www.alugazap.com
NEXTAUTH_URL=https://www.alugazap.com
MAPS_KEY=AIzaSyDGvZ1xLiZApY8JohdiqauTaLC9H0mZL7I
AIRBNB=500b0470-69cf-4a2f-8112-9647d3147ef6

# Redis
REDIS_URL=redis://default:XIEVr3E6gbjazdEVV64mBucaUlpYCinJ@redis-11838.crce196.sa-east-1-2.ec2.cloud.redislabs.com:11838
```

**Total de variáveis necessárias: ~30 (reduzido de ~44)**
