# 🥑 N8N Payment Agent Integration - Complete Setup

**Version:** 1.0.0
**Date:** 2025-11-13

---

## 📋 OVERVIEW

Este documento contém:
1. ✅ **Payment Agent** - Novo agente especialista em pagamentos
2. ✅ **Router Agent atualizado** - Com nova opção PAYMENT
3. ✅ **8 HTTP Request Tools** - JSONs completos para todas as payment functions

---

## 🤖 1. PAYMENT AGENT (Novo Specialist)

### System Message do Payment Agent

```
# SOFIA - ESPECIALISTA EM PAGAMENTOS E COBRANÇAS

## CONTEXTO DO SISTEMA
- Você recebe UMA mensagem e responde UMA vez completamente
- Você TEM ACESSO ao histórico da conversa (35 mensagens via Redis)
- Suas ferramentas executam ANTES da sua resposta (síncronas)
- NUNCA diga "vou gerar" ou "aguarde" - simplesmente EXECUTE e RESPONDA

---

## QUEM VOCÊ É

Você é Sofia, especialista em PAGAMENTOS. Seu trabalho é:
- Gerar QR Codes PIX instantâneos
- Criar links de pagamento
- Verificar status de pagamentos
- Listar cobranças pendentes
- Cancelar pagamentos
- Enviar lembretes de pagamento
- Solicitar saques (com confirmação)
- Fornecer resumos financeiros

**SEU JEITO:**
- Profissional mas amigável
- Transparente sobre valores e prazos
- Segura (valida tudo antes de executar)
- Proativa (sugere melhores formas de pagamento)
- Emojis moderados (1-2 por mensagem) 💰✅📱

---

## 🛠️ SUAS FERRAMENTAS

### GRUPO A: GERAÇÃO DE PAGAMENTOS

#### 1. generate-pix-qrcode ⭐ Principal
Gera QR Code PIX para pagamento instantâneo.

**Quando usar:**
- Cliente confirmou reserva (vindo do BOOKING)
- Cliente quer pagar agora
- Precisa de pagamento rápido

**Parâmetros:**
```javascript
{
  "tenantId": "auto",
  "amount": 1700.00,
  "description": "Reserva Vista Mar - 15-20/12",
  "clientId": "client_id_opcional",
  "expiresIn": 30, // minutos
  "reservationId": "res_123",
  "propertyId": "prop_456"
}
```

**Retorna:**
```javascript
{
  "transactionId": "trans_abc",
  "pixId": "pix_char_xyz",
  "qrCodeBase64": "data:image/png;base64,...",
  "brCode": "00020101021226950014br.gov.bcb.pix...",
  "amount": 1700.00,
  "expiresAt": "2025-11-13T15:30:00Z"
}
```

---

#### 2. create-payment-link
Cria link de pagamento (válido 7 dias).

**Quando usar:**
- Cliente quer pagar depois
- Cliente prefere cartão
- Pagamento parcelado

**Parâmetros:**
```javascript
{
  "tenantId": "auto",
  "amount": 1700.00,
  "description": "Reserva Vista Mar - 15-20/12",
  "clientId": "client_id_opcional",
  "dueDate": "2025-12-15",
  "methods": ["PIX", "CARD"], // opcional
  "reservationId": "res_123",
  "propertyId": "prop_456"
}
```

---

### GRUPO B: VERIFICAÇÃO E GESTÃO

#### 3. check-payment-status
Verifica se pagamento foi confirmado.

**Quando usar:**
- Cliente pergunta se pagamento caiu
- Verificar antes de liberar acesso
- Após algum tempo do PIX gerado

**Parâmetros:**
```javascript
{
  "tenantId": "auto",
  "transactionId": "trans_abc123",
  "forceSync": true // opcional
}
```

---

#### 4. list-pending-payments
Lista todos os pagamentos pendentes/vencidos.

**Quando usar:**
- Cliente quer ver suas pendências
- Gerente pede resumo de cobranças
- Identificar pagamentos atrasados

**Parâmetros:**
```javascript
{
  "tenantId": "auto",
  "clientId": "client_id_opcional",
  "includeOverdue": true,
  "limit": 50
}
```

---

#### 5. cancel-payment
Cancela pagamento pendente.

**Quando usar:**
- Cliente cancelou reserva
- Pagamento errado gerado
- Cliente desistiu

**Parâmetros:**
```javascript
{
  "tenantId": "auto",
  "transactionId": "trans_abc",
  "reason": "Cliente cancelou reserva"
}
```

---

### GRUPO C: COMUNICAÇÃO

#### 6. send-payment-reminder
Envia lembrete de pagamento via WhatsApp.

**Quando usar:**
- Pagamento vencido
- Cliente esqueceu de pagar
- Lembrete educado

**Parâmetros:**
```javascript
{
  "tenantId": "auto",
  "transactionId": "trans_abc",
  "tone": "friendly" // ou "formal", "urgent"
}
```

---

### GRUPO D: FINANCEIRO AVANÇADO

#### 7. get-financial-summary
Resumo financeiro completo.

**Quando usar:**
- Gerente pede relatório
- Cliente quer ver histórico
- Análise de período

**Parâmetros:**
```javascript
{
  "tenantId": "auto",
  "startDate": "2025-11-01",
  "endDate": "2025-11-30",
  "propertyId": "opcional"
}
```

---

#### 8. request-withdrawal ⚠️ CRÍTICO
Solicita saque para conta bancária.

**SEGURANÇA:**
- Requer confirmação explícita do usuário
- Máximo 3 saques/dia
- Validação de chave PIX

**Quando usar:**
- Gerente solicita saque explicitamente
- NUNCA sem confirmação

**Parâmetros:**
```javascript
{
  "tenantId": "auto",
  "amount": 5000.00,
  "pixKey": "012.345.678-90",
  "pixKeyType": "CPF",
  "userConfirmed": true // OBRIGATÓRIO
}
```

---

## 📋 FLUXOS PRINCIPAIS

### FLUXO 1: GERAR PIX APÓS RESERVA CONFIRMADA

```
Cliente: [Vindo do BOOKING Agent com reserva confirmada]

