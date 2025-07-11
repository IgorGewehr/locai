# 🚀 Guia de Deploy para Produção

## Resumo da Verificação Final

✅ **APLICAÇÃO PRONTA PARA PRODUÇÃO**

A aplicação foi completamente auditada e está pronta para deploy em produção com:

- 🔒 **Segurança Enterprise**: Autenticação JWT, Rate Limiting, CORS, Headers de Segurança
- 🛡️ **Validação Completa**: Schemas Zod, Sanitização de Entrada, Prevenção de Ataques
- 📊 **Monitoramento**: Health Checks, Logs de Auditoria, Métricas de Performance
- 🔄 **Automação**: Scripts de Deploy, Verificação de Produção, Backups Automáticos
- 📝 **Documentação**: Configuração Completa, Guias de Troubleshooting

## Pré-requisitos

### Servidor
- Node.js 18.0.0 ou superior
- npm 8.0.0 ou superior
- PM2 (será instalado automaticamente)
- SSL/TLS Certificate (recomendado)

### Serviços Externos
- ✅ Firebase Project configurado
- ✅ OpenAI API Key ativa
- ✅ WhatsApp Business API configurada
- ✅ Domínio com SSL (recomendado)

## Passo a Passo para Deploy

### 1. Preparar Ambiente

```bash
# Clonar o repositório
git clone [seu-repositorio]
cd locai

# Instalar dependências
npm install

# Copiar arquivo de ambiente
cp .env.example .env
```

### 2. Configurar Variáveis de Ambiente

Edite o arquivo `.env` com suas credenciais:

```env
# OBRIGATÓRIO - Configurações da Aplicação
NEXT_PUBLIC_APP_URL=https://seu-dominio.com
NEXT_PUBLIC_TENANT_ID=seu-tenant-id
NODE_ENV=production
JWT_SECRET=sua-chave-jwt-minimo-32-caracteres

# OBRIGATÓRIO - Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=sua-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu-projeto-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu-projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=seu-app-id

# OBRIGATÓRIO - Firebase Admin
FIREBASE_PROJECT_ID=seu-projeto-id
FIREBASE_CLIENT_EMAIL=service-account@seu-projeto.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nsua-chave-privada\n-----END PRIVATE KEY-----"

# OBRIGATÓRIO - OpenAI
OPENAI_API_KEY=sk-sua-chave-openai

# OBRIGATÓRIO - WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=seu-token-whatsapp
WHATSAPP_PHONE_NUMBER_ID=seu-phone-id
WHATSAPP_BUSINESS_ACCOUNT_ID=seu-business-id
WHATSAPP_VERIFY_TOKEN=seu-verify-token
WHATSAPP_APP_SECRET=seu-app-secret

# RECOMENDADO - Serviços Adicionais
REDIS_URL=redis://localhost:6379
SENTRY_DSN=sua-sentry-dsn
DATABASE_ENCRYPTION_KEY=sua-chave-encriptacao-32-chars
```

### 3. Verificar Configuração

```bash
# Executar verificação de produção
npm run prod-check

# Verificar build
npm run deploy:check
```

### 4. Deploy Automático

```bash
# Deploy completo com verificações
npm run deploy
```

### 5. Deploy Manual (Alternativo)

```bash
# 1. Instalar dependências
npm ci

# 2. Verificar configuração
npm run prod-check

# 3. Build da aplicação
npm run build

# 4. Iniciar aplicação
npm start
```

## Verificações Pós-Deploy

### 1. Health Check
```bash
# Verificar saúde da aplicação
curl https://seu-dominio.com/api/health

# Verificar detalhes
curl https://seu-dominio.com/api/health?detailed=true
```

### 2. Testes de Endpoints
```bash
# Testar WhatsApp webhook
curl -X POST https://seu-dominio.com/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"hub.mode":"subscribe","hub.verify_token":"seu-verify-token","hub.challenge":"test"}'

# Testar autenticação
curl -X POST https://seu-dominio.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@seu-dominio.com","password":"sua-senha"}'
```

