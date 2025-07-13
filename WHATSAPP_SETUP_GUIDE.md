# Guia Completo de Configuração do WhatsApp Business API

Este guia detalha o passo a passo para obter todas as credenciais necessárias para integrar o WhatsApp Business API com o sistema LocAI.

## Pré-requisitos

1. **Conta no Facebook Business Manager**
2. **Número de telefone dedicado** (não pode estar registrado em WhatsApp pessoal)
3. **Domínio verificado** com HTTPS
4. **Conta verificada no Meta for Developers**

## Passo 1: Criar Conta no Meta for Developers

1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Clique em "Começar" no canto superior direito
3. Faça login com sua conta do Facebook
4. Complete o processo de verificação:
   - Adicione seu número de telefone
   - Verifique seu email
   - Aceite os termos de serviço

## Passo 2: Criar um App no Meta

1. No painel do Meta for Developers, clique em **"Meus Apps"** → **"Criar App"**
2. Selecione o tipo de app:
   - Escolha **"Negócios"**
   - Clique em **"Avançar"**
3. Preencha os detalhes do app:
   - **Nome do App**: LocAI WhatsApp Integration
   - **Email de contato**: seu-email@empresa.com
   - **Conta de Negócios**: Selecione ou crie uma
4. Clique em **"Criar app"**

## Passo 3: Adicionar o Produto WhatsApp

1. No painel do seu app, procure por **"WhatsApp"** na seção de produtos
2. Clique em **"Configurar"** no card do WhatsApp
3. Selecione **"WhatsApp Business Platform API"**

## Passo 4: Configurar o WhatsApp Business

### 4.1 Criar ou Conectar uma Conta WhatsApp Business

1. Na página de configuração do WhatsApp, clique em **"Começar"**
2. Escolha uma das opções:
   - **Criar nova conta WhatsApp Business** (recomendado)
   - **Conectar conta existente**
3. Adicione as informações da empresa:
   - Nome da empresa
   - Categoria do negócio (selecione "Imobiliária" ou "Hospedagem")
   - Descrição do negócio

### 4.2 Adicionar um Número de Telefone

1. Clique em **"Adicionar número de telefone"**
2. Insira o número no formato internacional (+55 11 99999-9999)
3. Escolha o método de verificação:
   - **SMS** (mais rápido)
   - **Ligação de voz**
4. Insira o código de verificação recebido

### 4.3 Criar o Perfil do WhatsApp Business

1. Adicione as informações do perfil:
   - **Nome de exibição**: Nome da sua imobiliária
   - **Sobre**: Descrição breve do negócio
   - **Foto do perfil**: Logo da empresa
   - **Categoria**: Imobiliária
   - **Website**: https://seu-dominio.com
   - **Email**: contato@sua-empresa.com
   - **Endereço**: Endereço completo

## Passo 5: Obter as Credenciais

### 5.1 Token de Acesso Permanente

1. No painel do app, vá para **"WhatsApp" → "Configuração" → "API Setup"**
2. Em **"Permanent Token"**, clique em **"Generate"**
3. **IMPORTANTE**: Copie e guarde este token com segurança. Ele não será mostrado novamente!

```
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 5.2 Phone Number ID

1. Na mesma página, em **"Phone numbers"**
2. Você verá o número adicionado com seu ID
3. Copie o **Phone number ID** (formato: 1234567890123456)

```
WHATSAPP_PHONE_NUMBER_ID=1234567890123456
```

### 5.3 WhatsApp Business Account ID

1. No menu lateral, vá para **"WhatsApp" → "WhatsApp Manager"**
2. Clique no nome da sua conta WhatsApp Business
3. O ID estará na URL ou nas configurações da conta

```
WHATSAPP_BUSINESS_ACCOUNT_ID=1234567890123456
```

### 5.4 Webhook Verify Token

1. Este token você cria! Gere uma string aleatória segura
2. Exemplo: use um gerador de UUID ou senha forte
3. Guarde este token, você precisará dele para configurar o webhook

```
WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu_token_secreto_aleatorio_aqui_123456
```

## Passo 6: Configurar o Webhook

### 6.1 URL do Webhook

Seu webhook precisa estar acessível publicamente. A URL será:

```
https://seu-dominio.com/api/webhook/whatsapp
```

### 6.2 Configurar no Meta

1. No painel do app, vá para **"WhatsApp" → "Configuration"**
2. Em **"Webhook"**, clique em **"Edit"**
3. Preencha:
   - **Callback URL**: `https://seu-dominio.com/api/webhook/whatsapp`
   - **Verify Token**: O token que você criou no passo 5.4
4. Clique em **"Verify and Save"**

### 6.3 Inscrever-se nos Eventos

1. Após verificar o webhook, marque os eventos:
   - ✅ **messages** (obrigatório)
   - ✅ **message_status**
   - ✅ **message_template_status_update**
2. Clique em **"Subscribe"**

## Passo 7: Configurar Templates de Mensagem

### 7.1 Criar Templates

1. Vá para **"WhatsApp Manager" → "Message Templates"**
2. Clique em **"Create Template"**
3. Crie os seguintes templates essenciais:

#### Template: Confirmação de Reserva
```
Nome: booking_confirmation
Categoria: TRANSACTIONAL
Idioma: pt_BR

Conteúdo:
Olá {{1}}! 

Sua reserva foi confirmada! 🎉

📍 Propriedade: {{2}}
📅 Check-in: {{3}}
📅 Check-out: {{4}}
💰 Valor total: {{5}}

Código de confirmação: {{6}}

Em breve enviaremos mais detalhes sobre o check-in.

Obrigado por escolher nossos serviços!
```