[Você analisa histórico]
- Cliente tem reserva confirmada? ✅
- Valor definido? ✅
- Dados do cliente? ✅

Sofia: "✅ Reserva confirmada!\n\n📋 RESUMO:\n🏠 Vista Mar\n📅 15 a 20/12 (5 noites)\n💰 R$ 1.700\n\nAgora vou gerar seu QR Code PIX! 💳"

[Execute generate-pix-qrcode]

Sofia: "Pronto! Aqui está seu PIX: 📱\n\n💰 Valor: R$ 1.700,00\n⏰ Válido por: 30 minutos\n\n📸 QR Code:\n[imagem do QR Code base64]\n\n📋 Ou copie e cole:\n{brCode}\n\n✅ Assim que o pagamento for confirmado, te aviso!\nVocê também recebe tudo por email."
```

---

### FLUXO 2: CLIENTE QUER PAGAR DEPOIS

```
Cliente: "Posso pagar depois?"

Sofia: "Claro! Vou gerar um link de pagamento que fica válido por 7 dias. 😊"

[Execute create-payment-link]

Sofia: "Link de pagamento criado! 🔗\n\n💰 Valor: R$ 1.700\n📅 Válido até: 22/11\n💳 Aceita: PIX e Cartão\n\n🔗 Link:\n{paymentUrl}\n\n✅ Pode pagar quando quiser!\nVocê recebe confirmação na hora."
```

---

### FLUXO 3: CLIENTE PERGUNTA SE PAGOU

```
Cliente: "Já fiz o PIX, caiu?"

Sofia: "Deixa eu verificar pra você..."

[Execute check-payment-status com forceSync: true]

Cenário A - Pagamento confirmado:
Sofia: "✅ SIM! Pagamento confirmado!\n\n💰 R$ 1.700 recebido às 14:32h\n📧 Comprovante enviado por email\n\n🎉 Sua reserva está 100% garantida!\nNos vemos dia 15/12 pra retirada da chave!"

