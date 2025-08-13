# ✅ CHECKLIST DEPLOY RAILWAY - LocAI

## 🚀 Passos Rápidos

### 1. Preparar Build
```bash
# Teste local primeiro
npm run build
# ✅ Build deve completar sem erros
```

### 2. Deploy Railway
1. Acesse [railway.app](https://railway.app)
2. **New Project** > **Deploy from GitHub repo**
3. Selecione seu repositório
4. **Deploy automático iniciará**

### 3. Configurar Variáveis (CRÍTICO)

Copie e cole TODAS estas variáveis no Railway Dashboard → Variables:

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_PROJECT_ID=locai-76dcf
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBKRDtn0BqMhE0Dk0wHI6iLaMmtForeChs
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=locai-76dcf.firebaseapp.com
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=locai-76dcf.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1000449765567
NEXT_PUBLIC_FIREBASE_APP_ID=1:1000449765567:web:43b5a6e5c2948462f9a3b2
FIREBASE_PROJECT_ID=locai-76dcf
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@locai-76dcf.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDASTbJp3VRgZpl\ntr2uvLkwpcR5sVmIQA33ziSCktN1tjTAfjLROFvoh4LfJs3Vv6h4qgXvpXpCW8vH\nyCJlDIkzKlPkm/3RuDshdnzHRKpNDRmee3VCcyS3KNJCO2Jwjcl6bSA0IJis6nJa\nLArB/rgh1KclZcHZtN5wur9GDzHiXGdaaSOSO2Jnl8UPTb0Hrbf0ZVXGX2mWRwOx\nTnJGnmNXzmrDHgWmEZlqu8PYmOTSNJZO6Ra+wCXqX25QjR9Do1ICdymBnSl7i/Hw\nxgL+I0kovYkrN+qm2BbQRsy4eaTxn+K+6DOhlbBTEhuZr/uaUUpEHDCorXg+btnk\nW7l476WpAgMBAAECggEAGrDO+xTUkxjDXsUL9Vpa9ma8LAwzGleR2MjzhnBtC9Tb\n47Bgy2vgThmpT+JqBfaRoxYutsIog1eMpNGh/JbN4J1KgdwpUlgZVR7GWT6tyP49\nhSMr9qpW+VmgPfNSSb9UrTrCkpnHt5DfiKa+Y4lA8+k5vlYun1Kc4db6P/ZR/VKK\nqJY0J4C2+2j8nW1GrOxkSaP0HGkaS35LCsFLPGYWcrC6egeh7sO8GfO7VrlRW0Wp\nnT8QTVf64dR0894Lm7Re2CeOTeFZ7nS786rbSg7wLHrVnkabZyS8UKSvflYkJJmC\nDWjGjZSvPQefrrGCqzYZ+j3RzBR5qkPn1IzyNW8uJQKBgQDgyQZWF1UTLBL6Vx8C\n8Z/dWt2rcP4OlOSTBbGMYfg3x4BZEXUjBXcxnPdbKMPFpd5KrlrjHe7nNtrwR8uo\niwwsDPc1A14adh/VFp7oBi509eTandhQ0iGyAZrvPEf+M+tkAHjrornBGNP0l/6A\nlrQei+5+jy7apfA9QwnrqSNuiwKBgQDa/NxhM4Jd3MSzICOUgxlixhlGT0SE5At/\nPwG6XhGsdNWQZGjArY6z2ZdYxjbhwKsk6FMPywVpiZPkQwk9Ces/KJ77WOmn1UEL\nlyA9eNYe0TJHzknpwj98Co5BwFyxnF4cj89FkLxzGt6Jb3dqRyi+3B7WCeWQJsnN\nYsvUqt2XGwKBgAe7IjqnxsdIBscRZAGn6cWlMGaLFlHOESZ1VavsWqsgc2uczBiO\nQZE1QtShzEnp8IFFCd8x0lulaVZGQdzkG2EQeRgbq4rhcSrVAlYckFB5fIuATkZJ\nU9tZbsi3nApEIt5nncEM8bKQdgm9iIVHqZ47VdKIfiYK+v5AZgDy6kMNAoGALiKd\nj0DZ00qCijZYKJ6iB4QyqPRkPBcLMQimJYxR7uJCaAQvaYBnEw7hast/nnoH1GO5\ntBcSkdRxOuLAnIJtdEXrkIp/12L/LCDvouPFQILUM/qK6duJomla5RFQtf56eUv2\n3/IJMbrUbWH1Z4eMVwFq4a7+FSuG0mVhCfHhc0cCgYBjMbgal53mlfOFZmgMB14r\nj1K0R1oo+daZhYWSPQXLS3hfTXgSxPoz8YG9H9O1uOOHII2wRIJE7Gm4jFq7DhIr\n1mK13TR6WLNH1gJeIp/eH781RiCbBTzMikjGEu4bAunGu8rS0czTQreDI62VHfS/\n/suP25cNFjVc1+xWcoL7Ig==\n-----END PRIVATE KEY-----\n"

# OpenAI
OPENAI_API_KEY=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
AGENT_MODEL_SIMPLE=gpt-4o-mini
AGENT_MODEL_COMPLEX=gpt-4o-mini

# App URLs (MUDAR APÓS DEPLOY)
NEXT_PUBLIC_APP_URL=https://seu-projeto.up.railway.app
NEXT_PUBLIC_BASE_URL=https://seu-projeto.up.railway.app
NEXTAUTH_URL=https://seu-projeto.up.railway.app
NODE_ENV=production
TENANT_ID=default
NEXT_PUBLIC_TENANT_ID=default

# Security (GERAR NOVAS)
JWT_SECRET=GERAR_NOVA_SECRET_AQUI
NEXTAUTH_SECRET=GERAR_NOVA_SECRET_AQUI

# Features
ENABLE_WHATSAPP_INTEGRATION=true
ENABLE_AI_AGENT=true
ENABLE_PAYMENT_PROCESSING=false
ENABLE_ANALYTICS=true
PROFESSIONAL_AGENT_ENABLED=true

# Performance
CACHE_TTL_SECONDS=300
MAX_CONCURRENT_AI_REQUESTS=10
AI_REQUEST_TIMEOUT_MS=30000
API_RATE_LIMIT_WINDOW_MS=60000
API_RATE_LIMIT_MAX_REQUESTS=100
LOG_LEVEL=info
NEXT_PUBLIC_DEBUG_MODE=false

# WhatsApp
DISABLE_WHATSAPP_WEB=false
ENABLE_WHATSAPP_WEB=true
```

### 4. Gerar Secrets Seguras

Execute localmente:
```bash
# JWT Secret
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# NextAuth Secret  
node -e "console.log('NEXTAUTH_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
```

Copie os valores gerados e substitua nas variáveis do Railway.

### 5. Atualizar URLs (APÓS O DEPLOY)

1. **Railway gerará uma URL** como: `https://locai-production-xxxx.up.railway.app`
2. **Atualize estas 3 variáveis** com a URL real:
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_BASE_URL`
   - `NEXTAUTH_URL`
3. **Railway redeploy automaticamente**

### 6. Verificar Funcionamento

```bash
# Health Check
curl https://sua-url.up.railway.app/api/health

# Deve retornar: {"status":"ok"}
```

## 🎯 Resultado Final

✅ **Sistema 100% funcional:**
- Sofia AI Agent 
- WhatsApp Integration
- Firebase Database
- Dashboard completo
- Multi-tenant
- Enhanced Intent Detection
- Rate limiting
- Professional logging

## 🚨 Problemas Comuns

### Build falha:
- Verifique se TODAS as variáveis foram definidas
- Confirme `NODE_ENV=production`

### 500 errors:
- Confirme Firebase credentials
- Verifique OpenAI API key
- Confirme URLs atualizadas

### WhatsApp não conecta:
- Aguarde 2-3 minutos após deploy
- Verifique logs no Railway Dashboard

## 💡 Dicas

- Railway auto-detecta `package.json` 
- Build command: `npm run build`
- Start command: `npm start` (já configurado)
- Node.js 20 automático
- SSL habilitado automaticamente

**Seu LocAI estará 100% operacional na Railway! 🚀**