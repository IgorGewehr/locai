# Configuração da Integração Facebook & Instagram

## 🔧 Problema Identificado e Solução

### O que Significa o Erro "Invalid Scopes"

O erro:
```
Invalid Scopes: instagram_manage_messages, pages_read_engagement.
This message is only shown to developers.
```

**NÃO significa que essas permissões são inválidas!** Essas são permissões oficiais da Meta.

**Significa que você precisa ADICIONAR essas permissões ao Use Case do seu App no Facebook Developer Dashboard primeiro!**

### Solução Aplicada no Código (✅ Já Feito)

Atualizei `app/dashboard/settings/whatsapp/page.tsx:351` com as permissões corretas conforme documentação oficial:

```typescript
// Permissões oficiais do Messenger Platform
const scopes = [
  'pages_messaging',              // ✅ Required - Enviar/receber mensagens via Messenger
  'pages_show_list',              // ✅ Required - Listar páginas do usuário
  'instagram_manage_messages',    // ⚠️ Optional - Gerenciar mensagens do Instagram
  'pages_read_engagement',        // ⚠️ Optional - Ler conteúdo e engajamento da página
  'instagram_basic'               // ⚠️ Optional - Informações básicas do Instagram
].join(',');
```

---

## 📋 PASSO A PASSO: Adicionar Permissões no Facebook Dashboard

### Passo 1: Acessar o Use Case de Messenger

1. Acesse: https://developers.facebook.com/apps/
2. Selecione seu App
3. No menu lateral, clique em **"Use cases"** > **"Customize"**
4. Clique em **"Customize the Engage with customers on Messenger from Meta use case"**

### Passo 2: Adicionar Permissões Necessárias

Na seção **"Permissions and features"**, você verá uma tabela. Adicione as seguintes permissões:

| Permissão | Status Atual | Ação Necessária |
|-----------|--------------|-----------------|
| `pages_messaging` | ✅ Required (já incluída) | Nenhuma ação |
| `pages_show_list` | ✅ Required (já incluída) | Nenhuma ação |
| `business_management` | ✅ Required (já incluída) | Nenhuma ação |
| `instagram_manage_messages` | ⚠️ Optional | **Clique em "Add"** |
| `pages_read_engagement` | ⚠️ Optional | **Clique em "Add"** |
| `instagram_basic` | ⚠️ Optional | **Clique em "Add"** |

**Como adicionar:**
1. Encontre cada permissão na tabela
2. Clique no botão **"Add"** à direita
3. Uma confirmação aparecerá - clique em **"Confirm"**

### Passo 3: Configurar o Use Case de Instagram (Opcional mas Recomendado)

Se você também quer mensagens do Instagram:

1. No menu **"Use cases"**, clique em **"Customize"**
2. Selecione **"Manage messages and content on Instagram"**
3. Escolha a configuração:
   - **"API Setup with Instagram Login"** (usuários logam com Instagram) OU
   - **"API Setup with Facebook Login"** (usuários logam com Facebook - RECOMENDADO)
4. Clique em **"Add all required permissions"**

Isso automaticamente adiciona:
- `business_management`
- `instagram_basic`
- `instagram_manage_messages`
- `pages_read_engagement`
- `pages_show_list`

---

## 🔗 Configurar Webhooks

### Webhook do Messenger

1. Vá para **Products > Messenger > Settings > Webhooks**
2. Clique em **"Add Callback URL"**
3. Preencha:
   ```
   Callback URL: https://SEU_DOMINIO.com/api/facebook/webhook
   Verify Token: gGN2nsle3GBw67Eyzg4uUfhnig3NH7jm9nDw2FWnje4=
   ```
   ⚠️ Use o mesmo valor da env var `N8N_WEBHOOK_SECRET` (já configurado no seu .env)

4. Clique em **"Verify and Save"**

5. Clique em **"Add Subscriptions"** e selecione:
   - ✅ `messages`
   - ✅ `messaging_postbacks`
   - ✅ `messaging_optins`
   - ✅ `message_deliveries`
   - ✅ `message_reads`

### Webhook do Instagram

1. Vá para **Products > Instagram > Settings > Webhooks**
2. Use a **mesma Callback URL e Verify Token** (gGN2nsle3GBw67Eyzg4uUfhnig3NH7jm9nDw2FWnje4=)
3. Clique em **"Add Subscriptions"** e selecione:
   - ✅ `messages`
   - ✅ `messaging_postbacks`
   - ✅ `message_reactions`

---

## 🔗 Conectar Página do Facebook ao App

### Gerar Access Tokens

1. Vá para **Products > Messenger > Settings**
2. Na seção **"Access Tokens"**, clique em **"Connect to a Page"** ou **"Add or Remove Pages"**
3. Faça login (se necessário)
4. Selecione as Páginas que você quer conectar
5. Autorize todas as permissões solicitadas
6. Clique em **"Done"**

### Vincular Instagram à Página (Obrigatório para Instagram Messaging)