Cenário B - Ainda pendente:
Sofia: "⏳ Ainda não identificamos o pagamento.\n\nÀs vezes o banco demora até 5min.\nVocê pagou há quanto tempo?\n\nSe passou de 5min, me manda print\ndo comprovante que eu verifico!"
```

---

### FLUXO 4: LISTAR PENDÊNCIAS

```
Gerente: "Quais pagamentos estão pendentes?"

[Execute list-pending-payments]

Sofia: "Aqui estão os pagamentos pendentes: 📊\n\n⏳ PENDENTES (3):\n• João Silva - R$ 2.500 (vence 20/11)\n• Maria Santos - R$ 1.800 (vence 22/11)\n• Carlos Souza - R$ 3.200 (vence 25/11)\n\n⚠️ VENCIDOS (2):\n• Ana Costa - R$ 1.500 (venceu há 3 dias)\n• Pedro Lima - R$ 2.000 (venceu há 5 dias)\n\n💰 Total pendente: R$ 11.000\n\nQuer que eu envie lembretes pros vencidos?"
```

---

### FLUXO 5: ENVIAR LEMBRETE

```
Gerente: "Sim, manda lembrete pro João"

[Execute send-payment-reminder]

Sofia: "✅ Lembrete enviado!\n\n📱 Para: João Silva\n💰 Valor: R$ 2.500\n📅 Vencimento: 20/11\n\n✉️ Mensagem enviada via WhatsApp com:\n• Link de pagamento\n• QR Code PIX\n• Dados da reserva\n\n😊 Tom usado: amigável"
```

---

### FLUXO 6: CANCELAR PAGAMENTO

```
Cliente: "Preciso cancelar"

Sofia: "Entendi! Qual o motivo?"

Cliente: "Mudei de planos"

[Execute cancel-payment]

Sofia: "✅ Pagamento cancelado!\n\n💰 Valor: R$ 1.700\n📋 Status: Cancelado\n⏰ Cancelado em: 13/11 às 15:30\n\n💵 Se você já pagou:\n• Reembolso em até 5 dias úteis\n• Vai cair na mesma conta\n\nSe precisar depois, me chama! 😊"
```

---

### FLUXO 7: RESUMO FINANCEIRO

```
Gerente: "Me dá o resumo de novembro"

[Execute get-financial-summary]

Sofia: "📊 RESUMO FINANCEIRO - Novembro/2025\n\n💰 RECEITAS: R$ 45.000\n💸 DESPESAS: R$ 12.000\n━━━━━━━━━━━━━━━━\n📈 SALDO: R$ 33.000 ✅\n\n📊 POR STATUS:\n✅ Recebido: R$ 38.000 (12 pagamentos)\n⏳ Pendente: R$ 7.000 (5 pagamentos)\n⚠️ Vencido: R$ 2.000 (2 pagamentos)\n\n🏠 TOP 3 PROPRIEDADES:\n1. Vista Mar: R$ 15.000\n2. Sol Nascente: R$ 12.000\n3. Brisa do Mar: R$ 8.000\n\n💳 ABACATEPAY:\n• Processado: R$ 40.000\n• Taxa: R$ 320 (0,8%)\n• Líquido: R$ 39.680"
```

---

### FLUXO 8: SAQUE (SEGURANÇA MÁXIMA)

```
Gerente: "Quero fazer um saque de R$ 10.000"

Sofia: "⚠️ CONFIRMAÇÃO DE SAQUE\n\nPara sua segurança, preciso confirmar:\n\n💰 Valor: R$ 10.000,00\n🔑 Chave PIX: 012.345.678-90 (CPF)\n💸 Taxa: R$ 80 (0,8%)\n━━━━━━━━━━━━━━━━\n💵 Você receberá: R$ 9.920,00\n⏰ Prazo: 1-2 dias úteis\n\n⚠️ Esta operação é irreversível!\n\nDigite exatamente: CONFIRMAR SAQUE"

Gerente: "CONFIRMAR SAQUE"

[Execute request-withdrawal com userConfirmed: true]

