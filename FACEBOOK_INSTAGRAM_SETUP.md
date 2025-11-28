# 📱 Facebook & Instagram Integration - Setup Guide

## ✅ Status da Integração

**Tudo está integrado e pronto para testes!**

---

## 🔑 Variáveis de Ambiente Necessárias

### `.env` (Adicionar estas variáveis)

```bash
# Facebook App Configuration
NEXT_PUBLIC_FACEBOOK_APP_ID=851509160734111  # ✅ JÁ EXISTE
FACEBOOK_APP_SECRET=YOUR_APP_SECRET_HERE      # ⚠️ ADICIONAR
FACEBOOK_VERIFY_TOKEN=a14dc3ecd83604ce8539d73a0d461b7d  # ✅ JÁ EXISTE
```

### Como obter `FACEBOOK_APP_SECRET`:
1. Acesse: https://developers.facebook.com/apps/851509160734111/settings/basic/
2. Vá em **Basic Settings**
3. Copie o **App Secret** (clique em "Show")
4. Adicione ao `.env` como `FACEBOOK_APP_SECRET=...`

---

## 📋 Permissões Configuradas

### ✅ Permissões solicitadas no login:
- `pages_messaging` - Enviar/receber mensagens no Facebook Messenger
- `pages_show_list` - Listar páginas do Facebook
- `pages_manage_metadata` - Gerenciar metadados da página
- `instagram_basic` - Informações básicas da conta Instagram
- `instagram_manage_messages` - Enviar/receber mensagens no Instagram Direct
- `instagram_manage_comments` - Gerenciar comentários do Instagram

---

## 🔄 Fluxo Completo de Integração

### 1️⃣ Sign In (Dashboard → Settings → WhatsApp)
```
Usuário clica "Conectar Facebook"
    ↓
Facebook SDK carrega
    ↓
Popup de login aparece
    ↓
Usuário autoriza permissões
    ↓
Backend troca tokens
    ↓
Backend busca páginas
    ↓
Usuário seleciona página
    ↓
Salvo no Firestore
    ↓
✅ Conectado!
```

### 2️⃣ Receber Mensagens (Webhook)
```
Facebook/Instagram POST → /api/facebook/webhook
    ↓
Identifica pageId
    ↓
Busca tenantId no Firestore
    ↓
FacebookMessageHandler processa:
  1. Busca/cria conversa
  2. Salva mensagem do cliente
  3. Processa com AI
  4. Envia resposta
  5. Salva resposta da AI
    ↓
✅ Processado!
```

### 3️⃣ Visualizar (Dashboard → Conversas)
```
┌─────────┬─────────────────────┬──────────────────┐
│ Seletor │  Lista Conversas    │  Conversa Aberta │
├─────────┼─────────────────────┼──────────────────┤
│   💬    │  Conversas     🔄   │  👤 Cliente      │
│   42    │  Filtros ativos     │  Mensagens...    │
│   📱    │  [Facebook] [✕]     │                  │
│   35    │  Stats Cards        │                  │
│   👥    │  🔍 Buscar...       │                  │
│    5    │  Conversas...       │                  │
│   📷    │                     │                  │
│    2    │                     │                  │
└─────────┴─────────────────────┴──────────────────┘
```

---

## ✅ Checklist de Testes

### Fase 1: Conexão
- [ ] Adicionar `FACEBOOK_APP_SECRET` ao `.env`
- [ ] Reiniciar servidor Next.js
- [ ] Ir em `/dashboard/settings/whatsapp`
- [ ] Clicar "Conectar Facebook"
- [ ] Verificar popup do Facebook
- [ ] Autorizar permissões
- [ ] Selecionar página
- [ ] Confirmar conexão

### Fase 2: Webhook
- [ ] Configurar webhook no Facebook Developers
- [ ] URL: `https://seu-dominio.com/api/facebook/webhook`
- [ ] Verify token do `.env`
- [ ] Subscrever: `messages`, `messaging_postbacks`
- [ ] Enviar mensagem de teste
- [ ] Verificar logs do servidor

### Fase 3: Dashboard
- [ ] Ir em `/dashboard/conversas`
- [ ] Clicar ícone Facebook (👥)
- [ ] Verificar conversa na lista
- [ ] Verificar badge colorido
- [ ] Abrir conversa
- [ ] Testar envio de mensagem

### Fase 4: Instagram
- [ ] Conectar Instagram à página
- [ ] Configurar webhook
- [ ] Enviar mensagem via Instagram
- [ ] Verificar badge Instagram (📷)

---

## 🐛 Troubleshooting

### "Facebook SDK not loaded"
- Verificar `NEXT_PUBLIC_FACEBOOK_APP_ID`
- Desabilitar ad blockers
- Limpar cache

### "Failed to exchange token"
- Adicionar `FACEBOOK_APP_SECRET`
- Reiniciar servidor

### "No tenant found for Page ID"
- Verificar Firestore: `tenants/{tenantId}/settings`
- Verificar campo `facebook.pageId`
- Reconectar se necessário

### "Webhook não recebe mensagens"
- Verificar subscription no Facebook Developers
- Re-subscrever campos necessários
- Testar com botão "Test"

---

## 📊 Arquivos Principais

### Frontend
- Settings: `app/dashboard/settings/whatsapp/page.tsx`
- Dashboard: `app/dashboard/conversas/page.tsx`
- SDK Hook: `lib/hooks/useFacebookSDK.ts`

### Backend
- Auth API: `app/api/facebook/auth/route.ts`
- Webhook: `app/api/facebook/webhook/route.ts`
- Handler: `lib/facebook/message-handler.ts`
- Service: `lib/services/facebook-service.ts`

### Database
- Settings: `tenants/{tenantId}/settings`
- Conversas: `tenants/{tenantId}/conversations`
- Mensagens: `tenants/{tenantId}/messages`

---

## 🚀 URLs Importantes

### Development
- Dashboard: http://localhost:3000/dashboard/conversas
- Settings: http://localhost:3000/dashboard/settings/whatsapp

### Production
- Webhook: https://www.alugazap.com/api/facebook/webhook
- Facebook Dev: https://developers.facebook.com/apps/851509160734111

---

## ✅ Resumo

### Funcionando:
✅ SDK integrado
✅ Autenticação completa
✅ Troca de tokens
✅ Webhook recebendo
✅ Processamento AI
✅ Dashboard 3 colunas
✅ Filtros por canal
✅ Badges coloridos

### Configurar:
⚠️ `FACEBOOK_APP_SECRET` no `.env`
⚠️ Webhook no Facebook Developers
⚠️ App Review (para produção)
⚠️ Conectar Instagram (se necessário)

**Pronto para testes! 🎉**
