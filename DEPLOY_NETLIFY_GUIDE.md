# 🚀 Guia de Deploy - Arquitetura Netlify + DigitalOcean

## 📐 Arquitetura Atual

- **Frontend (Next.js)**: Hospedado na **Netlify**
- **WhatsApp Microservice (Node.js)**: Hospedado no **DigitalOcean Droplet**
- **Domínio**: alugazap.com (apontando para Netlify)
- **Comunicação**: Via webhook `/api/webhook/whatsapp-microservice`

## 🔧 Configuração do Frontend (Netlify)

### 1. Arquivo de Configuração Netlify

Crie um arquivo `netlify.toml` na raiz do projeto:

```toml
[build]
  command = "npm run build"
  publish = ".next"

[build.environment]
  NODE_VERSION = "20"
  NEXT_TELEMETRY_DISABLED = "1"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### 2. Variáveis de Ambiente no Netlify

No painel da Netlify, configure estas variáveis:

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyDD-YJy2RJzZGJ5DJmVyNXDrU2cJsVBxpE
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=rent-ai-dab19.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=rent-ai-dab19
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=rent-ai-dab19.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1079905127577
NEXT_PUBLIC_FIREBASE_APP_ID=1:1079905127577:web:9d689933e967fb087d8797

# Firebase Admin
FIREBASE_ADMIN_PROJECT_ID=rent-ai-dab19
FIREBASE_ADMIN_CLIENT_EMAIL=firebase-adminsdk-b6whn@rent-ai-dab19.iam.gserviceaccount.com
FIREBASE_ADMIN_PRIVATE_KEY=[Sua chave privada]

# OpenAI
OPENAI_API_KEY=[Sua API key OpenAI]

# WhatsApp Microservice (DigitalOcean)
WHATSAPP_USE_MICROSERVICE=true
WHATSAPP_MICROSERVICE_URL=http://167.172.116.195:3000
WHATSAPP_MICROSERVICE_API_KEY=tTmMQE3Rdgu1UpwEwTBow4GmBU9XstTaGva2kIqGjCU=

# JWT
JWT_SECRET=temp-secret-for-testing-sofia-fixed-123456789-production-ready-secure-key

# App
NEXT_PUBLIC_APP_NAME=AlugZap
NEXT_PUBLIC_APP_URL=https://alugazap.com
NODE_ENV=production
DEFAULT_TENANT_ID=U11UvXr67vWnDtDpDaaJDTuEcxo2

# Webhook Security (opcional)
WHATSAPP_WEBHOOK_SECRET=[Gerar uma chave segura]
WHATSAPP_WEBHOOK_VERIFY_TOKEN=locai-webhook-verify
```

### 3. Deploy na Netlify

```bash
# Opção 1: Via CLI
npm install -g netlify-cli
netlify init
netlify deploy --prod

# Opção 2: Via GitHub
# Conecte seu repositório no painel Netlify
# Deploy automático a cada push
```

## 🖥️ Configuração do Microservice (DigitalOcean)

### 1. No Droplet DigitalOcean

SSH no seu droplet:

```bash
ssh root@167.172.116.195
```

### 2. Configuração do Microservice

```bash
# Navegue até o diretório
cd /var/www/whatsapp-microservice

# Atualize o código
git pull origin main

# Instale dependências
npm ci --production

# Configure variáveis de ambiente
nano .env
```

Adicione no `.env`:

```bash
# Server
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=temp-secret-for-testing-sofia-fixed-123456789-production-ready-secure-key
API_KEY=tTmMQE3Rdgu1UpwEwTBow4GmBU9XstTaGva2kIqGjCU=

# Webhook para Frontend (Netlify)
WEBHOOK_URL=https://alugazap.com/api/webhook/whatsapp-microservice
WEBHOOK_SECRET=[Mesma chave configurada no Netlify]

# Baileys
BAILEYS_LOG_LEVEL=warn
SESSION_TIMEOUT=300000

# Rate Limiting
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 3. PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'whatsapp-microservice',
    script: './dist/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '512M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 4. Iniciar/Reiniciar Serviço

```bash
# Build
npm run build

# Iniciar com PM2
pm2 start ecosystem.config.js

# Salvar configuração
pm2 save
pm2 startup

# Ver logs
pm2 logs whatsapp-microservice
```

## 🔄 Fluxo de Comunicação

```mermaid
graph LR
    A[WhatsApp] --> B[Microservice<br/>DigitalOcean]
    B --> C[Webhook<br/>Netlify]
    C --> D[Sofia Agent<br/>Processamento]
    D --> E[Resposta via<br/>Microservice API]
    E --> B
    B --> A
```

## 🔒 Segurança

### 1. Firewall no DigitalOcean

```bash
# Configurar UFW
ufw allow 22/tcp  # SSH
ufw allow 3000/tcp # Microservice
ufw enable
```

### 2. Nginx como Proxy (Opcional)

```nginx
server {
    listen 80;
    server_name api.alugazap.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 📊 Monitoramento

### Frontend (Netlify)
- Netlify Analytics
- Functions logs no painel Netlify

### Microservice (DigitalOcean)
```bash
# Ver status
pm2 status

# Monitorar
pm2 monit

# Logs
pm2 logs whatsapp-microservice --lines 100
```

## 🔄 Atualização

### Frontend (Netlify)
```bash
git push origin main  # Deploy automático
```

### Microservice (DigitalOcean)
```bash
ssh root@167.172.116.195
cd /var/www/whatsapp-microservice
git pull
npm ci --production
npm run build
pm2 restart whatsapp-microservice
```

## 🐛 Troubleshooting

### Problema: Webhook não recebe mensagens
1. Verificar logs do microservice: `pm2 logs`
2. Testar webhook: `curl -X POST https://alugazap.com/api/webhook/whatsapp-microservice`
3. Verificar firewall e portas

### Problema: QR Code não aparece
1. Verificar conexão microservice: `curl http://167.172.116.195:3000/health`
2. Ver logs de sessão: `pm2 logs | grep QR`

### Problema: Mensagens não são enviadas
1. Verificar API key no microservice
2. Testar envio direto: `curl -X POST http://167.172.116.195:3000/api/v1/messages/[tenantId]/send`

## ✅ Checklist de Deploy

- [ ] Frontend buildando sem erros
- [ ] Variáveis de ambiente configuradas na Netlify
- [ ] Microservice rodando no DigitalOcean
- [ ] PM2 configurado e salvo
- [ ] Webhook testado e funcionando
- [ ] Firewall configurado
- [ ] DNS apontando corretamente
- [ ] SSL/HTTPS ativo

## 📝 Notas Importantes

1. **Não use Railway** - A arquitetura atual é Netlify + DigitalOcean
2. **Webhook é crítico** - Toda comunicação passa por `/api/webhook/whatsapp-microservice`
3. **Microservice independente** - Gerencia todas as sessões WhatsApp
4. **Frontend stateless** - Não mantém sessões Baileys localmente