# WhatsApp Business API Setup Guide

## Por que mudamos de Baileys para WhatsApp Cloud API?

**Baileys (WhatsApp Web)** não funciona em ambientes serverless como Netlify porque:
- Requer conexão WebSocket persistente
- Netlify Functions têm timeout de 10-26 segundos
- Functions são stateless e morrem após responder

**WhatsApp Cloud API** é a solução oficial que:
- Funciona via HTTP REST (compatível com serverless)
- Não requer conexão persistente
- É oficialmente suportada pelo Meta/Facebook
- Tem maior confiabilidade e recursos empresariais

## Como configurar WhatsApp Business API

### Passo 1: Criar App no Facebook Developers

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Clique em "My Apps" → "Create App"
3. Escolha "Business" como tipo
4. Preencha os detalhes do app

### Passo 2: Adicionar WhatsApp Product

1. No dashboard do app, clique em "Add Product"
2. Encontre "WhatsApp" e clique em "Set Up"
3. Você receberá:
   - **Phone Number ID**
   - **WhatsApp Business Account ID**
   - **Temporary Access Token** (válido por 24h)

### Passo 3: Configurar Webhook

1. No painel WhatsApp, vá para "Configuration" → "Webhooks"
2. Configure a URL: `https://alugazap.com/api/webhook/whatsapp-cloud`
3. Defina um **Verify Token** (ex: `locai_whatsapp_2024`)
4. Inscreva-se nos campos:
   - messages
   - message_status
   - message_template_status_update

### Passo 4: Token de Acesso Permanente

1. Vá para "System Users" no Business Settings
2. Crie um system user
3. Gere um token com permissões:
   - whatsapp_business_messaging
   - whatsapp_business_management

### Passo 5: Configurar Variáveis de Ambiente

No Netlify Dashboard, adicione:

```env
# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=seu_phone_number_id
WHATSAPP_ACCESS_TOKEN=seu_access_token_permanente
WHATSAPP_VERIFY_TOKEN=locai_whatsapp_2024
WHATSAPP_BUSINESS_ACCOUNT_ID=seu_business_account_id

# Desabilitar Baileys (não funciona em serverless)
WHATSAPP_USE_BAILEYS=false
```

### Passo 6: Verificar Número de Telefone

1. No painel WhatsApp, vá para "Phone Numbers"
2. Adicione seu número comercial
3. Verifique via SMS ou chamada
4. Aguarde aprovação (pode levar algumas horas)

## Templates de Mensagem

Para enviar mensagens fora da janela de 24h, você precisa usar templates aprovados:

1. Vá para "Message Templates"
2. Crie templates em português (pt_BR)
3. Exemplos úteis:
   - Boas-vindas
   - Confirmação de reserva
   - Lembrete de check-in
   - Avaliação pós-estadia

## Limitações e Custos

### Grátis:
- 1.000 conversas iniciadas por negócio/mês
- Conversas iniciadas pelo usuário ilimitadas (24h)

### Pago:
- ~$0.05 USD por conversação iniciada pelo negócio
- Preços variam por país

## Testando a Integração

### 1. Teste de Envio
```bash
curl -X POST https://alugazap.com/api/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{
    "to": "5511999999999",
    "message": "Teste de integração WhatsApp"
  }'
```

### 2. Teste de Webhook
Use o Facebook Webhook Tester no painel do desenvolvedor

## Migração de Baileys para Cloud API

### O que muda:
- ❌ Não há mais QR Code para escanear
- ✅ Configuração única via dashboard do Facebook
- ✅ Maior confiabilidade
- ✅ Funciona em serverless
- ✅ Suporte oficial

### O que permanece:
- ✅ Envio de mensagens de texto
- ✅ Envio de imagens
- ✅ Recebimento de mensagens
- ✅ Integração com IA

## Troubleshooting

### Erro: Token Inválido
- Verifique se o token não expirou (24h para temporário)
- Gere um token permanente via System User

### Erro: Número não verificado
- Complete a verificação no painel Phone Numbers
- Aguarde aprovação do Meta

### Erro: Template não aprovado
- Templates levam até 24h para aprovação
- Evite conteúdo promocional excessivo

## Suporte

- [Documentação Oficial](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [Status API](https://developers.facebook.com/status/dashboard/)
- [Community Forum](https://developers.facebook.com/community/)