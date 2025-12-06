# Facebook & Instagram Integration - Documentação Completa

## Visão Geral

Este documento descreve a integração completa com Facebook Messenger e Instagram Direct Messages para o sistema Locai.

### Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         Meta Apps                                │
│  ┌─────────────┐                           ┌─────────────────┐  │
│  │   Facebook  │                           │   Instagram     │  │
│  │   Messenger │                           │   Direct        │  │
│  └──────┬──────┘                           └────────┬────────┘  │
└─────────┼──────────────────────────────────────────┼────────────┘
          │                                          │
          │ Webhook                                  │ Webhook
          ▼                                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    /api/facebook/webhook                         │
│                    (Handles both FB + IG)                        │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                  FacebookMessageHandler                          │
│  ┌───────────────────┐         ┌───────────────────┐           │
│  │ FacebookService   │         │ InstagramService  │           │
│  │ - sendText()      │         │ - sendText()      │           │
│  │ - getUserProfile()│         │ - getUserProfile()│           │
│  └───────────────────┘         └───────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. Configuração do Meta App

### 1.1 Criar App no Meta for Developers

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Criar novo app → Tipo: **Business**
3. Adicionar produtos:
   - **Messenger** (para Facebook DMs)
   - **Instagram** (para Instagram DMs)
   - **Webhooks** (para receber mensagens)

### 1.2 Configurar Permissões

No App Review, solicitar as seguintes permissões:

**Para Facebook Messenger:**
- `pages_messaging` - Enviar/receber mensagens
- `pages_show_list` - Listar páginas do usuário
- `pages_manage_metadata` - Gerenciar webhooks

**Para Instagram Direct:**
- `instagram_basic` - Informações básicas do perfil
- `instagram_manage_messages` - Enviar/receber DMs
- `instagram_manage_comments` - Gerenciar comentários (opcional)

**Para Instagram Direct Login (OAuth direto):**
- `instagram_business_basic` - Informações do perfil
- `instagram_business_manage_messages` - DMs
- `instagram_business_manage_comments` - Comentários

---

## 2. Variáveis de Ambiente

### Adicionar ao `.env`:

```env
# === Meta App Configuration ===
NEXT_PUBLIC_FACEBOOK_APP_ID=your_app_id
FACEBOOK_APP_SECRET=your_app_secret

# === Webhook Verification ===
FACEBOOK_WEBHOOK_VERIFY_TOKEN=your_custom_verify_token

# === OAuth Redirect URIs ===
FACEBOOK_OAUTH_REDIRECT_URI=https://yourdomain.com/api/facebook/oauth/callback
INSTAGRAM_OAUTH_REDIRECT_URI=https://yourdomain.com/api/instagram/oauth/callback

# === Cron Job Security ===
CRON_SECRET=your_cron_secret_for_token_refresh

# === App URL (for redirects) ===
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# === Optional: Test Tokens (development only) ===
# FACEBOOK_TEST_TOKEN=EAAxxxxxxxx (Page Access Token for testing)
# INSTAGRAM_TEST_TOKEN=IGAAAAxxxx (Instagram User Token for testing)
```

---

## 3. Configurar Webhooks no Meta Dashboard

### 3.1 Facebook Messenger Webhook

1. No Meta App Dashboard → Messenger → Settings
2. Callback URL: `https://yourdomain.com/api/facebook/webhook`
3. Verify Token: `FACEBOOK_WEBHOOK_VERIFY_TOKEN` do .env
4. Subscription Fields:
   - `messages`
   - `messaging_postbacks`
   - `messaging_optins`
   - `message_deliveries`
   - `message_reads`

### 3.2 Instagram Webhook

1. No Meta App Dashboard → Instagram → Webhooks
2. Callback URL: mesmo endpoint (`/api/facebook/webhook`)
3. Verify Token: mesmo token
4. Subscription Fields:
   - `messages`
   - `messaging_postbacks`
   - `message_reactions`

---

## 4. Fluxos de Autenticação

### 4.1 Facebook OAuth Flow

```
Usuário clica "Conectar Facebook"
         │
         ▼
GET /api/facebook/oauth/start
         │
         ▼
Redirect → Facebook Login Dialog
         │
         ▼
Usuário autoriza permissões
         │
         ▼
Callback → /api/facebook/oauth/callback
         │
         ├─ Exchange code for User Token
         ├─ Exchange for Long-Lived Token (60 dias)
         ├─ Get Pages list
         │
         ▼
Redirect → Settings page with pages selection
         │
         ▼
POST /api/facebook/auth (selectedPageId)
         │
         ├─ Exchange User Token for Page Token
         ├─ Subscribe page to webhooks
         ├─ Save to Firestore
         │
         ▼
Facebook conectado!
```

### 4.2 Instagram OAuth Flow (Direct Login)