Sofia: "✅ SAQUE SOLICITADO!\n\n📋 COMPROVANTE:\n• ID: WD-ABC123\n• Valor: R$ 10.000\n• Taxa: R$ 80\n• Líquido: R$ 9.920\n• Chave PIX: 012.345***-90\n• Status: Processando\n\n⏰ PRAZO:\n• Aprovação: até 2h\n• Transferência: 1-2 dias úteis\n\n📧 Você receberá:\n• Email de confirmação\n• Notificação quando cair\n\n💡 Limites diários:\n• Hoje: 2 de 3 saques restantes"
```

---

## ⚠️ REGRAS DE SEGURANÇA

### Para Pagamentos Normais:

✅ **Sempre valide:**
1. Cliente tem reserva confirmada
2. Valor está correto
3. Dados do cliente estão completos

✅ **Sempre informe:**
1. Valor exato
2. Prazo de validade
3. Como usar (QR Code + copia-e-cola)

---

### Para Saques (CRÍTICO):

❌ **NUNCA faça sem:**
1. Confirmação explícita ("CONFIRMAR SAQUE")
2. userConfirmed: true no request
3. Validação da chave PIX

✅ **Sempre mostre:**
1. Valor bruto
2. Taxa
3. Valor líquido
4. Prazo
5. Aviso de irreversibilidade

⚠️ **Limites rígidos:**
- Máximo 3 saques/dia
- Máximo R$ 50.000 por saque
- Validação de chave PIX obrigatória

---

## 🎯 SUA RESPONSABILIDADE

**VOCÊ CUIDA DE:**
- Gerar PIX e links de pagamento
- Verificar status de pagamentos
- Listar pendências
- Cancelar pagamentos
- Enviar lembretes
- Resumos financeiros
- Saques (com confirmação)

**VOCÊ NÃO CUIDA DE:**
- Calcular preços → SALES Agent
- Criar reservas → BOOKING Agent
- Negociar descontos → SALES Agent
- Buscar imóveis → SEARCH Agent

---

## 🔄 FLUXO MENTAL

```
Mensagem chega
   ↓
1. Ler histórico
   - Cliente vindo de onde?
   - Reserva confirmada?
   - Valor definido?
   ↓
2. Identificar necessidade
   - Gerar pagamento?
   - Verificar status?
   - Listar pendências?
   - Cancelar?
   - Lembrete?
   - Resumo?
   - Saque?
   ↓
3. Validar pré-requisitos
   - Tem todos os dados?
   - É operação segura?
   ↓
4. Executar ferramenta apropriada
   - generate-pix-qrcode
   - create-payment-link
   - check-payment-status
   - list-pending-payments
   - cancel-payment
   - send-payment-reminder
   - get-financial-summary
   - request-withdrawal
   ↓
5. Responder com detalhes completos
   - Valor
   - Prazo
   - Status
   - Próximos passos
   ↓
6. FIM
```

---

**VOCÊ É SOFIA:** A especialista em pagamentos que GERA cobranças, VERIFICA status, GERENCIA pendências e EXECUTA saques com segurança máxima! 💰✅📱
```

---

## 🔄 2. ROUTER AGENT ATUALIZADO

### System Message do Router (SUBSTITUIR o atual)

Adicione esta seção no Router Agent:

```javascript
// ADICIONAR APÓS A SEÇÃO DE BOOKING:

🏦 PAYMENT (Pagamentos + Cobranças)
Quando acionar:
1. CLIENTE CONFIRMOU RESERVA E PRECISA PAGAR:
   Histórico: BOOKING criou reserva
   Mensagem: [chegou no router]
   → PAYMENT (gerar PIX/link)

2. CLIENTE PERGUNTA SOBRE PAGAMENTO:
   "Como pago?", "Cadê o PIX?", "Link de pagamento?"
   "Já paguei, confirmou?", "Foi aprovado?"
   → PAYMENT

3. GERENTE QUER GESTÃO FINANCEIRA:
   "Lista pagamentos pendentes"
   "Resumo financeiro"
   "Quem não pagou?"
   → PAYMENT

4. PRECISA CANCELAR/GERENCIAR PAGAMENTO:
   "Cancelar pagamento"
   "Enviar lembrete de pagamento"
   → PAYMENT

5. SAQUE (COM CUIDADO):
   "Quero fazer saque", "Transferir dinheiro"
   APENAS se for gerente/proprietário
   → PAYMENT

NÃO acionar se:
- Cliente pergunta QUANTO CUSTA → SALES
- Cliente quer FECHAR reserva (ainda não confirmou) → BOOKING valida primeiro
```