### 3. Verificar Logs
```bash
# Ver logs da aplicação
pm2 logs agente-imobiliaria

# Monitorar performance
pm2 monit
```

## Configuração do Servidor Web (Nginx)

### Configuração Nginx
```nginx
server {
    listen 80;
    server_name seu-dominio.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seu-dominio.com;
    
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Content-Security-Policy "default-src 'self' https: data: blob: 'unsafe-inline'" always;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 10240;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/json application/xml+rss;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Health check endpoint
    location /api/health {
        proxy_pass http://localhost:3000;
        access_log off;
    }
}
```

## Monitoramento e Manutenção

### Comandos PM2
```bash
# Ver status
pm2 status

# Reiniciar aplicação
pm2 restart agente-imobiliaria

# Parar aplicação
pm2 stop agente-imobiliaria

# Ver logs
pm2 logs agente-imobiliaria --lines 100

# Monitorar em tempo real
pm2 monit
```

### Backup Automático
```bash
# Criar backup manual
npm run backup

# Configurar backup automático (crontab)
0 2 * * * cd /path/to/app && npm run backup
```

### Rotação de Logs
```bash
# Configurar rotação de logs
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
pm2 set pm2-logrotate:compress true
```

## Troubleshooting

### Problemas Comuns

#### 1. Build Falha
```bash
# Limpar cache
npm run clean
npm install
npm run build
```

#### 2. Aplicação Não Inicia
```bash
# Verificar logs
pm2 logs agente-imobiliaria

# Verificar variáveis de ambiente
npm run prod-check

# Reiniciar aplicação
pm2 restart agente-imobiliaria
```

#### 3. Erros de Conexão Firebase
```bash
# Verificar credenciais
cat .env | grep FIREBASE

# Testar conexão
curl https://seu-dominio.com/api/health?detailed=true
```

#### 4. WhatsApp Webhook Não Funciona
```bash
# Verificar configuração
cat .env | grep WHATSAPP

# Testar webhook
curl -X POST https://seu-dominio.com/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -d '{"object":"whatsapp_business_account","entry":[]}'
```

## Segurança em Produção

### Checklist de Segurança
- ✅ HTTPS habilitado
- ✅ Headers de segurança configurados
- ✅ Rate limiting ativo
- ✅ Autenticação JWT implementada
- ✅ Validação de entrada ativa
- ✅ Logs de auditoria funcionando
- ✅ Firewall configurado
- ✅ Backup automático ativo

### Monitoramento de Segurança
```bash
# Verificar tentativas de login
tail -f logs/combined.log | grep "authentication"

# Verificar rate limiting
tail -f logs/combined.log | grep "rate.limit"

# Verificar erros de segurança
tail -f logs/combined.log | grep "security"
```

## Atualizações

### Deploy de Atualizações
```bash
# 1. Fazer backup
npm run backup

# 2. Atualizar código
git pull origin main

# 3. Instalar dependências
npm install

# 4. Executar verificações
npm run prod-check

# 5. Build da aplicação
npm run build

# 6. Reiniciar aplicação
pm2 restart agente-imobiliaria
```

### Rollback
```bash
# Restaurar backup anterior
pm2 stop agente-imobiliaria
cp -r backups/[backup-mais-recente]/.next .
pm2 start agente-imobiliaria
```

## Suporte

Para suporte técnico:
1. Verificar logs da aplicação
2. Executar health check
3. Verificar configuração com `npm run prod-check`
4. Consultar documentação da API

---

## 🎉 Conclusão

A aplicação está **100% pronta para produção** com:

- ✅ **Segurança Enterprise-Grade**
- ✅ **Performance Otimizada**
- ✅ **Monitoramento Completo**
- ✅ **Deploy Automatizado**
- ✅ **Documentação Completa**

Seu cliente pode testar a aplicação em produção com total confiança!