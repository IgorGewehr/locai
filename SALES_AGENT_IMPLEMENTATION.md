# 🤖 SALES AGENT - Implementação Completa

## 📋 Visão Geral

Sistema completo de negociação IA para o agente Sofia, permitindo que a IA negocie preços e condições de forma inteligente e personalizada, sempre respeitando as regras definidas pelo proprietário.

---

## ✅ O Que Foi Implementado

### 1. **Schema de Configurações de Negociação** ✅

#### Arquivo: `lib/types/tenant-settings.ts`

**Estrutura de dados:**
```typescript
interface NegotiationSettings {
  // Controle geral
  allowAINegotiation: boolean

  // Descontos por pagamento
  pixDiscountEnabled: boolean
  pixDiscountPercentage: number
  cashDiscountEnabled: boolean
  cashDiscountPercentage: number

  // Parcelamento
  installmentEnabled: boolean
  maxInstallments: number
  minInstallmentValue: number

  // Estadia prolongada
  extendedStayDiscountEnabled: boolean
  extendedStayRules: Array<{
    minDays: number
    discountPercentage: number
  }>

  // Reserva imediata
  bookNowDiscountEnabled: boolean
  bookNowDiscountPercentage: number
  bookNowTimeLimit: number

  // Antecedência
  earlyBookingDiscountEnabled: boolean
  earlyBookingRules: Array<{
    daysInAdvance: number
    discountPercentage: number
  }>

  // Última hora
  lastMinuteDiscountEnabled: boolean
  lastMinuteRules: Array<{
    daysBeforeCheckIn: number
    discountPercentage: number
  }>

  // Limites
  maxDiscountPercentage: number
  minPriceAfterDiscount: number

  // Estratégia
  priceJustifications: string[]
  allowSuggestAlternatives: boolean
  upsellEnabled: boolean
  upsellSuggestions: string[]
  negotiationNotes?: string
}
```

**Presets disponíveis:**
- `DEFAULT_NEGOTIATION_SETTINGS` - Balanceado (10% PIX, 30% max)
- `AGGRESSIVE_NEGOTIATION_SETTINGS` - Máxima flexibilidade (15% PIX, 40% max)
- `CONSERVATIVE_NEGOTIATION_SETTINGS` - Mínima flexibilidade (5% PIX, 10% max)
- `HIGH_SEASON_NEGOTIATION_SETTINGS` - Sem negociação (alta temporada)

**Armazenamento:**
```
Firestore: tenants/{tenantId}/settings/negotiation
```

---

### 2. **API de Configurações de Negociação** ✅

#### Arquivo: `app/api/tenant/settings/negotiation/route.ts`

**Endpoints:**

#### GET `/api/tenant/settings/negotiation`
Busca configurações atuais do tenant
```bash
curl -X GET https://alugazap.com/api/tenant/settings/negotiation \
  -H "Authorization: Bearer TOKEN"
```

**Resposta:**
```json
{
  "success": true,
  "data": {
    "allowAINegotiation": true,
    "pixDiscountPercentage": 10,
    "maxDiscountPercentage": 30,
    ...
  },
  "isDefault": false
}
```

#### PUT `/api/tenant/settings/negotiation`
Atualiza configurações personalizadas
```bash
curl -X PUT https://alugazap.com/api/tenant/settings/negotiation \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "allowAINegotiation": true,
    "pixDiscountPercentage": 12,
    "maxDiscountPercentage": 35
  }'
```

#### POST `/api/tenant/settings/negotiation`
Aplica preset rápido
```bash
curl -X POST https://alugazap.com/api/tenant/settings/negotiation \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "preset": "aggressive" }'
```

**Presets disponíveis:**
- `default` - Balanceado
- `aggressive` - Máxima flexibilidade
- `conservative` - Mínima flexibilidade
- `high_season` - Sem negociação

---

### 3. **Função de Desconto Dinâmico** ✅

#### Arquivo: `app/api/ai/functions/calculate-dynamic-discount/route.ts`

**Endpoint:** POST `/api/ai/functions/calculate-dynamic-discount`

**Request:**
```json
{
  "tenantId": "xxx",
  "propertyName": "Apto Vista Mar",
  "checkIn": "2025-12-01",
  "checkOut": "2025-12-05",
  "totalPrice": 2000,
  "clientPhone": "+5511999999999",
  "paymentMethod": "pix",
  "bookNow": false,
  "extendStay": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "type": "payment_method",
    "percentage": 10,
    "amount": 200,
    "originalPrice": 2000,
    "finalPrice": 1800,
    "reason": "Desconto especial para pagamento à vista no PIX",
    "message": "Ótima escolha! Apto Vista Mar normalmente sai por R$ 2000.00.\n\nMas tenho uma **proposta especial** para você: pagando à vista no **PIX**, consigo te dar um desconto de **10%**! 🎉\n\nOu seja, você fecha por apenas **R$ 1800.00**. São R$ 200.00 de economia! Vale super a pena, né?",
    "conditions": ["Pagamento integral via PIX"]
  },
  "meta": {
    "requestId": "discount_1234567890_abcd",
    "processingTime": 45,
    "timestamp": "2025-01-06T10:30:00.000Z"
  }
}
```