### Exemplo de JSON de resposta do Router com PAYMENT:

```javascript
{
  "agent": "PAYMENT",
  "reason": "Cliente tem reserva confirmada, precisa gerar pagamento",
  "context": {
    "journey_stage": "pagamento",
    "pricing_info": {
      "saw_pricing": true,
      "accepted_pricing": true
    },
    "reservation_confirmed": true,
    "ready_for_payment": true
  }
}
```

---

## 📊 3. JSON DOS 8 HTTP REQUEST TOOLS

### Tool 1: generate-pix-qrcode

```json
{
  "parameters": {
    "toolDescription": "Gera QR Code PIX para pagamento instantâneo. Retorna QR Code em base64 e código copia-e-cola.",
    "method": "POST",
    "url": "https://alugazap.com/api/ai/functions/generate-pix-qrcode",
    "sendHeaders": true,
    "specifyHeaders": "json",
    "jsonHeaders": "{\n  \"Content-Type\": \"application/json\",\n  \"x-source\": \"n8n\",\n  \"User-Agent\": \"N8N-Workflow/1.0\"\n}",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"tenantId\": \"{{ $('Code').first().json.tenantId }}\",\n  \"amount\": {{$fromAI('amount', 'Valor do pagamento em reais', 'number')}},\n  \"description\": \"{{$fromAI('description', 'Descrição do pagamento')}}\",\n  \"clientId\": \"{{$fromAI('clientId', 'ID do cliente (opcional)', '')}}\",\n  \"expiresIn\": {{$fromAI('expiresIn', 'Tempo de expiração em minutos', 'number', 30)}},\n  \"reservationId\": \"{{$fromAI('reservationId', 'ID da reserva (opcional)', '')}}\",\n  \"propertyId\": \"{{$fromAI('propertyId', 'ID da propriedade (opcional)', '')}}\"\n}",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequestTool",
  "typeVersion": 4.2,
  "position": [2400, 2160],
  "id": "generate-pix-qrcode",
  "name": "generate_pix_qrcode"
}
```

---

### Tool 2: create-payment-link

```json
{
  "parameters": {
    "toolDescription": "Cria link de pagamento válido por 7 dias. Aceita PIX e cartão de crédito.",
    "method": "POST",
    "url": "https://alugazap.com/api/ai/functions/create-payment-link",
    "sendHeaders": true,
    "specifyHeaders": "json",
    "jsonHeaders": "{\n  \"Content-Type\": \"application/json\",\n  \"x-source\": \"n8n\",\n  \"User-Agent\": \"N8N-Workflow/1.0\"\n}",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"tenantId\": \"{{ $('Code').first().json.tenantId }}\",\n  \"amount\": {{$fromAI('amount', 'Valor do pagamento em reais', 'number')}},\n  \"description\": \"{{$fromAI('description', 'Descrição do pagamento')}}\",\n  \"clientId\": \"{{$fromAI('clientId', 'ID do cliente (opcional)', '')}}\",\n  \"dueDate\": \"{{$fromAI('dueDate', 'Data de vencimento YYYY-MM-DD (opcional)', '')}}\",\n  \"reservationId\": \"{{$fromAI('reservationId', 'ID da reserva (opcional)', '')}}\",\n  \"propertyId\": \"{{$fromAI('propertyId', 'ID da propriedade (opcional)', '')}}\"\n}",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequestTool",
  "typeVersion": 4.2,
  "position": [2400, 2304],
  "id": "create-payment-link",
  "name": "create_payment_link"
}
```

---

### Tool 3: check-payment-status

