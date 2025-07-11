# PRODUCTION.md - Guia Completo de Deploy para Netlify

## 🚨 Status Atual do Projeto

Este é um webapp Next.js 14 com funcionalidades server-side que **NÃO ESTÁ PRONTO** para deploy direto na Netlify sem modificações significativas.

### Problemas Críticos Identificados

1. **❌ Configuração Incompatível com Netlify**
   - O projeto usa `output: 'standalone'` (para servidores)
   - Netlify precisa de `output: 'export'` ou Netlify Functions

2. **❌ Sem Testes**
   - Nenhum teste unitário ou de integração existe
   - Sem framework de testes configurado

3. **❌ 271 Console.logs em Produção**
   - Logs espalhados por todo o código
   - Devem ser removidos ou substituídos por logging service

4. **❌ Integrações Incompletas**
   - Stripe configurado mas não implementado
   - Redis configurado mas não utilizado
   - Sentry mencionado mas não integrado

## 📋 Checklist Pré-Deploy

### 1. Decisão de Arquitetura (ESCOLHA UMA)

#### Opção A: Deploy com Netlify Functions (RECOMENDADO)
```toml
# netlify.toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NEXT_USE_NETLIFY_EDGE = "true"
```

#### Opção B: Migrar para Export Estático (LIMITADO)
```javascript
// next.config.js
module.exports = {
  output: 'export',
  // Remover server actions e API routes
}
```

### 2. Tarefas Obrigatórias

- [ ] **Remover todos os console.logs**
  ```bash
  # Encontrar todos os console.logs
  grep -r "console\." --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . | grep -v node_modules
  ```

- [ ] **Configurar variáveis de ambiente na Netlify**
  - Todas as vars do `.env.example`
  - Gerar JWT_SECRET seguro (32+ caracteres)
  - Configurar Firebase service account

- [ ] **Implementar Stripe (se necessário)**
  - Criar `/lib/services/stripe.ts`
  - Implementar webhooks
  - Adicionar rotas de pagamento

- [ ] **Resolver Tenant IDs hardcoded**
  - Substituir todos os `'default'` por resolução dinâmica

## 🔧 Configuração Netlify

### 1. Criar `netlify.toml`

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"

[build.environment]
  NEXT_PRIVATE_TARGET = "server"
  NODE_VERSION = "20"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    X-XSS-Protection = "1; mode=block"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

### 2. Configurar Variáveis de Ambiente

No painel da Netlify, adicionar TODAS as variáveis de `.env.example`:

```bash
# Firebase (Client)
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID

# Firebase (Admin) - CRÍTICO!
FIREBASE_SERVICE_ACCOUNT_TYPE
FIREBASE_SERVICE_ACCOUNT_PROJECT_ID
FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY_ID
FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY
FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL
FIREBASE_SERVICE_ACCOUNT_CLIENT_ID

# OpenAI
OPENAI_API_KEY

# WhatsApp (Opcional - pode ser configurado via dashboard)
WHATSAPP_ACCESS_TOKEN
WHATSAPP_PHONE_NUMBER_ID
WHATSAPP_VERIFY_TOKEN

# Security
JWT_SECRET # Gerar com: openssl rand -base64 32
NEXTAUTH_SECRET # Gerar com: openssl rand -base64 32
NEXTAUTH_URL # https://seu-dominio.netlify.app

# Admin
ADMIN_EMAIL
ADMIN_PASSWORD_HASH # Gerar com bcrypt

# App
TENANT_ID
NODE_ENV=production
```

### 3. Configurar WhatsApp Webhook

Após o deploy, configurar no Meta Business:
- URL do Webhook: `https://seu-app.netlify.app/api/webhook/whatsapp`
- Token de Verificação: Mesmo valor de `WHATSAPP_VERIFY_TOKEN`

## 🧪 Testes Essenciais

### 1. Testes Locais (ANTES do deploy)