**Estratégias implementadas:**

1. **Desconto PIX** - Se `paymentMethod === 'pix'` e `pixDiscountEnabled`
   - Aplica `pixDiscountPercentage`
   - Mensagem: Proposta especial com desconto destacado

2. **Desconto Dinheiro** - Se `paymentMethod === 'cash'` e `cashDiscountEnabled`
   - Aplica `cashDiscountPercentage`
   - Mensagem: Desconto para pagamento em espécie

3. **Estadia Prolongada** - Se `extendStay > 0` e `extendedStayDiscountEnabled`
   - Busca melhor regra aplicável baseada em dias totais
   - Mensagem: Proposta irresistível com mais dias

4. **Reserva Imediata** - Se `bookNow === true` e `bookNowDiscountEnabled`
   - Aplica `bookNowDiscountPercentage`
   - Mensagem: Condição especial com prazo (2h)

5. **Parcelamento** - Se `paymentMethod === 'card'` e `installmentEnabled`
   - Sem desconto, mas oferece parcelamento
   - Mensagem: Facilita pagamento em até Nx sem juros

**Validações aplicadas:**
- ✅ Desconto não pode exceder `maxDiscountPercentage`
- ✅ Preço final não pode ser menor que `minPriceAfterDiscount`
- ✅ Verifica se `allowAINegotiation` está ativo

---

### 4. **Interface de Configuração (UI)** ✅

#### Arquivo: `components/dialogs/NegotiationSettingsDialog.tsx`

**Componente React completo com:**
- ✅ Carregamento automático das configurações
- ✅ Presets rápidos (4 botões)
- ✅ Accordions organizados por categoria
- ✅ Switches, inputs numéricos, validações
- ✅ Estado de loading e saving
- ✅ Mensagens de erro e sucesso
- ✅ Totalmente responsivo

**Categorias no dialog:**
1. **Controle Geral** - Ligar/desligar negociação
2. **Descontos por Pagamento** - PIX, Dinheiro
3. **Parcelamento** - Max parcelas, valor mínimo
4. **Estadia Prolongada** - Regras de desconto por dias
5. **Reserva Imediata** - Desconto "feche agora"
6. **Limites e Restrições** - Max desconto, preço mínimo
7. **Upselling e Alternativas** - Ativar sugestões

#### Integração na tela de propriedades

**Arquivo:** `app/dashboard/properties/page.tsx`

**Botão adicionado:**
```tsx
<ModernButton
  variant="outlined"
  size="large"
  icon={<Psychology />}
  onClick={() => setNegotiationDialogOpen(true)}
  sx={{ minWidth: { xs: 'auto', sm: '160px' } }}
>
  Negociação
</ModernButton>
```

**Localização:** Ao lado do botão "Políticas" na página de Propriedades

---

## 🎯 Como Usar

### 1. **Configurar Regras de Negociação**

1. Acesse: `/dashboard/properties`
2. Clique no botão **"Negociação"**
3. Escolha um preset rápido OU personalize:
   - Ative/desative estratégias específicas
   - Configure percentuais de desconto
   - Defina limites máximos
4. Clique em **"Salvar Configurações"**

### 2. **Usar no Agente N8N**

No workflow N8N, adicione a função `calculate-dynamic-discount` como tool:

```json
{
  "name": "calculate_dynamic_discount",
  "description": "Calculate dynamic discount based on negotiation criteria",
  "parameters": {
    "type": "object",
    "properties": {
      "propertyName": {
        "type": "string",
        "description": "Property name for personalized message"
      },
      "checkIn": {
        "type": "string",
        "description": "Check-in date (YYYY-MM-DD)"
      },
      "checkOut": {
        "type": "string",
        "description": "Check-out date (YYYY-MM-DD)"
      },
      "totalPrice": {
        "type": "number",
        "description": "Total price before discount"
      },
      "clientPhone": {
        "type": "string",
        "description": "Client phone number"
      },
      "paymentMethod": {
        "type": "string",
        "enum": ["pix", "card", "cash"],
        "description": "Payment method"
      },
      "bookNow": {
        "type": "boolean",
        "description": "Client wants to book immediately"
      },
      "extendStay": {
        "type": "number",
        "description": "Extra days client is willing to add"
      }
    },
    "required": ["propertyName", "checkIn", "checkOut", "totalPrice", "clientPhone"]
  }
}
```

**Exemplo de chamada:**
```javascript
const response = await fetch(`${process.env.API_URL}/api/ai/functions/calculate-dynamic-discount`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenantId: conversation.tenantId,
    propertyName: 'Apto Vista Mar',
    checkIn: '2025-12-01',
    checkOut: '2025-12-05',
    totalPrice: 2000,
    clientPhone: conversation.clientPhone,
    paymentMethod: 'pix',
    bookNow: false,
    extendStay: 0
  })
});

const result = await response.json();

// Use result.data.message como resposta ao cliente
return result.data.message;
```