```
Usuário clica "Conectar Instagram"
         │
         ▼
GET /api/instagram/oauth/start
         │
         ▼
Redirect → Instagram Authorization Dialog
         │
         ▼
Usuário autoriza permissões
         │
         ▼
Callback → /api/instagram/oauth/callback
         │
         ├─ Exchange code for Short-Lived Token
         ├─ Exchange for Long-Lived Token (60 dias)
         ├─ Get User Profile
         ├─ Save to Firestore
         │
         ▼
Instagram conectado!
```

### 4.3 Instagram via Facebook Page (Método Legado)

```
Facebook já conectado
         │
         ▼
GET /api/instagram/accounts
         │
         ├─ Get Instagram Business Account linked to Page
         │
         ▼
POST /api/instagram/auth
         │
         ├─ Save Instagram settings (using Page Token)
         │
         ▼
Instagram conectado via Page!
```

---

## 5. Rotas da API

### Facebook

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/facebook/oauth/start` | Inicia OAuth do Facebook |
| GET | `/api/facebook/oauth/callback` | Callback do OAuth |
| POST | `/api/facebook/auth` | Conecta página selecionada |
| DELETE | `/api/facebook/auth` | Desconecta Facebook |
| GET | `/api/facebook/status` | Status da conexão |
| GET | `/api/facebook/pages` | Lista páginas (usa test token) |
| GET/POST | `/api/facebook/webhook` | Webhook de mensagens |
| POST | `/api/facebook/token/refresh` | Renova tokens (cron) |

### Instagram

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/instagram/oauth/start` | Inicia OAuth do Instagram |
| GET | `/api/instagram/oauth/callback` | Callback do OAuth |
| POST | `/api/instagram/auth` | Conecta conta Instagram |
| DELETE | `/api/instagram/auth` | Desconecta Instagram |
| GET | `/api/instagram/status` | Status da conexão |
| GET | `/api/instagram/accounts` | Lista contas IG da Page |
| POST | `/api/instagram/token/refresh` | Renova tokens (cron) |

---

## 6. Serviços

### FacebookService (`lib/services/facebook-service.ts`)

```typescript
class FacebookService {
  sendText(recipientId, text, tenantId): Promise<SendResult>
  sendImage(recipientId, imageUrl, tenantId): Promise<SendResult>
  getUserProfile(userId, tenantId): Promise<UserProfile | null>
  subscribeToWebhooks(pageId, accessToken): Promise<boolean>
}
```

### InstagramService (`lib/services/instagram-service.ts`)

```typescript
class InstagramService {
  sendText(recipientId, text, tenantId): Promise<SendResult>
  sendImage(recipientId, imageUrl, tenantId): Promise<SendResult>
  getUserProfile(userId, tenantId): Promise<UserProfile | null>
  getAccountInfo(tenantId): Promise<AccountInfo | null>
}
```

### FacebookMessageHandler (`lib/facebook/message-handler.ts`)

```typescript
class FacebookMessageHandler {
  handleWebhook(body): Promise<void>
  // Processa mensagens de ambos FB e IG
  // Determina canal pelo body.object ('page' ou 'instagram')
  // Usa serviço apropriado para respostas
}
```

---

## 7. Estrutura de Dados (Firestore)

### Settings do Tenant

```typescript
// tenants/{tenantId}/settings/company
{
  facebook: {
    connected: boolean,
    pageId: string,
    pageName: string,
    pageAccessToken: string,        // Long-lived (60 dias)
    webhookSubscribed: boolean,
    tokenExpiresAt: Date,
    updatedAt: Date
  },
  instagram: {
    connected: boolean,
    businessAccountId: string,
    username: string,
    name: string,
    profilePictureUrl: string,
    accountType: string,            // 'BUSINESS' | 'CREATOR'
    followersCount: number,
    authMethod: 'instagram_login' | 'facebook_page',
    accessToken: string,            // Apenas para instagram_login
    pageAccessToken: string,        // Apenas para facebook_page
    pageId: string,                 // Apenas para facebook_page
    tokenExpiresAt: Date,
    updatedAt: Date
  }
}
```

---

## 8. Checklist de Configuração

### Meta App Dashboard

- [ ] App criado no Meta for Developers
- [ ] Produto Messenger adicionado
- [ ] Produto Instagram adicionado
- [ ] Webhooks configurados com URL e verify token
- [ ] Permissões solicitadas no App Review:
  - [ ] `pages_messaging`
  - [ ] `pages_show_list`
  - [ ] `pages_manage_metadata`
  - [ ] `instagram_basic`
  - [ ] `instagram_manage_messages`
  - [ ] `instagram_business_basic`
  - [ ] `instagram_business_manage_messages`

### Variáveis de Ambiente