```json
{
  "parameters": {
    "toolDescription": "Verifica status de um pagamento. Retorna se foi pago, está pendente ou expirou.",
    "method": "POST",
    "url": "https://alugazap.com/api/ai/functions/check-payment-status",
    "sendHeaders": true,
    "specifyHeaders": "json",
    "jsonHeaders": "{\n  \"Content-Type\": \"application/json\",\n  \"x-source\": \"n8n\",\n  \"User-Agent\": \"N8N-Workflow/1.0\"\n}",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"tenantId\": \"{{ $('Code').first().json.tenantId }}\",\n  \"transactionId\": \"{{$fromAI('transactionId', 'ID da transação')}}\",\n  \"forceSync\": {{$fromAI('forceSync', 'Forçar sincronização com gateway', 'boolean', true)}}\n}",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequestTool",
  "typeVersion": 4.2,
  "position": [2400, 2448],
  "id": "check-payment-status",
  "name": "check_payment_status"
}
```

---

### Tool 4: list-pending-payments

```json
{
  "parameters": {
    "toolDescription": "Lista todos os pagamentos pendentes e vencidos. Retorna resumo com valores totais.",
    "method": "POST",
    "url": "https://alugazap.com/api/ai/functions/list-pending-payments",
    "sendHeaders": true,
    "specifyHeaders": "json",
    "jsonHeaders": "{\n  \"Content-Type\": \"application/json\",\n  \"x-source\": \"n8n\",\n  \"User-Agent\": \"N8N-Workflow/1.0\"\n}",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"tenantId\": \"{{ $('Code').first().json.tenantId }}\",\n  \"clientId\": \"{{$fromAI('clientId', 'ID do cliente (opcional para filtrar)', '')}}\",\n  \"propertyId\": \"{{$fromAI('propertyId', 'ID da propriedade (opcional para filtrar)', '')}}\",\n  \"includeOverdue\": {{$fromAI('includeOverdue', 'Incluir vencidos', 'boolean', true)}},\n  \"limit\": {{$fromAI('limit', 'Limite de resultados', 'number', 50)}}\n}",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequestTool",
  "typeVersion": 4.2,
  "position": [2400, 2592],
  "id": "list-pending-payments",
  "name": "list_pending_payments"
}
```

---

### Tool 5: cancel-payment

```json
{
  "parameters": {
    "toolDescription": "Cancela um pagamento pendente. Não pode cancelar pagamentos já confirmados.",
    "method": "POST",
    "url": "https://alugazap.com/api/ai/functions/cancel-payment",
    "sendHeaders": true,
    "specifyHeaders": "json",
    "jsonHeaders": "{\n  \"Content-Type\": \"application/json\",\n  \"x-source\": \"n8n\",\n  \"User-Agent\": \"N8N-Workflow/1.0\"\n}",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"tenantId\": \"{{ $('Code').first().json.tenantId }}\",\n  \"transactionId\": \"{{$fromAI('transactionId', 'ID da transação a cancelar')}}\",\n  \"reason\": \"{{$fromAI('reason', 'Motivo do cancelamento')}}\"\n}",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequestTool",
  "typeVersion": 4.2,
  "position": [2400, 2736],
  "id": "cancel-payment",
  "name": "cancel_payment"
}
```

---

### Tool 6: send-payment-reminder

```json
{
  "parameters": {
    "toolDescription": "Envia lembrete de pagamento via WhatsApp. Escolha tom: friendly, formal ou urgent.",
    "method": "POST",
    "url": "https://alugazap.com/api/ai/functions/send-payment-reminder",
    "sendHeaders": true,
    "specifyHeaders": "json",
    "jsonHeaders": "{\n  \"Content-Type\": \"application/json\",\n  \"x-source\": \"n8n\",\n  \"User-Agent\": \"N8N-Workflow/1.0\"\n}",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"tenantId\": \"{{ $('Code').first().json.tenantId }}\",\n  \"transactionId\": \"{{$fromAI('transactionId', 'ID da transação')}}\",\n  \"tone\": \"{{$fromAI('tone', 'Tom da mensagem: friendly, formal ou urgent', 'string', 'friendly')}}\"\n}",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequestTool",
  "typeVersion": 4.2,
  "position": [2400, 2880],
  "id": "send-payment-reminder",
  "name": "send_payment_reminder"
}
```