---

## 📊 Exemplos de Uso

### Exemplo 1: Cliente pergunta sobre desconto PIX

**Input do cliente:**
> "Quanto fica se eu pagar no PIX?"

**Sofia chama a função:**
```json
{
  "propertyName": "Apto Vista Mar",
  "totalPrice": 2000,
  "paymentMethod": "pix"
}
```

**Resposta gerada:**
> Ótima escolha! Apto Vista Mar normalmente sai por R$ 2000.00.
>
> Mas tenho uma **proposta especial** para você: pagando à vista no **PIX**, consigo te dar um desconto de **10%**! 🎉
>
> Ou seja, você fecha por apenas **R$ 1800.00**. São R$ 200.00 de economia! Vale super a pena, né?

---

### Exemplo 2: Cliente quer estender estadia

**Input do cliente:**
> "E se eu ficar 3 dias a mais?"

**Sofia chama a função:**
```json
{
  "propertyName": "Apto Vista Mar",
  "checkIn": "2025-12-01",
  "checkOut": "2025-12-05",
  "totalPrice": 2000,
  "extendStay": 3
}
```

**Resposta gerada:**
> Olha, Apto Vista Mar está R$ 2000.00 para as datas que você pediu.
>
> Mas deixa eu te fazer uma **proposta irresistível**:
>
> Se você estender sua estadia para 7 dias, consigo te dar um **desconto de 15%** no valor total! Você aproveita mais dias e ainda economiza R$ 300.00.
>
> Valor final: **R$ 1700.00**
>
> Mais dias de férias + desconto = Negócio perfeito! O que me diz?

---

### Exemplo 3: Cliente quer parcelar

**Input do cliente:**
> "Posso parcelar?"

**Sofia chama a função:**
```json
{
  "propertyName": "Apto Vista Mar",
  "totalPrice": 2000,
  "paymentMethod": "card"
}
```

**Resposta gerada:**
> Perfeito! Apto Vista Mar sai por R$ 2000.00.
>
> E para facilitar para você, posso parcelar em até **10x sem juros** no cartão! Assim fica apenas R$ 200.00 por mês. O que acha?

---

## 🚀 Próximos Passos

### 1. **Criar System Prompt do Sales Agent** (Em Progresso)

Criar prompt especializado com:
- Tom persuasivo e carismático
- Técnicas de objeção handling
- Estratégias de upselling
- Gatilhos de urgência

### 2. **Funções Adicionais de Vendas**

- `suggest-upsell` - Sugerir serviços extras ou dias adicionais
- `handle-price-objection` - Lidar com objeções de preço
- `calculate-alternative-options` - Encontrar propriedades mais baratas

### 3. **Atualizar Workflow N8N**

- Adicionar SALES agent ao Router
- Integrar funções de negociação
- Configurar comportamento persuasivo

---

## 📝 Notas Técnicas

### Arquitetura de Dados

**Configurações são tenant-wide:**
- ✅ Armazenadas em `tenants/{tenantId}/settings/negotiation`
- ✅ Aplicam-se a todas as propriedades do tenant
- ✅ Podem ser alteradas a qualquer momento via UI

**Cache não é necessário:**
- Settings são lidas apenas durante chamadas de função
- Volume baixo de requests (apenas quando cliente negocia)
- Firebase Firestore tem latência <50ms para reads simples

### Segurança

**Validações implementadas:**
- ✅ Autenticação Firebase Auth obrigatória
- ✅ Validação de tenant ID em todas as requests
- ✅ Validação de campos obrigatórios
- ✅ Validação de ranges (0-100% para descontos)
- ✅ Sanitização de inputs de texto

**Limites de segurança:**
- ✅ `maxDiscountPercentage` nunca pode ser ultrapassado
- ✅ `minPriceAfterDiscount` garante preço mínimo
- ✅ `allowAINegotiation` permite desligar tudo

### Performance

**Otimizações:**
- ✅ Reads do Firestore apenas quando necessário
- ✅ Defaults em memória evitam read se não configurado
- ✅ Cálculos são simples (não requerem cache)
- ✅ Mensagens são geradas server-side (não usa LLM)

---

## 🎉 Resumo

**Status Atual:**
- ✅ Backend completo (types, API, função de desconto)
- ✅ Frontend completo (dialog de configuração)
- ✅ Integração na UI de propriedades
- ⏳ Falta: System prompt e integração N8N

**Funcionalidades:**
- ✅ 5 estratégias de desconto diferentes
- ✅ 4 presets rápidos
- ✅ Validações e limites de segurança
- ✅ Mensagens persuasivas personalizadas
- ✅ UI completa e intuitiva

**Próximo passo:** Criar system prompt do Sales Agent e integrar com N8N!