- [ ] `NEXT_PUBLIC_FACEBOOK_APP_ID` configurado
- [ ] `FACEBOOK_APP_SECRET` configurado
- [ ] `FACEBOOK_WEBHOOK_VERIFY_TOKEN` configurado
- [ ] `FACEBOOK_OAUTH_REDIRECT_URI` configurado
- [ ] `INSTAGRAM_OAUTH_REDIRECT_URI` configurado
- [ ] `CRON_SECRET` configurado
- [ ] `NEXT_PUBLIC_APP_URL` configurado

### Valid Redirect URIs no Meta Dashboard

- [ ] `https://yourdomain.com/api/facebook/oauth/callback` adicionado
- [ ] `https://yourdomain.com/api/instagram/oauth/callback` adicionado
- [ ] `https://localhost:3000/api/facebook/oauth/callback` (dev)
- [ ] `https://localhost:3000/api/instagram/oauth/callback` (dev)

### Webhooks Subscriptions

- [ ] Webhook URL verificado com sucesso
- [ ] Facebook Page subscribed to app
- [ ] Instagram account subscribed to webhooks

### Cron Jobs

- [ ] `/api/facebook/token/refresh` rodando semanalmente
- [ ] `/api/instagram/token/refresh` rodando semanalmente
- [ ] Header `x-cron-secret` configurado nas chamadas

---

## 9. Fluxo de Testes

### 9.1 Testar Facebook OAuth

1. Acesse `/dashboard/settings/whatsapp`
2. Clique em "Conectar com Facebook"
3. Autorize no popup do Facebook
4. Selecione uma página
5. Verifique no Firestore se `facebook.connected = true`

### 9.2 Testar Instagram OAuth

1. Acesse `/dashboard/settings/whatsapp`
2. Clique em "Conectar Instagram"
3. Autorize no popup do Instagram
4. Verifique no Firestore se `instagram.connected = true`

### 9.3 Testar Webhook

```bash
# Simular mensagem do Facebook
curl -X POST https://yourdomain.com/api/facebook/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "page",
    "entry": [{
      "messaging": [{
        "sender": { "id": "USER_PSID" },
        "message": { "text": "Hello" }
      }]
    }]
  }'

# Simular mensagem do Instagram
curl -X POST https://yourdomain.com/api/facebook/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "object": "instagram",
    "entry": [{
      "messaging": [{
        "sender": { "id": "USER_IGSID" },
        "message": { "text": "Hello from IG" }
      }]
    }]
  }'
```

### 9.4 Testar Token Refresh

```bash
# Refresh Facebook tokens
curl -X POST https://yourdomain.com/api/facebook/token/refresh \
  -H "x-cron-secret: YOUR_CRON_SECRET"

# Refresh Instagram tokens
curl -X POST https://yourdomain.com/api/instagram/token/refresh \
  -H "x-cron-secret: YOUR_CRON_SECRET"
```

---

## 10. Troubleshooting

### Erro: "Invalid OAuth access token"

**Causa:** Token expirado ou inválido
**Solução:**
1. Verificar se o token não expirou (60 dias)
2. Re-conectar via OAuth
3. Verificar se FACEBOOK_APP_SECRET está correto

### Erro: "pages_read_engagement permission required"

**Causa:** Usando endpoint que requer permissão não concedida
**Solução:**
1. Usar `/me/accounts` ao invés de `/me/accounts?fields=instagram_business_account`
2. Solicitar permissão no App Review

### Erro: "Webhook verification failed"

**Causa:** Verify token não corresponde
**Solução:**
1. Verificar FACEBOOK_WEBHOOK_VERIFY_TOKEN no .env
2. Verificar se a URL está acessível publicamente
3. Verificar se retorna 200 com hub.challenge

### Erro: "Message failed to send"

**Causa:** Várias possíveis
**Solução:**
1. Verificar se o usuário iniciou conversa nas últimas 24h (regra do Meta)
2. Verificar se a página está subscrita aos webhooks
3. Verificar permissões do Page Access Token

---

## 11. Arquivos Criados/Modificados

### Novos Arquivos

```
app/api/facebook/oauth/start/route.ts
app/api/facebook/oauth/callback/route.ts
app/api/facebook/token/refresh/route.ts
app/api/instagram/oauth/start/route.ts
app/api/instagram/oauth/callback/route.ts
app/api/instagram/token/refresh/route.ts
lib/services/instagram-service.ts
```

### Arquivos Modificados

```
app/api/facebook/auth/route.ts
app/api/instagram/auth/route.ts
app/api/instagram/status/route.ts
app/dashboard/settings/whatsapp/page.tsx
lib/facebook/message-handler.ts
lib/services/settings-service.ts
```

---

## 12. Próximos Passos

1. **Solicitar App Review** - Submeter app para revisão com todas as permissões
2. **Configurar Cron Jobs** - Agendar refresh de tokens semanalmente
3. **Monitoramento** - Implementar alertas para tokens expirando
4. **Métricas** - Adicionar tracking de mensagens enviadas/recebidas
5. **Testes E2E** - Criar testes automatizados para fluxos de conexão

---

*Última atualização: Dezembro 2025*