```bash
# 1. Build de produção
npm run build

# 2. Testar localmente
npm start

# 3. Verificar saúde
curl http://localhost:3000/api/health

# 4. Testar autenticação
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"test"}'

# 5. Testar webhook WhatsApp
curl -X GET "http://localhost:3000/api/webhook/whatsapp?hub.mode=subscribe&hub.verify_token=SEU_TOKEN&hub.challenge=test"
```

### 2. Testes Pós-Deploy

```bash
# 1. Health check
curl https://seu-app.netlify.app/api/health

# 2. Verificar variáveis de ambiente
# O health check deve retornar status de todas as integrações

# 3. Testar WhatsApp
# Enviar mensagem para o número configurado

# 4. Verificar logs na Netlify
# Dashboard > Functions > Logs
```

## 🚀 Processo de Deploy

### 1. Preparação do Código

```bash
# 1. Criar branch de produção
git checkout -b production-deploy

# 2. Remover console.logs
# Usar script ou fazer manualmente

# 3. Adicionar netlify.toml
# Copiar configuração acima

# 4. Commit
git add .
git commit -m "Preparar para deploy Netlify"
git push origin production-deploy
```

### 2. Deploy na Netlify

1. **Conectar repositório**
   - New site from Git
   - Escolher repositório
   - Branch: production-deploy

2. **Configurar build**
   - Build command: `npm run build`
   - Publish directory: `.next`

3. **Adicionar variáveis de ambiente**
   - Copiar TODAS do checklist acima

4. **Deploy**
   - Trigger deploy
   - Monitorar logs

### 3. Pós-Deploy

1. **Configurar domínio customizado** (se tiver)
2. **Ativar HTTPS**
3. **Configurar webhooks do WhatsApp**
4. **Testar todas as funcionalidades**

## ⚠️ Limitações na Netlify

### Funcionalidades que NÃO funcionarão:

1. **WebSockets** - Sem suporte
2. **Long-running processes** - Timeout de 26 segundos
3. **Arquivos grandes** - Limite de 25MB para uploads
4. **Background jobs** - Usar Netlify Scheduled Functions

### Alternativas Recomendadas:

- **Para WebSockets**: Usar serviço externo (Pusher, Ably)
- **Para jobs longos**: Usar queue externa (AWS SQS, Redis Queue)
- **Para uploads grandes**: Upload direto para Firebase Storage

## 📊 Monitoramento

### 1. Configurar Alertas

```javascript
// lib/monitoring/alerts.ts
export const checkHealth = async () => {
  const response = await fetch('https://seu-app.netlify.app/api/health');
  if (!response.ok) {
    // Enviar alerta (email, Slack, etc)
  }
};
```

### 2. Logs e Métricas

- **Netlify Analytics**: Ativar no dashboard
- **Function logs**: Dashboard > Functions > Logs
- **Error tracking**: Implementar Sentry (TODO no código)

## 🔥 Problemas Comuns e Soluções

### 1. "Function timeout"
- Reduzir timeout do OpenAI para 20s
- Implementar resposta parcial

### 2. "Firebase permission denied"
- Verificar service account
- Checar regras do Firestore

### 3. "WhatsApp webhook failing"
- Verificar token de verificação
- Checar logs da function

### 4. "Build failing"
- Verificar versão do Node (20.x)
- Checar dependências

## 📝 Checklist Final

- [ ] Todos os console.logs removidos
- [ ] Variáveis de ambiente configuradas
- [ ] netlify.toml criado
- [ ] Build local funcionando
- [ ] Health check retornando OK
- [ ] WhatsApp webhook verificado
- [ ] Autenticação testada
- [ ] Firestore conectado
- [ ] OpenAI funcionando
- [ ] Rate limiting ativo

## 🆘 Suporte

Se encontrar problemas:

1. Verificar logs: Netlify Dashboard > Functions > Logs
2. Testar localmente com ambiente de produção
3. Verificar status das integrações: `/api/health`
4. Revisar variáveis de ambiente

---

**IMPORTANTE**: Este projeto foi originalmente desenvolvido para deploy em servidor tradicional. O deploy na Netlify requer adaptações e pode ter limitações de performance comparado a um servidor dedicado.