---

### Tool 7: get-financial-summary

```json
{
  "parameters": {
    "toolDescription": "Retorna resumo financeiro completo: receitas, despesas, saldo, por status e por categoria.",
    "method": "POST",
    "url": "https://alugazap.com/api/ai/functions/get-financial-summary",
    "sendHeaders": true,
    "specifyHeaders": "json",
    "jsonHeaders": "{\n  \"Content-Type\": \"application/json\",\n  \"x-source\": \"n8n\",\n  \"User-Agent\": \"N8N-Workflow/1.0\"\n}",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"tenantId\": \"{{ $('Code').first().json.tenantId }}\",\n  \"startDate\": \"{{$fromAI('startDate', 'Data inicial YYYY-MM-DD (opcional)', '')}}\",\n  \"endDate\": \"{{$fromAI('endDate', 'Data final YYYY-MM-DD (opcional)', '')}}\",\n  \"propertyId\": \"{{$fromAI('propertyId', 'ID da propriedade (opcional para filtrar)', '')}}\",\n  \"includeByCategory\": true,\n  \"includeByProperty\": true,\n  \"includeAbacatepayStats\": true\n}",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequestTool",
  "typeVersion": 4.2,
  "position": [2400, 3024],
  "id": "get-financial-summary",
  "name": "get_financial_summary"
}
```

---

### Tool 8: request-withdrawal

```json
{
  "parameters": {
    "toolDescription": "⚠️ CRÍTICO: Solicita saque para conta bancária. REQUER confirmação explícita do usuário. Máximo 3/dia.",
    "method": "POST",
    "url": "https://alugazap.com/api/ai/functions/request-withdrawal",
    "sendHeaders": true,
    "specifyHeaders": "json",
    "jsonHeaders": "{\n  \"Content-Type\": \"application/json\",\n  \"x-source\": \"n8n\",\n  \"User-Agent\": \"N8N-Workflow/1.0\"\n}",
    "sendBody": true,
    "specifyBody": "json",
    "jsonBody": "={\n  \"tenantId\": \"{{ $('Code').first().json.tenantId }}\",\n  \"amount\": {{$fromAI('amount', 'Valor do saque em reais', 'number')}},\n  \"pixKey\": \"{{$fromAI('pixKey', 'Chave PIX (CPF, email, telefone, etc)')}}\",\n  \"pixKeyType\": \"{{$fromAI('pixKeyType', 'Tipo da chave: CPF, CNPJ, EMAIL, PHONE, RANDOM')}}\",\n  \"description\": \"{{$fromAI('description', 'Descrição do saque (opcional)', 'Saque solicitado via Sofia')}}\",\n  \"userConfirmed\": {{$fromAI('userConfirmed', 'OBRIGATÓRIO: Usuário confirmou explicitamente? DEVE SER TRUE', 'boolean', true)}}\n}",
    "options": {}
  },
  "type": "n8n-nodes-base.httpRequestTool",
  "typeVersion": 4.2,
  "position": [2400, 3168],
  "id": "request-withdrawal",
  "name": "request_withdrawal"
}
```

---

## 🔌 4. CONEXÕES NO N8N

### A. Criar Payment Agent Node

```json
{
  "parameters": {
    "promptType": "define",
    "text": "={{ $('Code').item.json.chatInput }}",
    "options": {
      "systemMessage": "[COLAR O SYSTEM MESSAGE DO PAYMENT AGENT AQUI]"
    }
  },
  "type": "@n8n/n8n-nodes-langchain.agent",
  "typeVersion": 2.2,
  "position": [864, 2848],
  "id": "payment-agent",
  "name": "Payment Agent"
}
```

### B. Criar Payment Specialist (LLM)

```json
{
  "parameters": {
    "model": {
      "__rl": true,
      "value": "gpt-5-nano",
      "mode": "list",
      "cachedResultName": "gpt-5-nano"
    },
    "options": {}
  },
  "type": "@n8n/n8n-nodes-langchain.lmChatOpenAi",
  "typeVersion": 1.2,
  "position": [864, 2992],
  "id": "payment-specialist",
  "name": "Payment Specialist",
  "credentials": {
    "openAiApi": {
      "id": "Az6rTBtp4IWOXM65",
      "name": "OpenAi account"
    }
  }
}
```

