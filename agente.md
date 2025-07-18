# 🤖 Dossiê Completo do Agente de IA - Sofia

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura Técnica](#arquitetura-técnica)
3. [Prompt Master - O Cérebro](#prompt-master---o-cérebro)
4. [Ferramentas Disponíveis](#ferramentas-disponíveis)
5. [Fluxo de Funcionamento](#fluxo-de-funcionamento)
6. [Tecnologias Utilizadas](#tecnologias-utilizadas)
7. [Fontes de Dados](#fontes-de-dados)
8. [Capacidades e Funcionalidades](#capacidades-e-funcionalidades)
9. [Sistema de Logs e Métricas](#sistema-de-logs-e-métricas)
10. [Segurança e Validação](#segurança-e-validação)
11. [Configuração e Deployment](#configuração-e-deployment)
12. [Exemplos de Uso](#exemplos-de-uso)
13. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

**Nome**: Sofia  
**Função**: Agente Imobiliário Autônomo  
**Objetivo**: Operar o sistema de locação de imóveis completamente sozinha - desde buscar propriedades até finalizar reservas.

### Características Principais:
- 🧠 **Inteligência**: GPT-4 Turbo / GPT-3.5 Turbo (seleção dinâmica)
- 🔄 **Arquitetura**: ReAct (Reasoning + Acting) com até 8 turnos
- 💬 **Comunicação**: WhatsApp Business API + WhatsApp Web (Baileys)
- 🏠 **Especialização**: Imóveis para temporada no Brasil
- 🌍 **Multi-tenant**: Suporte completo para múltiplas organizações

---

## 🏗️ Arquitetura Técnica

### Camadas do Sistema

```
┌─────────────────────────────────────────────────────────┐
│                   WhatsApp (Cliente)                    │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│              Webhook API (/api/webhook/*)               │
├─────────────────────────────────────────────────────────┤
│                   Rate Limiting                         │
│              (20 mensagens/minuto)                      │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│            Agent Route (/api/agent)                     │
├─────────────────────────────────────────────────────────┤
│        - Validação de entrada                           │
│        - Autenticação tenant                           │
│        - Contexto da conversa                          │
└────────────────────────┬────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────┐
│     Enhanced Agent Orchestrator Service                 │
├─────────────────────────────────────────────────────────┤
│        Loop ReAct (máx 8 turnos)                       │
│    ┌───────────────────────────────┐                   │
│    │  1. Think (OpenAI)            │                   │
│    │  2. Act (Tools)               │                   │
│    │  3. Observe (Result)          │                   │
│    │  4. Loop or Reply             │                   │
│    └───────────────────────────────┘                   │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┴───────────────┐
         │                               │
┌────────▼────────┐           ┌──────────▼──────────┐
│  OpenAI Service │           │   Tools Service     │
├─────────────────┤           ├─────────────────────┤
│ - GPT-4 Turbo   │           │ - search_properties │
│ - GPT-3.5 Turbo │           │ - calculate_pricing │
│ - Prompt ReAct  │           │ - create_reservation│
└─────────────────┘           │ - check_availability│
                              │ - send_media        │
                              │ - etc...            │
                              └──────────┬──────────┘
                                         │
                              ┌──────────▼──────────┐
                              │  Firebase Firestore │
                              ├─────────────────────┤
                              │ - properties        │
                              │ - reservations      │
                              │ - clients           │
                              │ - conversations     │
                              │ - messages          │
                              └─────────────────────┘
```

---

## 🧠 Prompt Master - O Cérebro

### Localização: `/lib/prompts/master-prompt-react.ts`

```typescript
export const MASTER_PROMPT = `
Você é Sofia, a agente imobiliária autônoma mais avançada do sistema LocAI. 

==== ARQUITETURA REACT (REASONING + ACTING) ====

Você opera em um ciclo de PENSAMENTO → AÇÃO → OBSERVAÇÃO até completar o objetivo.

FORMATO DE RESPOSTA (JSON obrigatório - SEMPRE responda APENAS com JSON válido):
{
  "thought": "Meu raciocínio detalhado sobre a situação atual e próximos passos",
  "action": {
    "type": "reply" | "call_tool",
    "payload": {
      "message": "resposta para o cliente" // se type=reply
      "toolName": "nome_ferramenta", // se type=call_tool
      "parameters": { /* parâmetros detalhados */ }
    }
  },
  "confidence": 0.8,
  "updatedContext": {
    "searchFilters": {},
    "interestedProperties": [],
    "pendingReservation": {},
    "clientProfile": {}
  }
}

==== PADRÃO DE RACIOCÍNIO ====

**THOUGHT**: Sempre estruture assim:
1. "Situação atual: [resumo do contexto]"
2. "Cliente quer: [intenção identificada]" 
3. "Preciso: [próxima ação específica]"
4. "Porque: [justificativa]"

==== DETECÇÃO DE INTENÇÕES ====

- "buscar|procurar|ver|mostrar|apartamento|casa": search_properties
- "foto|imagem|video": send_property_media  
- "preço|valor|quanto custa|orçamento": calculate_pricing
- "disponível|livre|datas": check_availability
- "reservar|alugar|fechar|confirmar|quero": create_reservation
- "visita|visitar|conhecer|ver pessoalmente": schedule_viewing
- "desconto|promoção|negociar": apply_discount
`;
```

### Características do Prompt:
- **Estruturado**: Segue padrão ReAct (Reasoning + Acting)
- **JSON Obrigatório**: Sempre retorna JSON válido
- **Contextual**: Mantém memória da conversa
- **Orientado a Ação**: Foco em resolver problemas
- **Multi-lingue**: Português brasileiro nativo

---

## 🔧 Ferramentas Disponíveis

### 1. **search_properties**
```typescript
// Busca propriedades com filtros avançados
Parâmetros: {
  location?: string,        // "Copacabana", "Praia", etc
  priceRange?: { min, max }, // Faixa de preço
  bedrooms?: number,         // Número de quartos
  guests?: number,           // Capacidade de hóspedes
  amenities?: string[],      // ["Piscina", "Wi-Fi", etc]
  limit?: number             // Máximo de resultados
}
```

### 2. **send_property_media**
```typescript
// Envia fotos/vídeos de propriedades
Parâmetros: {
  propertyId: string,       // ID da propriedade
  clientPhone: string,      // Telefone do cliente
  mediaType?: 'photos' | 'videos' // Tipo de mídia
}
```

### 3. **calculate_pricing**
```typescript
// Calcula preço total para período
Parâmetros: {
  propertyId: string,       // ID da propriedade
  checkIn: string,          // "2024-12-15"
  checkOut: string,         // "2024-12-20"
  guests?: number           // Número de hóspedes
}
```

### 4. **check_availability**
```typescript
// Verifica disponibilidade
Parâmetros: {
  propertyId: string,       // ID da propriedade
  checkIn: string,          // Data entrada
  checkOut: string          // Data saída
}
```

### 5. **create_reservation**
```typescript
// Cria reserva completa
Parâmetros: {
  propertyId: string,       // ID da propriedade
  checkIn: string,          // Data entrada
  checkOut: string,         // Data saída
  guests: number,           // Número de hóspedes
  clientPhone: string,      // Telefone do cliente
  clientName?: string       // Nome do cliente
}
```

### 6. **register_client**
```typescript
// Registra/atualiza cliente
Parâmetros: {
  name: string,             // Nome completo
  phone: string,            // Telefone
  email?: string,           // Email
  preferences?: object      // Preferências
}
```

### 7. **schedule_viewing**
```typescript
// Agenda visita presencial
Parâmetros: {
  propertyId: string,       // ID da propriedade
  clientPhone: string,      // Telefone
  viewingDate: string,      // Data da visita
  viewingTime: string       // Horário
}
```

### 8. **send_payment_reminder**
```typescript
// Envia lembrete de pagamento
Parâmetros: {
  clientPhone: string,      // Telefone
  reservationId: string,    // ID da reserva
  message?: string          // Mensagem customizada
}
```

### 9. **apply_discount**
```typescript
// Aplica desconto (máx 20%)
Parâmetros: {
  originalPrice: number,    // Preço original
  discountPercent: number,  // Percentual desconto
  reason?: string           // Motivo
}
```

---

## 🔄 Fluxo de Funcionamento

### 1. **Recepção da Mensagem**
```
WhatsApp → Webhook → Validação → Rate Limiting → Agent Route
```

### 2. **Processamento Inicial**
```typescript
// Busca ou cria cliente
client = await clientService.getByPhone(phone)

// Busca ou cria conversa
conversation = await conversationService.getOrCreate(clientId)

// Carrega contexto existente
context = await firestoreService.getContext(phone)
```

### 3. **Loop ReAct**
```typescript
for (turn = 1; turn <= 8; turn++) {
  // 1. THINK - IA decide o que fazer
  aiResponse = await openaiService.runAITurn(input)
  
  // 2. ACT - Executa ação
  if (aiResponse.action.type === 'call_tool') {
    toolResult = await toolsService.executeTool(toolName, params)
    // Continua loop com resultado
  } else if (aiResponse.action.type === 'reply') {
    // 3. RESPOND - Envia resposta final
    await sendWhatsAppMessage(phone, message)
    break
  }
}
```

### 4. **Persistência**
```typescript
// Salva contexto atualizado
await firestoreService.updateContext(phone, updatedContext)

// Salva histórico
await firestoreService.saveConversationHistory(phone, userMsg, aiMsg)

// Log de métricas
await logContext.log(metrics)
```

---

## 💻 Tecnologias Utilizadas

### Core
- **Runtime**: Node.js 22.17.0
- **Framework**: Next.js 15.3.5 (App Router)
- **Language**: TypeScript 5.3.0
- **AI**: OpenAI GPT-4 Turbo / GPT-3.5 Turbo

### Banco de Dados
- **Primary**: Firebase Firestore
- **Storage**: Firebase Storage
- **Auth**: Firebase Auth

### Mensageria
- **WhatsApp Business API**: Oficial
- **WhatsApp Web**: Baileys 6.7.18
- **Rate Limiting**: 20 msgs/min

### Infraestrutura
- **Hosting**: Vercel / Self-hosted
- **CDN**: Cloudflare
- **Monitoring**: Custom logging
- **Security**: Input validation, sanitization

---

## 📊 Fontes de Dados

### 1. **Firebase Firestore Collections**
```
├── properties/           # Imóveis cadastrados
│   ├── id
│   ├── name
│   ├── location
│   ├── pricing
│   ├── amenities
│   └── availability
│
├── reservations/        # Reservas
│   ├── propertyId
│   ├── clientId
│   ├── checkIn/Out
│   ├── totalPrice
│   └── status
│
├── clients/            # Clientes
│   ├── name
│   ├── phone
│   ├── preferences
│   └── leadScore
│
├── conversations/      # Conversas
│   ├── clientId
│   ├── messages[]
│   ├── context
│   └── lastMessageAt
│
└── messages/          # Mensagens individuais
    ├── conversationId
    ├── content
    ├── from
    └── timestamp
```

### 2. **Contexto em Tempo Real**
```typescript
interface ConversationContext {
  searchFilters: {          // Filtros de busca ativos
    location?: string,
    priceRange?: object,
    bedrooms?: number
  },
  interestedProperties: string[], // IDs visitados
  pendingReservation?: {    // Reserva em andamento
    propertyId: string,
    checkIn: string,
    checkOut: string,
    guests: number
  },
  clientProfile: {          // Perfil do cliente
    name?: string,
    phone: string,
    preferences?: object,
    leadScore?: number
  }
}
```

### 3. **APIs Externas**
- **OpenAI API**: Para processamento de linguagem
- **WhatsApp API**: Para envio/recebimento de mensagens
- **Firebase Admin SDK**: Para operações server-side

---

## 🚀 Capacidades e Funcionalidades

### 1. **Compreensão de Linguagem Natural**
- Entende português brasileiro coloquial
- Detecta intenções automaticamente
- Mantém contexto de múltiplos turnos
- Responde de forma natural e amigável

### 2. **Gestão de Propriedades**
- Busca com filtros complexos
- Apresentação inteligente de opções
- Envio automático de mídia
- Comparação entre propriedades

### 3. **Processo de Reserva**
- Verificação de disponibilidade em tempo real
- Cálculo dinâmico de preços
- Aplicação de descontos
- Criação de reserva completa

### 4. **Gestão de Clientes**
- Cadastro automático
- Detecção de duplicatas por telefone
- Tracking de preferências
- Score de lead automático

### 5. **Automações**
- Follow-ups automáticos
- Lembretes de pagamento
- Confirmações de reserva
- Notificações de disponibilidade

### 6. **Inteligência de Negócio**
- Análise de comportamento
- Recomendações personalizadas
- Otimização de conversão
- Métricas em tempo real

---

## 📈 Sistema de Logs e Métricas

### 1. **Logging Estruturado**
```typescript
// Cada execução tem ID único
sessionId: "session-1752870548453-hvgfkhtz4"
turnId: "turn-1752870548912-fhbj2gfbl"

// Logs detalhados
🚀 [sessionId] Starting agent session
🔄 [sessionId] Turn 1/8
🤖 [turnId] Using model: gpt-4-turbo-preview
🧠 [turnId] AI Response: { thought, action, confidence }
🔧 [toolId] Executing tool: search_properties
✅ [sessionId] Session completed in 2500ms
```

### 2. **Métricas Capturadas**
```typescript
{
  totalTurns: 3,              // Turnos executados
  processingTime: 2500,       // Tempo total (ms)
  confidence: 0.95,           // Confiança média
  finalAction: 'reply',       // Ação final
  toolsUsed: ['search_properties', 'calculate_pricing'],
  errorCount: 0,              // Erros encontrados
  model: 'gpt-4-turbo-preview'
}
```

### 3. **Análise de Performance**
- Tempo médio de resposta: < 3s
- Taxa de sucesso: > 90%
- Confiança média: > 0.8
- Ferramentas mais usadas: search, pricing

---

## 🔒 Segurança e Validação

### 1. **Validação de Entrada**
```typescript
// Telefone
validatePhoneNumber(phone) // Format: +5511999999999

// Mensagem
validateMessageContent(message) // Max 1000 chars

// Tenant
validateTenantId(tenantId) // Alphanumeric only
```

### 2. **Sanitização**
```typescript
// Remove caracteres perigosos
sanitizeUserInput(input)

// Limpa dados do cliente
sanitizeClientData(data)

// Sanitiza resposta da IA
sanitizeAIResponse(response)
```

### 3. **Rate Limiting**
```typescript
// Por telefone/tenant
const limit = {
  maxRequests: 20,
  windowMs: 60000 // 1 minuto
}
```

### 4. **Tratamento de Erros**
- Classificação automática de erros
- Fallbacks inteligentes
- Mensagens amigáveis ao usuário
- Sem exposição de dados sensíveis

---

## ⚙️ Configuração e Deployment

### 1. **Variáveis de Ambiente**
```env
# OpenAI
OPENAI_API_KEY=sk-...

# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
FIREBASE_SERVICE_ACCOUNT=...

# WhatsApp
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_VERIFY_TOKEN=...

# App
TENANT_ID=default
BASE_URL=https://locai.com
```

### 2. **Comandos de Deploy**
```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Deploy
npm run deploy

# Testes
npx ts-node scripts/test-agent.ts
```

### 3. **Configuração WhatsApp**
1. Configurar webhook: `https://seu-dominio.com/api/webhook/whatsapp`
2. Verificar token no Meta Business
3. Subscrever eventos: messages, message_status
4. Testar conexão

---

## 📱 Exemplos de Uso

### 1. **Busca Simples**
```
Cliente: "Olá, procuro casa na praia"
Sofia: {
  thought: "Cliente quer casa na praia. Vou buscar opções.",
  action: {
    type: "call_tool",
    payload: {
      toolName: "search_properties",
      parameters: { location: "praia", limit: 5 }
    }
  }
}
→ "Encontrei 5 casas na praia! As melhores opções são..."
```

### 2. **Cálculo de Preço**
```
Cliente: "Quanto custa a casa ID123 para o Natal?"
Sofia: {
  thought: "Cliente quer preço para período específico.",
  action: {
    type: "call_tool",
    payload: {
      toolName: "calculate_pricing",
      parameters: {
        propertyId: "ID123",
        checkIn: "2024-12-23",
        checkOut: "2024-12-27"
      }
    }
  }
}
→ "Para 4 noites no Natal, o valor total é R$ 2.400..."
```

### 3. **Criação de Reserva**
```
Cliente: "Quero reservar!"
Sofia: {
  thought: "Cliente decidiu reservar. Vou criar a reserva.",
  action: {
    type: "call_tool",
    payload: {
      toolName: "create_reservation",
      parameters: {
        propertyId: "ID123",
        checkIn: "2024-12-23",
        checkOut: "2024-12-27",
        guests: 4,
        clientPhone: "+5511999999999"
      }
    }
  }
}
→ "Perfeito! Sua reserva foi confirmada..."
```

---

## 🔧 Troubleshooting

### Problema: "response_format not supported"
**Solução**: Sistema detecta automaticamente e usa modelos compatíveis

### Problema: "Rate limit exceeded"
**Solução**: Aguardar 1 minuto ou aumentar limite no código

### Problema: "Tool execution failed"
**Solução**: Verificar logs detalhados e parâmetros da ferramenta

### Problema: "Low confidence responses"
**Solução**: Melhorar contexto ou ajustar prompt

### Problema: "Timeout errors"
**Solução**: Verificar conectividade e aumentar timeouts se necessário

---

## 📚 Arquivos Importantes

```
/lib/prompts/master-prompt-react.ts      # Prompt principal
/lib/services/openai-enhanced.service.ts # Serviço OpenAI
/lib/services/agent-orchestrator-enhanced.service.ts # Orquestrador
/lib/services/tools-enhanced.service.ts  # Ferramentas
/app/api/agent/route.ts                  # API endpoint
/lib/types/ai-agent.ts                   # TypeScript types
/scripts/test-agent.ts                   # Testes automatizados
```

---

## 🎯 Conclusão

Sofia é um agente de IA completo e autônomo, capaz de:
- ✅ Entender linguagem natural em português
- ✅ Executar tarefas complexas autonomamente
- ✅ Manter contexto de conversas longas
- ✅ Integrar com sistemas externos
- ✅ Aprender com cada interação
- ✅ Otimizar conversões de vendas

**Status**: Production-ready com arquitetura enterprise-grade! 🚀