#### Template: Lembrete de Pagamento
```
Nome: payment_reminder
Categoria: TRANSACTIONAL
Idioma: pt_BR

Conteúdo:
Olá {{1}}! 

Este é um lembrete sobre o pagamento da sua reserva:

📍 Propriedade: {{2}}
💰 Valor: {{3}}
📅 Vencimento: {{4}}

Para manter sua reserva garantida, por favor realize o pagamento até a data de vencimento.

Métodos de pagamento disponíveis:
• PIX
• Transferência bancária
• Cartão de crédito

Responda esta mensagem se precisar de ajuda!
```

### 7.2 Aguardar Aprovação

- Templates levam de 1 a 24 horas para serem aprovados
- Você receberá uma notificação quando aprovados
- Status aparecerá como "APPROVED" quando prontos

## Passo 8: Testar a Integração

### 8.1 Adicionar Números de Teste

1. Em **"WhatsApp" → "API Setup"**
2. Em **"To"**, adicione até 5 números para teste
3. Estes números receberão mensagens mesmo em modo desenvolvimento

### 8.2 Enviar Mensagem de Teste

Use a ferramenta de teste do Meta ou curl:

```bash
curl -X POST \
  https://graph.facebook.com/v18.0/SEU_PHONE_NUMBER_ID/messages \
  -H "Authorization: Bearer SEU_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "5511999999999",
    "type": "text",
    "text": {
      "body": "Teste de integração LocAI!"
    }
  }'
```

## Passo 9: Configurar no Sistema LocAI

### 9.1 Via Interface Visual

1. Acesse o dashboard em `/dashboard/settings`
2. Na aba **"WhatsApp"**, clique em **"Configurar WhatsApp"**
3. Preencha os campos:
   - **Access Token**: Token do passo 5.1
   - **Phone Number ID**: ID do passo 5.2
   - **Business Account ID**: ID do passo 5.3
   - **Webhook Verify Token**: Token do passo 5.4
4. Clique em **"Testar Conexão"**
5. Se tudo estiver correto, clique em **"Salvar Configurações"**

### 9.2 Via Arquivo .env (Alternativa)

Adicione ao seu arquivo `.env`:

```env
# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER_ID=1234567890123456
WHATSAPP_BUSINESS_ACCOUNT_ID=1234567890123456
WHATSAPP_WEBHOOK_VERIFY_TOKEN=seu_token_secreto_aleatorio_aqui_123456
WHATSAPP_API_VERSION=v18.0
```

## Passo 10: Configurações de Produção

### 10.1 Verificação do Negócio

Para remover limites de mensagens:

1. Vá para **"Business Settings" → "Business Info"**
2. Clique em **"Start Verification"**
3. Envie os documentos necessários:
   - CNPJ ou documento de registro
   - Comprovante de endereço
   - Documento do representante legal

### 10.2 Limites de Mensagens

- **Não verificado**: 250 conversas iniciadas por você/dia
- **Verificado**: 1.000 conversas/dia (aumenta gradualmente)
- **Conversas iniciadas pelo cliente**: Sem limite

### 10.3 Custos

- **Mensagens de Template** (você inicia): ~R$ 0,20 por mensagem
- **Mensagens de Resposta** (cliente inicia): Grátis por 24h
- **Mensagens de Serviço**: ~R$ 0,10 por mensagem

## Troubleshooting

### Erro: "Token Inválido"
- Verifique se o token foi copiado corretamente
- Tokens expiram após 60 dias se não usados
- Gere um novo token se necessário

### Erro: "Webhook não verificado"
- Certifique-se que sua URL está acessível publicamente
- O verify_token deve ser exatamente o mesmo
- Verifique os logs do servidor para erros

### Erro: "Template não encontrado"
- Templates precisam estar aprovados
- Use o nome exato do template (case sensitive)
- Verifique o idioma do template

### Erro: "Número não autorizado"
- Em desenvolvimento, apenas números adicionados na lista de teste funcionam
- Em produção, qualquer número funciona

## Suporte e Recursos

- **Documentação Oficial**: [developers.facebook.com/docs/whatsapp](https://developers.facebook.com/docs/whatsapp)
- **Status da API**: [status.whatsapp.com](https://status.whatsapp.com)
- **Suporte Meta**: [business.facebook.com/business/help](https://business.facebook.com/business/help)
- **Comunidade**: [facebook.com/groups/WhatsAppBusinessAPI](https://facebook.com/groups/WhatsAppBusinessAPI)

## Checklist Final

- [ ] Conta Meta for Developers criada e verificada
- [ ] App criado com WhatsApp Business API configurado
- [ ] Número de telefone verificado
- [ ] Perfil do WhatsApp Business completo
- [ ] Access Token gerado e salvo
- [ ] Phone Number ID copiado
- [ ] Webhook configurado e verificado
- [ ] Templates de mensagem criados
- [ ] Teste de envio funcionando
- [ ] Configurações salvas no LocAI
- [ ] Números de teste adicionados
- [ ] Verificação do negócio iniciada (para produção)

---

**Importante**: Mantenha suas credenciais seguras e nunca as compartilhe publicamente. Use variáveis de ambiente e não commite credenciais no código!