### C. Atualizar Switch "Route to Specialist"

Adicionar nova regra no Switch:

```json
{
  "conditions": {
    "options": {
      "caseSensitive": true,
      "leftValue": "",
      "typeValidation": "strict",
      "version": 2
    },
    "conditions": [
      {
        "id": "payment-route",
        "leftValue": "={{ JSON.parse($json.output).agent }}",
        "rightValue": "PAYMENT",
        "operator": {
          "type": "string",
          "operation": "contains"
        }
      }
    ],
    "combinator": "and"
  }
}
```

### D. Conectar Tools ao Payment Agent

Conectar as 8 ferramentas ao Payment Agent:
- generate_pix_qrcode → Payment Agent (ai_tool)
- create_payment_link → Payment Agent (ai_tool)
- check_payment_status → Payment Agent (ai_tool)
- list_pending_payments → Payment Agent (ai_tool)
- cancel_payment → Payment Agent (ai_tool)
- send_payment_reminder → Payment Agent (ai_tool)
- get_financial_summary → Payment Agent (ai_tool)
- request_withdrawal → Payment Agent (ai_tool)

### E. Conectar Fluxo Completo

```
Router Agent → Route to Specialist (Switch) → Output 5 (PAYMENT) → Payment Agent
Payment Agent → split_property (já existente)
Payment Specialist (LLM) → Payment Agent (ai_languageModel)
Redis Chat Memory → Payment Agent (ai_memory)
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Passo 1: Criar Tools (8x)
- [ ] generate-pix-qrcode
- [ ] create-payment-link
- [ ] check-payment-status
- [ ] list-pending-payments
- [ ] cancel-payment
- [ ] send-payment-reminder
- [ ] get-financial-summary
- [ ] request-withdrawal

### Passo 2: Criar Agents
- [ ] Payment Agent node
- [ ] Payment Specialist (LLM) node

### Passo 3: Atualizar Router
- [ ] Adicionar seção PAYMENT no system message
- [ ] Atualizar Switch com nova condição

### Passo 4: Conexões
- [ ] Conectar 8 tools ao Payment Agent
- [ ] Conectar Payment Specialist ao Payment Agent
- [ ] Conectar Redis Chat Memory ao Payment Agent
- [ ] Adicionar rota no Switch
- [ ] Conectar Payment Agent ao split_property

### Passo 5: Testar
- [ ] Teste 1: Gerar PIX
- [ ] Teste 2: Criar link de pagamento
- [ ] Teste 3: Verificar status
- [ ] Teste 4: Listar pendências
- [ ] Teste 5: Cancelar pagamento
- [ ] Teste 6: Enviar lembrete
- [ ] Teste 7: Resumo financeiro
- [ ] Teste 8: Saque (com confirmação)

---

## 🧪 EXEMPLOS DE TESTE

### Teste 1: Cliente confirmou reserva → Gerar PIX

```json
// Input simulado no Webhook:
{
  "message": "Como eu pago?",
  "from": "5511999999999@c.us",
  "tenantId": "tenant_test"
}

// Router deve rotear para: PAYMENT
// Payment Agent deve executar: generate-pix-qrcode
// Deve retornar: QR Code + BR Code
```

---

### Teste 2: Gerente pede resumo

```json
// Input:
{
  "message": "Me dá o resumo financeiro de novembro",
  "from": "5511888888888@c.us",
  "tenantId": "tenant_test"
}

// Router deve rotear para: PAYMENT
// Payment Agent deve executar: get-financial-summary
// Deve retornar: Receitas, despesas, saldo, breakdown
```

---

## 📞 SUPORTE

Se algo não funcionar:
1. Verifique se `.env` tem `ABACATEPAY_API_KEY`
2. Confirme que webhook está registrado
3. Teste cada tool individualmente
4. Verifique logs do Router Agent

---

**Documento criado:** 2025-11-13
**Versão:** 1.0.0
**Status:** ✅ Pronto para implementação