O Instagram Direct só funciona se a conta estiver vinculada a uma Página do Facebook:

1. Acesse a sua **Página do Facebook** (não o Facebook Developer)
2. Vá em **Configurações da Página**
3. No menu lateral, clique em **"Instagram"**
4. Clique em **"Conectar conta"** ou **"Vincular Conta"**
5. Faça login na sua conta **Business/Creator do Instagram**
6. Autorize a conexão

⚠️ **Importante:** A conta do Instagram DEVE ser do tipo **Business** ou **Creator** (não funciona com conta pessoal).

---

## 🔐 Variáveis de Ambiente

Configure estas variáveis no seu `.env`:

```bash
# Facebook App Configuration
NEXT_PUBLIC_FACEBOOK_APP_ID=seu_app_id_aqui
FACEBOOK_APP_SECRET=seu_app_secret_aqui

# Webhook Verify Token (compartilhado entre N8N e Facebook/Instagram)
N8N_WEBHOOK_SECRET=gGN2nsle3GBw67Eyzg4uUfhnig3NH7jm9nDw2FWnje4=

# (Opcional) Token de uma página específica
FACEBOOK_PAGE_ACCESS_TOKEN=seu_page_token_aqui
```

**Onde encontrar:**
- **App ID:** Facebook Developers > Settings > Basic > App ID
- **App Secret:** Facebook Developers > Settings > Basic > App Secret (clique em "Show")
- **N8N_WEBHOOK_SECRET:** ✅ Já configurado no seu .env com o valor `gGN2nsle3GBw67Eyzg4uUfhnig3NH7jm9nDw2FWnje4=`

---

## 🎭 Development Mode vs Live Mode

### Development Mode (Padrão)

- ✅ Não precisa de aprovação de permissões
- ⚠️ Apenas usuários com **Roles** (Admin, Developer, Tester) conseguem autenticar
- 🧪 Ideal para testes

**Para adicionar testadores:**
1. Vá em **Roles** > **Roles**
2. Clique em **"Add People"**
3. Adicione como **Developer** ou **Tester**

### Live Mode (Produção)

- ✅ Qualquer pessoa pode autenticar
- ⚠️ Requer **App Review** para permissões avançadas
- 🚀 Para apps em produção

**Para mudar para Live:**
1. Vá em **Settings > Basic**
2. No topo da página, mude o switch de **"In development"** para **"Live"**
3. Confirme a mudança

---

## 🧪 Testando a Integração

### Teste 1: Verificar Webhook

```bash
curl -X GET "https://SEU_DOMINIO.com/api/facebook/webhook?hub.mode=subscribe&hub.verify_token=gGN2nsle3GBw67Eyzg4uUfhnig3NH7jm9nDw2FWnje4=&hub.challenge=test123"
```

**Esperado:** Retorna `test123`

### Teste 2: Enviar Mensagem no Messenger

1. Acesse sua Página do Facebook
2. Clique em **"Send Message"** ou **"Enviar Mensagem"**
3. Envie uma mensagem de teste
4. Verifique os logs do servidor
5. Acesse `https://seu-dominio.com/dashboard/conversas`
6. A mensagem deve aparecer lá com `channel: 'facebook'`

### Teste 3: Enviar Mensagem no Instagram Direct

1. Acesse o perfil do Instagram vinculado à sua Página
2. Envie uma mensagem Direct para a conta
3. Verifique se aparece em `/dashboard/conversas` com `channel: 'instagram'`

### Teste 4: Ver Logs de Webhook

No Facebook Developers:

1. Vá em **Products > Messenger > Settings > Webhooks**
2. Role até **"Recent Deliveries"**
3. Você verá todas as mensagens recebidas e o status HTTP de cada uma

---

## 🐛 Troubleshooting

### ❌ Erro: "Invalid Scopes: instagram_manage_messages, pages_read_engagement"

**Causa:** As permissões não foram adicionadas ao Use Case do app.

**Solução:**
1. Vá em **Use cases > Customize > Engage with customers on Messenger**
2. Na tabela de permissões, clique em **"Add"** para:
   - `instagram_manage_messages`
   - `pages_read_engagement`
   - `instagram_basic`
3. Tente autenticar novamente

---

### ❌ Erro: "This message is only shown to developers"

**Causa:** Seu app está em **Development Mode** e o usuário não tem uma role no app.

**Solução:**
- **Opção 1 (Testes):** Adicione o usuário como **Tester** ou **Developer** em **Roles**
- **Opção 2 (Produção):** Mude o app para **Live Mode** em **Settings > Basic**

---

### ❌ Webhook não recebe mensagens

**Checklist:**
- [ ] Webhook está verificado (check verde no dashboard)
- [ ] Eventos corretos estão subscritos (`messages`, etc.)
- [ ] Callback URL está acessível publicamente (não localhost)
- [ ] Página está conectada ao app (**Messenger > Settings > Access Tokens**)
- [ ] (Instagram) Conta do Instagram está vinculada à Página
- [ ] Variável de ambiente `N8N_WEBHOOK_SECRET` está correta (gGN2nsle3GBw67Eyzg4uUfhnig3NH7jm9nDw2FWnje4=)

