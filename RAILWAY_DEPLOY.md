# 🚀 Deploy LocAI no Railway

## 📋 Visão Geral

Este guia mostra como fazer deploy do app LocAI completo no Railway, onde o Baileys funciona perfeitamente em ambiente persistente.

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

⚠️ **IMPORTANTE: O Railway agora usa Node.js 20 automaticamente** (configurado via `nixpacks.toml`)

No Railway Dashboard, adicione todas as variáveis do Netlify:

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-service@your-project.iam.gserviceaccount.com
FIREBASE_PROJECT_ID=your-project-id

# OpenAI
OPENAI_API_KEY=sk-your-openai-key

# App Config
DEFAULT_TENANT_ID=your-tenant-id
NEXT_PUBLIC_APP_URL=https://your-app.up.railway.app

# WhatsApp (Baileys funcionará automaticamente)
# Não precisa de WHATSAPP_USE_CLOUD_API - Baileys é padrão no Railway

# Stripe (se usar)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_or_test
STRIPE_SECRET_KEY=sk_live_or_test

# Outros
NODE_ENV=production
```

### 4. Obter URL do Deploy

- Railway fornece uma URL como: `https://locai-production-xxxx.up.railway.app`
- Esta será sua nova URL de produção

## ✅ **O que funciona automaticamente:**

- ✅ **Baileys WhatsApp Web** - conexões persistentes
- ✅ **QR codes reais** - geração nativa
- ✅ **Sofia AI** - processamento completo
- ✅ **Firebase** - todas as operações
- ✅ **Dashboard** - interface completa
- ✅ **Multi-tenant** - isolamento perfeito
- ✅ **Sessões persistentes** - salvam automaticamente

## 🔧 Configurações Railway

O arquivo `railway.json` já está configurado:

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "numReplicas": 1,
    "sleepApplication": false,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

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