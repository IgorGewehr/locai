# Sofia V3 - AI Sales Agent Architecture (2025)

## 📋 Índice
1. [Visão Geral Sofia V3](#visão-geral-sofia-v3)
2. [Arquitetura Completa](#arquitetura-completa)
3. [Sistema de Funções Expandido](#sistema-de-funções-expandido)
4. [Personalidade de Vendas](#personalidade-de-vendas)
5. [Gerenciamento de Contexto Avançado](#gerenciamento-de-contexto-avançado)
6. [Sistema de Agendamento de Visitas](#sistema-de-agendamento-de-visitas)
7. [Correções e Melhorias](#correções-e-melhorias)
8. [Migração GPT-4o Mini](#migração-gpt-4o-mini)
9. [Dashboard de Clientes](#dashboard-de-clientes)
10. [Documentação Técnica](#documentação-técnica)

---

## 🎯 Visão Geral Sofia V3

Sofia é uma **consultora especializada em locações por temporada** que foi completamente redesenhada para ser uma **agente de vendas profissional** focada em conversão de leads e fechamento de reservas.

### 🚀 **Principais Características V3**
1. **Consultora de Vendas**: Personalidade focada em conversão e urgência
2. **8 Funções Avançadas**: Sistema completo de gerenciamento de vendas
3. **Sistema de Visitas**: Agendamento completo de visitas presenciais
4. **Coleta de CPF**: Registro completo de clientes com documento
5. **Gestão de Mídia**: Compartilhamento automático de fotos e vídeos
6. **GPT-4o Mini**: Migração para modelo mais eficiente e econômico
7. **IDs Corrigidos**: Sistema robusto de referência de propriedades
8. **Dashboard Integrado**: Interface completa para gestão de clientes

---

## 🏗️ Arquitetura Completa

### Fluxo Principal V3
```
WhatsApp → API Route → Sofia Agent V3 → GPT-4o Mini → Function Calls → Sales Response
```

### Componentes Principais
- **Sofia Agent V3**: Consultora de vendas com personalidade otimizada
- **Agent Functions Corrected**: 8 funções especializadas
- **Visit Appointment System**: Sistema completo de agendamento
- **Sales Personality Module**: Técnicas de vendas integradas
- **Property ID Context**: Gerenciamento robusto de IDs
- **Client Dashboard**: Interface para gestão de leads

---

## 📁 Estrutura de Arquivos V3

```
lib/ai-agent/
├── sofia-agent-v3.ts              # Agente principal V3 (VERSÃO ATUAL)
└── professional-agent.ts          # Versão anterior (DEPRECATED)

lib/ai/
├── agent-functions-corrected.ts   # 8 funções especializadas
├── sales-personality.ts           # Personalidade de vendas avançada
└── response-generator.ts          # Sistema de respostas otimizado

lib/types/
├── visit-appointment.ts           # Sistema completo de visitas
├── ai.ts                         # Types atualizados para GPT-4o Mini
└── index.ts                      # Client interface com CPF

lib/services/
├── openai.service.ts             # Migrado para GPT-4o Mini
├── openai-enhanced.service.ts    # Enhanced service V3
└── conversation-context-service.ts # Gerenciamento avançado

app/dashboard/
└── clients/page.tsx              # Dashboard de clientes funcional

lib/validation/
└── schemas.ts                    # Schemas atualizados (só GPT-4o Mini)
```

---

## 🛠 Sistema de Funções Expandido

### 8 Funções Especializadas V3

#### 1. **search_properties** (APRIMORADA)
```typescript
{
  location?: string,        // Cidade/região
  guests?: number,         // Número de hóspedes
  checkIn?: string,        // Data check-in (YYYY-MM-DD)
  checkOut?: string,       // Data check-out (YYYY-MM-DD)
  amenities?: string[]     // Filtros de comodidades (NOVO)
}
```
**Melhorias**:
- Ordenação por preço ascendente (mais baratos primeiro)
- Filtros de comodidades (piscina, estacionamento, banheira, etc.)
- Retorna máximo 5 propriedades para não sobrecarregar
- IDs reais do Firebase (sem mais "1", "2", "3")

#### 2. **calculate_price** (DINAMICO)
```typescript
{
  propertyId: string,      // ID real da propriedade
  checkIn?: string,        // Data check-in
  checkOut?: string,       // Data check-out
  guests?: number          // Número de hóspedes
}
```
**Melhorias**:
- Cálculo dinâmico com multiplicadores
- Consideração de feriados brasileiros
- Surcharges por número de hóspedes
- Preço médio por diária
- Detalhamento completo dos custos

#### 3. **send_property_media** (NOVA)
```typescript
{
  propertyId: string,      // ID da propriedade
  mediaType?: 'photos' | 'videos' | 'all'
}
```
**Funcionalidades**:
- Envio automático de fotos via WhatsApp
- Suporte a vídeos de propriedades
- Captions personalizadas para cada mídia
- Integração com WhatsApp Business API

#### 4. **register_client** (APRIMORADA COM CPF)
```typescript
{
  name: string,            // Nome completo
  phone: string,          // Telefone
  document?: string,       // CPF (OBRIGATÓRIO)
  email?: string          // Email opcional
}
```
**Melhorias**:
- CPF obrigatório para registro completo
- Deduplicação por telefone
- Retorna apenas ID string (sem objeto)
- Tratamento robusto de dados duplicados

#### 5. **create_reservation** (ROBUSTA)
```typescript
{
  propertyId: string,      // ID real da propriedade
  clientId: string,        // ID do cliente registrado
  checkIn: string,         // Data check-in
  checkOut: string,        // Data check-out
  guests: number,          // Número de hóspedes
  notes?: string          // Observações especiais
}
```

#### 6. **schedule_visit** (NOVA)
```typescript
{
  propertyId: string,      // ID da propriedade
  clientId: string,        // ID do cliente
  preferredDate: string,   // Data preferida (YYYY-MM-DD)
  preferredTime: string,   // Horário preferido
  notes?: string          // Observações
}
```
**Funcionalidades**:
- Sistema completo de agendamento
- Verificação de disponibilidade do agente
- Horários comerciais configuráveis
- Notificações automáticas

#### 7. **check_visit_availability** (NOVA)
```typescript
{
  date: string,           // Data para verificar (YYYY-MM-DD)
  propertyId?: string     // ID da propriedade (opcional)
}
```
**Funcionalidades**:
- Verificação de horários disponíveis
- Consideração de agenda do agente
- Sugestão de horários alternativos
- Integração com sistema de visitas

#### 8. **get_property_details** (MELHORADA)
```typescript
{
  propertyId: string      // ID real da propriedade
}
```
**Melhorias**:
- Detalhes completos da propriedade
- Informações de localização precisas
- Lista completa de comodidades
- Status de disponibilidade
- Preços e políticas

---

## 💼 Personalidade de Vendas

### Sistema de Personalidade Avançado
Sofia V3 utiliza o módulo `sales-personality.ts` com técnicas profissionais de vendas:

#### Características Principais
```typescript
{
  name: 'Sofia',
  tone: 'friendly_professional',    // Amigável mas expert
  style: 'consultative',           // Focada em soluções
  responseLength: 'adaptive',      // Baseado no engajamento
  model: 'gpt-4o-mini',           // Modelo otimizado
  temperature: 0.7,               // Criatividade balanceada
  maxTokens: 800                  // Respostas completas
}
```

#### Comportamentos de Vendas
- **Tratamento de Objeções**: Respostas específicas para preço, localização, disponibilidade
- **Criação de Urgência**: Mensagens de escassez, limite de tempo, popularidade
- **Prova Social**: Depoimentos, estatísticas, atividade recente
- **Conexão Emocional**: Foco em família, experiência, valor

### Prompt Otimizado V3
```
Você é Sofia, consultora especializada em locações por temporada com foco em VENDAS e CONVERSÃO.

PERSONALIDADE PROFISSIONAL:
- Consultora experiente e confiável
- Entusiasmada em fechar negócios
- Cria senso de urgência apropriado
- Oferece sempre alternativas
- Foca em benefícios, não apenas características

FLUXO DE VENDAS OBRIGATÓRIO:
1. Apresente propriedades com: nome, localização, preço médio/diária
2. SEMPRE pergunte se cliente quer ver fotos/vídeos (use send_property_media)
3. Colete CPF além de nome e telefone (use register_client)
4. Ofereça alternativas com comodidades (piscina, estacionamento, banheira)
5. Dê DUAS opções: VISITA presencial OU reserva direta
6. Use técnicas de urgência e prova social

REGRAS DE CONVERSÃO:
- Propriedades mais baratas primeiro
- Sempre mencione diferenciais únicos
- Crie experiências emocionais ("imagine sua família aqui...")
- Use prova social ("95% recomendam", "nota 4.9/5")
- Ofereça desconto por decisão rápida
```

---

## 🧮 Gerenciamento de Contexto Avançado

### Interface de Contexto V3
```typescript
interface AgentContext {
  searchCriteria?: PropertySearchFilters
  interestedProperties?: string[]           // IDs reais das propriedades
  pendingReservation?: PendingReservation
  pendingVisit?: PendingVisitAppointment   // NOVO
  clientId?: string                        // ID do cliente registrado
  clientProfile?: {                        // EXPANDIDO
    name?: string
    phone?: string
    document?: string                      // CPF
    email?: string
    preferences?: ClientPreferences
    leadScore?: number
    totalReservations?: number
    totalSpent?: number
  }
  conversationStage?: ConversationStage
  lastPropertyShown?: string
  mediaShared?: string[]                   // NOVO - controle de mídia compartilhada
}
```

### Sistema de IDs Corrigido
Para resolver o problema de IDs incorretos ("1", "2", "3"), implementamos:

```typescript
// Context com IDs reais
messages.push({
  role: 'system',
  content: `PROPRIEDADES ENCONTRADAS (IDs REAIS para usar nas funções):
1ª opção: ID = "${context.context.interestedProperties[0]}"
2ª opção: ID = "${context.context.interestedProperties[1] || 'N/A'}"
3ª opção: ID = "${context.context.interestedProperties[2] || 'N/A'}"

OBRIGATÓRIO: Use estes IDs EXATOS quando cliente falar "primeira", "segunda", etc.`
});
```

---

## 📅 Sistema de Agendamento de Visitas

### Tipos Completos V3
```typescript
export interface VisitAppointment {
  id: string
  clientId: string
  propertyId: string
  tenantId: string
  scheduledDate: Date
  scheduledTime: string
  status: VisitStatus
  type: VisitType
  agentId?: string
  notes?: string
  createdAt: Date
  updatedAt: Date
  confirmationSent: boolean
  reminderSent: boolean
  clientInfo: {
    name: string
    phone: string
    email?: string
  }
  propertyInfo: {
    title: string
    address: string
    coordinates?: { lat: number, lng: number }
  }
}

export type VisitStatus = 
  | 'scheduled'    // Agendada
  | 'confirmed'    // Confirmada pelo cliente
  | 'completed'    // Realizada
  | 'cancelled'    // Cancelada
  | 'no_show'      // Cliente não compareceu
  | 'rescheduled'  // Reagendada

export type VisitType = 
  | 'property_tour'      // Tour pela propriedade
  | 'consultation'       // Consulta/orientação
  | 'key_handover'       // Entrega de chaves
  | 'check_in_support'   // Apoio no check-in
```

### Fluxo de Agendamento
1. Cliente manifesta interesse em visita
2. Sofia pergunta data e horário preferidos
3. `check_visit_availability` verifica disponibilidade
4. `schedule_visit` confirma o agendamento
5. Sistema envia confirmação automática
6. Lembretes são enviados antes da visita

---

## ⚠️ Correções e Melhorias

### **Problema 1**: IDs Incorretos ("1", "2", "3")
**Causa**: Sofia usava IDs fictícios ao invés dos IDs reais do Firebase
**Solução V3**:
- Context com IDs reais das propriedades encontradas
- Prompt explícito com mapeamento de IDs
- Validação de IDs antes de executar funções
- Logs detalhados para debug

### **Problema 2**: Client ID como [object Object]
**Causa**: `register_client` retornava objeto completo ao invés de apenas ID
**Solução V3**:
```typescript
// ANTES (PROBLEMA)
return {
  success: true,
  client: clientDoc // Objeto completo
}

// DEPOIS (CORRIGIDO)
return {
  success: true,
  client: client.id, // APENAS O ID STRING
  clientData: { // Dados completos em campo separado
    id: client.id,
    name: client.name,
    // ...
  }
}
```

### **Problema 3**: Propriedades não ordenadas por preço
**Causa**: Sort function não funcionava corretamente
**Solução V3**:
```typescript
// Ordenação explícita por preço ascendente
.sort((a, b) => {
  const priceA = a.pricing?.basePrice || 0;
  const priceB = b.pricing?.basePrice || 0;
  return priceA - priceB; // Mais barato primeiro
})
```

### **Problema 4**: Firebase undefined errors
**Causa**: Tentativa de salvar campos undefined
**Solução V3**:
```typescript
// Filtrar campos undefined
const filteredData = Object.fromEntries(
  Object.entries(data).filter(([_, value]) => 
    value !== undefined && value !== null && value !== ''
  )
);
```

---

## 🚀 Migração GPT-4o Mini

### Benefícios da Migração
- **Custo**: 60% mais barato que GPT-3.5 Turbo
- **Performance**: Mais rápido que GPT-4
- **Qualidade**: Superior ao GPT-3.5 Turbo
- **Eficiência**: Melhor compreensão de contexto

### Arquivos Migrados
```typescript
// Todos os arquivos agora usam apenas GPT-4o Mini:
- lib/services/openai.service.ts           ✅ gpt-4o-mini
- lib/services/openai-enhanced.service.ts  ✅ gpt-4o-mini
- lib/config/agent-config.ts               ✅ gpt-4o-mini
- lib/ai/sales-personality.ts              ✅ gpt-4o-mini
- lib/validation/schemas.ts                ✅ apenas gpt-4o-mini permitido
```

### Configuração Otimizada
```typescript
{
  model: 'gpt-4o-mini',
  temperature: 0.7,        // Criatividade para vendas
  max_tokens: 800,         // Respostas completas
  top_p: 0.8,
  frequency_penalty: 0.1,
  presence_penalty: 0.1
}
```

---

## 👥 Dashboard de Clientes

### Interface Atualizada V3
Localização: `/app/dashboard/clients/page.tsx`

#### Funcionalidades Implementadas
- **Lista Completa**: Todos os clientes com dados reais
- **Informações CPF**: Documento exibido quando disponível
- **Estatísticas**: Total de reservas e valor gasto
- **Refresh Button**: Atualização manual dos dados
- **Estados de Loading**: UX aprimorada
- **Error Handling**: Tratamento robusto de erros
- **Empty States**: Mensagens quando sem dados

#### Interface Cliente V3
```typescript
export interface Client {
  id: string
  name: string
  email?: string
  phoneNumber: string
  document?: string              // CPF
  address?: ClientAddress
  preferences?: ClientPreferences
  tags: string[]
  tenantId: string
  createdAt: Date
  updatedAt: Date
  source?: 'whatsapp' | 'website' | 'referral' | 'manual'
  totalReservations?: number     // NOVO
  totalSpent?: number           // NOVO
  lastInteraction?: Date        // NOVO
}
```

### Serviços Integrados
- `clientServiceWrapper`: Serviço unificado
- Integração com Firestore
- Caching para performance
- Validação de dados

---

## 📊 Fluxo de Vendas Completo V3

### 1. **Greeting & Discovery**
- Sofia cumprimenta e identifica necessidades
- Coleta informações básicas: cidade, datas, pessoas
- Estabelece rapport e confiança

### 2. **Property Presentation**
- Busca propriedades com `search_properties`
- Apresenta com nome, localização, preço médio
- **SEMPRE pergunta se quer ver fotos/vídeos**

### 3. **Media Sharing**
- Usa `send_property_media` automaticamente
- Compartilha fotos com captions otimizadas
- Destaca diferenciais visuais

### 4. **Client Registration**
- Coleta nome, telefone e **CPF obrigatório**
- Usa `register_client` com dados completos
- Deduplicação por telefone

### 5. **Objection Handling**
- Trata objeções de preço com alternativas
- Oferece propriedades com comodidades específicas
- Cria urgência com escassez e tempo limite

### 6. **Decision Point**
- Oferece **DUAS opções claras**:
  - **Visita presencial**: Usa `schedule_visit`
  - **Reserva direta**: Usa `create_reservation`

### 7. **Closing**
- Confirma todos os detalhes
- Finaliza com urgência apropriada
- Gera confirmações automáticas

---

## 🎯 Prompt System V3

### Prompt Principal Otimizado
```
Você é Sofia, consultora ESPECIALISTA em locações por temporada com FOCO EM VENDAS.

🎯 OBJETIVO: Converter leads em reservas através de consultoria profissional.

🏆 PERSONALIDADE PROFISSIONAL:
- Consultora experiente e entusiasmada
- Cria senso de urgência apropriado
- Sempre oferece alternativas
- Foca em benefícios emocionais
- Usa técnicas de prova social

📋 FLUXO DE VENDAS OBRIGATÓRIO:
1. Apresente propriedades com: NOME + LOCALIZAÇÃO + PREÇO MÉDIO/DIÁRIA
2. SEMPRE pergunte: "Gostaria de ver as fotos e vídeos desta propriedade?"
3. Registre cliente com: NOME + TELEFONE + CPF (obrigatório)
4. Ofereça alternativas baseadas em comodidades (piscina, estacionamento, banheira)
5. Dê DUAS opções claras: VISITA presencial OU reserva direta
6. Use urgência: "apenas 2 datas disponíveis", "95% recomendam"

🎨 TÉCNICAS DE CONVERSÃO:
- Mostre propriedades mais baratas PRIMEIRO
- Use experiências emocionais: "imagine sua família relaxando aqui..."
- Aplique prova social: "nota 4.9/5", "família acabou de fazer check-out e adorou"
- Ofereça desconto por decisão rápida
- Sempre mencione diferenciais únicos

⚠️ REGRAS CRÍTICAS:
- Use IDs REAIS das propriedades (nunca invente)
- Quando cliente falar "primeira", "segunda", use o ID correto do contexto
- CPF é OBRIGATÓRIO no registro de cliente
- Sempre ofereça ver mídia após apresentar propriedade
- Dê opção de visita E reserva direta

🚀 FUNÇÃO PARA CADA SITUAÇÃO:
- Busca: search_properties
- Mídia: send_property_media
- Preços: calculate_price  
- Registro: register_client (com CPF)
- Visita: schedule_visit
- Reserva: create_reservation
```

---

## 🔧 Documentação Técnica

### Configuração de Desenvolvimento
```bash
# Instalar dependências
npm install

# Iniciar desenvolvimento
npm run dev

# Testar Sofia V3
# Acesse: http://localhost:3000/dashboard/teste
```

### Variáveis de Ambiente
```bash
# OpenAI (obrigatório)
OPENAI_API_KEY=sk-...

# Firebase (obrigatório)  
NEXT_PUBLIC_FIREBASE_API_KEY=...
FIREBASE_PRIVATE_KEY=...

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_PHONE_NUMBER_ID=...
```

### Estrutura de Testes
```typescript
// Cenários de teste recomendados:
1. "olá, quero um ap em floripa"
2. "quero ver fotos"  
3. "meu nome é João, telefone 11999999999, CPF 12345678901"
4. "prefiro agendar uma visita"
5. "quero fazer a reserva direto"
```

### Logs de Debug
Sofia V3 inclui logging detalhado:
```typescript
// Logs principais
console.log('🏠 Propriedades encontradas:', properties.length);
console.log('💰 Preço calculado:', calculation);
console.log('📞 Cliente registrado ID:', clientId);
console.log('📅 Visita agendada:', appointment);
```

---

## ✅ Status Atual V3

### ✅ **Recursos Implementados**
- [x] Personalidade de vendas otimizada
- [x] 8 funções especializadas funcionando
- [x] Sistema de visitas completo
- [x] Coleta de CPF obrigatória
- [x] IDs reais corrigidos
- [x] Migração GPT-4o Mini
- [x] Dashboard de clientes funcional
- [x] Compartilhamento de mídia
- [x] Ordenação por preço
- [x] Tratamento de objetos duplicate

### ✅ **Correções Validadas**
- [x] Sofia não assume mais Florianópolis
- [x] IDs reais ao invés de "1", "2", "3"
- [x] Client ID como string, não objeto
- [x] Propriedades ordenadas por preço
- [x] Firebase undefined errors corrigidos
- [x] Funções executam sem erro
- [x] Context management robusto
- [x] Error handling profissional

### 🚀 **Performance e Economia**
- [x] GPT-4o Mini: 60% economia vs GPT-3.5
- [x] Respostas mais rápidas e inteligentes
- [x] Function calling otimizado
- [x] Context management eficiente
- [x] Error recovery automático

---

## 🎉 **Sofia V3 está pronta para produção!**

A nova versão representa um salto qualitativo significativo:
- **Consultora profissional** focada em vendas
- **Sistema completo** de gestão de leads
- **Tecnologia avançada** com GPT-4o Mini
- **Robustez empresarial** com error handling
- **Interface integrada** para gestão

**Sofia V3 é uma agente de vendas completa pronta para converter visitantes em clientes pagantes! 💪🏆**