**Verificar logs:**
```bash
# No servidor
tail -f logs/app.log | grep "Facebook webhook"
```

---

### ❌ Instagram Direct não funciona

**Requisitos:**
- [ ] Conta do Instagram é **Business** ou **Creator** (não pessoal)
- [ ] Instagram está vinculado a uma Página do Facebook
- [ ] Use Case "Manage messages and content on Instagram" está configurado
- [ ] Permissão `instagram_manage_messages` foi adicionada
- [ ] Webhook do Instagram está configurado e verificado

---

### ❌ Mensagens aparecem mas Sofia AI não responde

**Checklist:**
- [ ] Webhook está salvando mensagens no Firestore (verifique `conversations/{id}/messages`)
- [ ] Variáveis de ambiente do N8N estão configuradas
- [ ] `lib/facebook/message-handler.ts` está sendo chamado
- [ ] `AIService` está funcionando (teste com WhatsApp primeiro)

**Verificar logs:**
```typescript
// No arquivo webhook/route.ts, linha 42
logger.info('Processing Facebook message', {
  tenantId,
  pageId,
  senderId
});
```

---

## 📚 Documentação Oficial

- [Messenger Platform - Sending Messages](https://developers.facebook.com/docs/messenger-platform/send-messages)
- [Instagram Messaging API](https://developers.facebook.com/docs/messenger-platform/instagram)
- [Permissions Reference](https://developers.facebook.com/docs/permissions/reference)
- [Webhooks for Messenger](https://developers.facebook.com/docs/messenger-platform/webhooks)
- [App Review Guidelines](https://developers.facebook.com/docs/app-review)

---

## ✅ Checklist Completo

Antes de testar, confirme:

### Configuração do App
- [ ] App do Facebook criado
- [ ] Produto **"Messenger"** adicionado
- [ ] Produto **"Instagram"** adicionado (se usar Instagram)
- [ ] Use Case **"Engage with customers on Messenger"** configurado
- [ ] Use Case **"Manage messages and content on Instagram"** configurado (se usar)

### Permissões
- [ ] `pages_messaging` ✅ (required)
- [ ] `pages_show_list` ✅ (required)
- [ ] `business_management` ✅ (required)
- [ ] `instagram_manage_messages` ➕ (adicionada manualmente)
- [ ] `pages_read_engagement` ➕ (adicionada manualmente)
- [ ] `instagram_basic` ➕ (adicionada manualmente)

### Webhooks
- [ ] Callback URL configurada e verificada (Messenger)
- [ ] Callback URL configurada e verificada (Instagram)
- [ ] Eventos subscritos: `messages`, `messaging_postbacks`, etc.

### Conexões
- [ ] Página do Facebook conectada ao app
- [ ] Access Token da página gerado
- [ ] (Instagram) Conta Business/Creator vinculada à Página
- [ ] (Instagram) Perfil aparece em **Messenger > Settings > Access Tokens**

### Ambiente
- [ ] `NEXT_PUBLIC_FACEBOOK_APP_ID` configurado
- [ ] `FACEBOOK_APP_SECRET` configurado
- [ ] `N8N_WEBHOOK_SECRET` configurado (✅ já está: gGN2nsle3GBw67Eyzg4uUfhnig3NH7jm9nDw2FWnje4=)
- [ ] Código atualizado com permissões corretas (✅ já feito)

### Testes
- [ ] App em **Development Mode** com testadores adicionados OU em **Live Mode**
- [ ] Webhook GET retorna o challenge
- [ ] Mensagem de teste no Messenger aparece em `/dashboard/conversas`
- [ ] (Instagram) Mensagem no Direct aparece em `/dashboard/conversas`
- [ ] Sofia AI responde automaticamente

---

## 🎉 Resumo

**O que foi corrigido:**
- ✅ Permissões do código atualizadas para as oficiais da documentação Meta
- ✅ Guia completo criado com passo a passo

**O que VOCÊ precisa fazer:**
1. No Facebook Developer Dashboard, vá em **Use cases > Customize > Messenger**
2. Na tabela de permissões, clique em **"Add"** para:
   - `instagram_manage_messages`
   - `pages_read_engagement`
   - `instagram_basic`
3. Configure os webhooks (Messenger e Instagram)
4. Conecte sua Página ao app
5. Vincule o Instagram à Página (se usar Instagram Direct)
6. Adicione testadores se estiver em Development Mode
7. Teste enviando mensagens!

**Arquivos atualizados:**
- `app/dashboard/settings/whatsapp/page.tsx:351` - Permissões corretas
- `FACEBOOK_INSTAGRAM_SETUP.md` - Guia completo atualizado

Agora sim, deve funcionar! 🚀
