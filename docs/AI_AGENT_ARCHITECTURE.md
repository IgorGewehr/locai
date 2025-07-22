# Sofia AI Agent - Arquitetura Detalhada (2025)

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura Corrigida](#arquitetura-corrigida)
3. [Estrutura de Arquivos](#estrutura-de-arquivos)
4. [Sofia Agent V2](#sofia-agent-v2)
5. [Sistema de Funções](#sistema-de-funções)
6. [Gerenciamento de Contexto](#gerenciamento-de-contexto)
7. [Correções Implementadas](#correções-implementadas)
8. [Interface de Teste](#interface-de-teste)
9. [Performance e Economia](#performance-e-economia)
10. [Manutenção e Extensão](#manutenção-e-extensão)

---

## 🎯 Visão Geral

Sofia é a assistente virtual especializada em locação de imóveis por temporada do sistema Locai. Ela foi projetada para fornecer uma experiência conversacional natural, mantendo memória completa da conversa e executando funções específicas do sistema.

### 🎯 **Objetivos Principais**
1. **100% Respostas GPT**: Todas as respostas são geradas pelo ChatGPT para máxima naturalidade
2. **Memória Completa**: Sofia lembra de tudo que foi dito na conversa do dia atual
3. **Function Calling**: Executa funções essenciais (busca, preços, reservas)
4. **Respostas Concisas**: Máximo 3 linhas, prática e simpática
5. **Não Assumir Dados**: Nunca pressupõe informações que o cliente não forneceu

---

## 🏗️ Arquitetura Corrigida

### Fluxo Principal
```
WhatsApp → API Route → Sofia Agent V2 → GPT-3.5 → Function Calls → Response
```

### Componentes Principais
- **Sofia Agent V2**: Lógica principal de conversação
- **Conversation Context Service**: Gerenciamento de memória
- **Agent Functions**: 4 funções essenciais do sistema
- **Property Service**: Operações com propriedades

---

## 📁 Estrutura de Arquivos

```
lib/ai-agent/
├── sofia-agent-v2.ts           # Agente principal (VERSÃO CORRIGIDA)
└── professional-agent.ts       # Versão anterior (DEPRECATED)

lib/ai/
├── agent-functions.ts          # 4 funções essenciais
└── agent-functions-exports.ts  # REMOVIDO - código morto

lib/services/
└── conversation-context-service.ts  # Gerenciamento de contexto

app/api/agent/
├── route.ts                    # Endpoint principal (usa Sofia V2)
└── clear-context/route.ts      # Limpar contexto para testes
```

---

## 🤖 Sofia Agent V2 - Implementação Detalhada

### Classe Principal
```typescript
export class SofiaAgentV2 {
  private openai: OpenAI;
  private static instance: SofiaAgentV2;  // Singleton pattern
  
  static getInstance(): SofiaAgentV2 {
    if (!this.instance) {
      this.instance = new SofiaAgentV2();
    }
    return this.instance;
  }
}
```

### Processo de Conversação

#### 1. **Recepção da Mensagem**
```typescript
async processMessage(input: SofiaInput): Promise<SofiaResponse>
```

#### 2. **Obtenção do Contexto**
- Busca contexto existente no Firebase
- Obtém histórico **apenas do dia atual**
- Limita a 10 mensagens recentes para não confundir o GPT

#### 3. **Construção das Mensagens**
```typescript
const messages: MessageHistory[] = [
  { role: 'system', content: SOFIA_SYSTEM_PROMPT },
  { role: 'system', content: `Informações coletadas: ${context}` },
  ...historyMessages,
  { role: 'user', content: input.message }
];
```

#### 4. **Primeira Chamada GPT**
- Determina se precisa usar funções
- Usa `tool_choice: 'auto'`
- Temperatura 0.7 para naturalidade
- Max 150 tokens para concisão

#### 5. **Execução de Funções (se necessário)**
- Executa funções solicitadas pelo GPT
- Trata erros de execução
- Atualiza contexto baseado nos resultados

#### 6. **Segunda Chamada GPT (se houve funções)**
- Gera resposta baseada nos resultados das funções
- Formato correto de `tool_calls` e `tool_messages`
- Evita o erro "tool_call_id not found"

#### 7. **Persistência**
- Salva mensagens no histórico
- Atualiza contexto no Firebase
- Incrementa contador de tokens

---

## 🛠 Sistema de Funções

### 4 Funções Essenciais

#### 1. **search_properties**
```typescript
{
  location: string,    // Cidade/região OBRIGATÓRIA
  guests?: number,     // Número de hóspedes
  checkIn?: string,    // Data check-in (YYYY-MM-DD)
  checkOut?: string    // Data check-out (YYYY-MM-DD)
}
```

#### 2. **calculate_price**
```typescript
{
  propertyId: string,  // ID da propriedade
  nights?: number      // Número de noites
}
```

#### 3. **create_reservation**
```typescript
{
  propertyId: string,
  clientName: string,
  clientPhone: string,
  checkIn: string,
  checkOut: string,
  guests: number
}
```

#### 4. **register_client**
```typescript
{
  name: string,
  phone: string,
  email?: string
}
```

### Implementação
- **Error Handling**: Try-catch em todas as funções
- **Service Integration**: Usa `propertyService.getActiveProperties(tenantId)`
- **Parameter Validation**: Valida campos obrigatórios
- **Fallback**: Respostas padrão em caso de erro

---

## 🧮 Gerenciamento de Contexto

### Interface de Contexto
```typescript
interface ConversationContextData {
  intent: string;
  stage: 'greeting' | 'discovery' | 'presentation' | 'negotiation' | 'closing';
  clientData: {
    name?: string;
    city?: string;          // ⚠️ Só preenche quando cliente mencionar
    budget?: number;
    guests?: number;
    checkIn?: string;
    checkOut?: string;
  };
  interestedProperties: string[];  // IDs das propriedades
  lastAction?: string;
}
```

### Atualização por Função
- **search_properties**: Salva cidade, hóspedes, datas → stage: 'discovery'
- **calculate_price**: Atualiza stage para 'presentation'
- **create_reservation**: Atualiza stage para 'closing'
- **register_client**: Salva nome do cliente

### Persistência
- **Firebase Firestore**: Armazena contexto e histórico
- **TTL**: Contexto expira após 24 horas
- **Cleanup**: Remove contextos expirados automaticamente
- **Error Resilience**: Trata valores undefined

---

## ⚠️ Correções Implementadas

### **Problema 1**: Sofia assumia Florianópolis
**Causa**: Contexto persistia entre diferentes conversas  
**Solução**: Filtro por data atual no histórico
```typescript
private async getCurrentDayHistory() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Filtra apenas mensagens de hoje
}
```

### **Problema 2**: Erro propertyService.getPropertiesByTenant  
**Causa**: Método não existia  
**Solução**: Usar `propertyService.getActiveProperties(tenantId)`

### **Problema 3**: Erro OpenAI tool_calls  
**Causa**: tool_call_id não tinha resposta correspondente  
**Solução**: Formato correto de tool messages
```typescript
toolMessages.push({
  role: 'tool',
  tool_call_id: toolCall.id,
  content: JSON.stringify(result)
});
```

### **Problema 4**: Campos undefined no Firebase  
**Causa**: Tentativa de salvar valores undefined  
**Solução**: Filtrar campos undefined
```typescript
const cleanedUpdates: any = {};
Object.entries(updates).forEach(([key, value]) => {
  if (value !== undefined) {
    cleanedUpdates[key] = value;
  }
});
```

---

## 🧪 Interface de Teste

### Localização
`/dashboard/teste`

### Funcionalidades
- Simulação de conversa WhatsApp
- Visualização de tokens gastos
- Botão para limpar contexto
- Histórico completo da conversa
- Indicadores de ações executadas

### Fluxo de Teste Recomendado
1. **"ola quero um ap"** → Sofia deve perguntar a cidade
2. **"florianopolis"** → Sofia deve buscar propriedades  
3. **"quero um apartamento barato"** → Sofia deve mostrar opções
4. **Usar botão "Refresh"** para limpar contexto entre testes

---

## 🚀 Performance e Economia

### Otimizações
- **GPT-3.5 Turbo**: 10x mais barato que GPT-4
- **Limite de Tokens**: 150 por resposta mantém concisão
- **Contexto Limitado**: Apenas 10 mensagens recentes
- **Cache de Contexto**: Firebase para persistência
- **Singleton Pattern**: Uma instância para todo sistema

### Métricas
- **Tokens Utilizados**: Rastreamento por conversa
- **Funções Executadas**: Contador de actions
- **Tempo de Resposta**: Medição automática
- **Taxa de Erro**: Logging detalhado
- **Context Hits**: Reutilização de contexto

---

## 🔧 Manutenção e Extensão

### Para Modificar Comportamento da Sofia
1. Editar `SOFIA_SYSTEM_PROMPT` em `sofia-agent-v2.ts`
2. Ajustar parâmetros do GPT (temperature, max_tokens)
3. Modificar lógica de `updateContextFromFunction`

### Para Adicionar Nova Função
1. Adicionar à `ESSENTIAL_AI_FUNCTIONS` em `agent-functions.ts`
2. Implementar método na classe `SimplifiedAgentFunctions`
3. Adicionar lógica de contexto em `updateContextFromFunction`

### Para Alterar Contexto
1. Modificar interface `ConversationContextData`
2. Atualizar migração de dados se necessário
3. Ajustar lógica de atualização

---

## 📊 Fluxo de Conversa Ideal

1. **Greeting**: Sofia cumprimenta e pergunta cidade
2. **Discovery**: Cliente informa cidade → Sofia busca propriedades
3. **Presentation**: Mostra opções → Cliente pergunta preços
4. **Negotiation**: Discussão de detalhes
5. **Closing**: Criação da reserva

---

## 🎯 System Prompt Atual

```
Você é Sofia, uma assistente virtual especializada em aluguel de imóveis por temporada.

PERSONALIDADE:
- Simpática, prática e direta
- Responde em português brasileiro casual
- Usa emojis moderadamente
- Foca em ajudar o cliente a encontrar o imóvel ideal

REGRAS IMPORTANTES:
1. SEMPRE responda de forma concisa (máximo 3 linhas)
2. NUNCA assuma informações que o cliente não forneceu
3. SEMPRE pergunte a cidade se não foi mencionada
4. Use as funções disponíveis para buscar propriedades e criar reservas
5. Lembre-se de TUDO que o cliente disse na conversa atual
6. Seja proativa em sugerir próximos passos

FLUXO IDEAL:
1. Cumprimentar e perguntar dados básicos (cidade, datas, pessoas)
2. Buscar e apresentar opções (use search_properties APENAS após ter cidade)
3. Mostrar detalhes e valores (use calculate_price)
4. Criar a reserva (use create_reservation)
```

---

## 📦 Arquivos Removidos

- `lib/ai-agent/sofia-agent.ts` → Versão com problemas
- `lib/ai/agent-functions-exports.ts` → Código não utilizado
- Referências no `app/api/agent/route.ts` atualizadas

---

## ✅ Status Atual

✅ **Todas as respostas via GPT**  
✅ **Memória completa da conversa**  
✅ **Function calling funcionando**  
✅ **Não assume informações**  
✅ **Errors corrigidos**  
✅ **Código morto removido**  
✅ **Documentação atualizada**

**Sofia está pronta para uso em produção! 🎉**# Sofia AI Agent - Arquitetura Detalhada (2025)

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura Corrigida](#arquitetura-corrigida)
3. [Estrutura de Arquivos](#estrutura-de-arquivos)
4. [Sofia Agent V2](#sofia-agent-v2)
5. [Sistema de Funções](#sistema-de-funções)
6. [Gerenciamento de Contexto](#gerenciamento-de-contexto)
7. [Correções Implementadas](#correções-implementadas)
8. [Interface de Teste](#interface-de-teste)
9. [Performance e Economia](#performance-e-economia)
10. [Manutenção e Extensão](#manutenção-e-extensão)

---

## 🎯 Visão Geral

Sofia é a assistente virtual especializada em locação de imóveis por temporada do sistema Locai. Ela foi projetada para fornecer uma experiência conversacional natural, mantendo memória completa da conversa e executando funções específicas do sistema.

### 🎯 **Objetivos Principais**
1. **100% Respostas GPT**: Todas as respostas são geradas pelo ChatGPT para máxima naturalidade
2. **Memória Completa**: Sofia lembra de tudo que foi dito na conversa do dia atual
3. **Function Calling**: Executa funções essenciais (busca, preços, reservas)
4. **Respostas Concisas**: Máximo 3 linhas, prática e simpática
5. **Não Assumir Dados**: Nunca pressupõe informações que o cliente não forneceu

---

## 🏗️ Arquitetura Corrigida

### Fluxo Principal
```
WhatsApp → API Route → Sofia Agent V2 → GPT-3.5 → Function Calls → Response
```

### Componentes Principais
- **Sofia Agent V2**: Lógica principal de conversação
- **Conversation Context Service**: Gerenciamento de memória
- **Agent Functions**: 4 funções essenciais do sistema
- **Property Service**: Operações com propriedades

---

## 📁 Estrutura de Arquivos

```
lib/ai-agent/
├── sofia-agent-v2.ts           # Agente principal (VERSÃO CORRIGIDA)
└── professional-agent.ts       # Versão anterior (DEPRECATED)

lib/ai/
├── agent-functions.ts          # 4 funções essenciais
└── agent-functions-exports.ts  # REMOVIDO - código morto

lib/services/
└── conversation-context-service.ts  # Gerenciamento de contexto

app/api/agent/
├── route.ts                    # Endpoint principal (usa Sofia V2)
└── clear-context/route.ts      # Limpar contexto para testes
```

---

## 🤖 Sofia Agent V2 - Implementação Detalhada

### Classe Principal
```typescript
export class SofiaAgentV2 {
  private openai: OpenAI;
  private static instance: SofiaAgentV2;  // Singleton pattern
  
  static getInstance(): SofiaAgentV2 {
    if (!this.instance) {
      this.instance = new SofiaAgentV2();
    }
    return this.instance;
  }
}
```

### Processo de Conversação

#### 1. **Recepção da Mensagem**
```typescript
async processMessage(input: SofiaInput): Promise<SofiaResponse>
```

#### 2. **Obtenção do Contexto**
- Busca contexto existente no Firebase
- Obtém histórico **apenas do dia atual**
- Limita a 10 mensagens recentes para não confundir o GPT

#### 3. **Construção das Mensagens**
```typescript
const messages: MessageHistory[] = [
  { role: 'system', content: SOFIA_SYSTEM_PROMPT },
  { role: 'system', content: `Informações coletadas: ${context}` },
  ...historyMessages,
  { role: 'user', content: input.message }
];
```

#### 4. **Primeira Chamada GPT**
- Determina se precisa usar funções
- Usa `tool_choice: 'auto'`
- Temperatura 0.7 para naturalidade
- Max 150 tokens para concisão

#### 5. **Execução de Funções (se necessário)**
- Executa funções solicitadas pelo GPT
- Trata erros de execução
- Atualiza contexto baseado nos resultados

#### 6. **Segunda Chamada GPT (se houve funções)**
- Gera resposta baseada nos resultados das funções
- Formato correto de `tool_calls` e `tool_messages`
- Evita o erro "tool_call_id not found"

#### 7. **Persistência**
- Salva mensagens no histórico
- Atualiza contexto no Firebase
- Incrementa contador de tokens

---

## 🛠 Sistema de Funções

### 4 Funções Essenciais

#### 1. **search_properties**
```typescript
{
  location: string,    // Cidade/região OBRIGATÓRIA
  guests?: number,     // Número de hóspedes
  checkIn?: string,    // Data check-in (YYYY-MM-DD)
  checkOut?: string    // Data check-out (YYYY-MM-DD)
}
```

#### 2. **calculate_price**
```typescript
{
  propertyId: string,  // ID da propriedade
  nights?: number      // Número de noites
}
```

#### 3. **create_reservation**
```typescript
{
  propertyId: string,
  clientName: string,
  clientPhone: string,
  checkIn: string,
  checkOut: string,
  guests: number
}
```

#### 4. **register_client**
```typescript
{
  name: string,
  phone: string,
  email?: string
}
```

### Implementação
- **Error Handling**: Try-catch em todas as funções
- **Service Integration**: Usa `propertyService.getActiveProperties(tenantId)`
- **Parameter Validation**: Valida campos obrigatórios
- **Fallback**: Respostas padrão em caso de erro

---

## 🧮 Gerenciamento de Contexto

### Interface de Contexto
```typescript
interface ConversationContextData {
  intent: string;
  stage: 'greeting' | 'discovery' | 'presentation' | 'negotiation' | 'closing';
  clientData: {
    name?: string;
    city?: string;          // ⚠️ Só preenche quando cliente mencionar
    budget?: number;
    guests?: number;
    checkIn?: string;
    checkOut?: string;
  };
  interestedProperties: string[];  // IDs das propriedades
  lastAction?: string;
}
```

### Atualização por Função
- **search_properties**: Salva cidade, hóspedes, datas → stage: 'discovery'
- **calculate_price**: Atualiza stage para 'presentation'
- **create_reservation**: Atualiza stage para 'closing'
- **register_client**: Salva nome do cliente

### Persistência
- **Firebase Firestore**: Armazena contexto e histórico
- **TTL**: Contexto expira após 24 horas
- **Cleanup**: Remove contextos expirados automaticamente
- **Error Resilience**: Trata valores undefined

---

## ⚠️ Correções Implementadas

### **Problema 1**: Sofia assumia Florianópolis
**Causa**: Contexto persistia entre diferentes conversas  
**Solução**: Filtro por data atual no histórico
```typescript
private async getCurrentDayHistory() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  // Filtra apenas mensagens de hoje
}
```

### **Problema 2**: Erro propertyService.getPropertiesByTenant  
**Causa**: Método não existia  
**Solução**: Usar `propertyService.getActiveProperties(tenantId)`

### **Problema 3**: Erro OpenAI tool_calls  
**Causa**: tool_call_id não tinha resposta correspondente  
**Solução**: Formato correto de tool messages
```typescript
toolMessages.push({
  role: 'tool',
  tool_call_id: toolCall.id,
  content: JSON.stringify(result)
});
```

### **Problema 4**: Campos undefined no Firebase  
**Causa**: Tentativa de salvar valores undefined  
**Solução**: Filtrar campos undefined
```typescript
const cleanedUpdates: any = {};
Object.entries(updates).forEach(([key, value]) => {
  if (value !== undefined) {
    cleanedUpdates[key] = value;
  }
});
```

---

## 🧪 Interface de Teste

### Localização
`/dashboard/teste`

### Funcionalidades
- Simulação de conversa WhatsApp
- Visualização de tokens gastos
- Botão para limpar contexto
- Histórico completo da conversa
- Indicadores de ações executadas

### Fluxo de Teste Recomendado
1. **"ola quero um ap"** → Sofia deve perguntar a cidade
2. **"florianopolis"** → Sofia deve buscar propriedades  
3. **"quero um apartamento barato"** → Sofia deve mostrar opções
4. **Usar botão "Refresh"** para limpar contexto entre testes

---

## 🚀 Performance e Economia

### Otimizações
- **GPT-3.5 Turbo**: 10x mais barato que GPT-4
- **Limite de Tokens**: 150 por resposta mantém concisão
- **Contexto Limitado**: Apenas 10 mensagens recentes
- **Cache de Contexto**: Firebase para persistência
- **Singleton Pattern**: Uma instância para todo sistema

### Métricas
- **Tokens Utilizados**: Rastreamento por conversa
- **Funções Executadas**: Contador de actions
- **Tempo de Resposta**: Medição automática
- **Taxa de Erro**: Logging detalhado
- **Context Hits**: Reutilização de contexto

---

## 🔧 Manutenção e Extensão

### Para Modificar Comportamento da Sofia
1. Editar `SOFIA_SYSTEM_PROMPT` em `sofia-agent-v2.ts`
2. Ajustar parâmetros do GPT (temperature, max_tokens)
3. Modificar lógica de `updateContextFromFunction`

### Para Adicionar Nova Função
1. Adicionar à `ESSENTIAL_AI_FUNCTIONS` em `agent-functions.ts`
2. Implementar método na classe `SimplifiedAgentFunctions`
3. Adicionar lógica de contexto em `updateContextFromFunction`

### Para Alterar Contexto
1. Modificar interface `ConversationContextData`
2. Atualizar migração de dados se necessário
3. Ajustar lógica de atualização

---

## 📊 Fluxo de Conversa Ideal

1. **Greeting**: Sofia cumprimenta e pergunta cidade
2. **Discovery**: Cliente informa cidade → Sofia busca propriedades
3. **Presentation**: Mostra opções → Cliente pergunta preços
4. **Negotiation**: Discussão de detalhes
5. **Closing**: Criação da reserva

---

## 🎯 System Prompt Atual

```
Você é Sofia, uma assistente virtual especializada em aluguel de imóveis por temporada.

PERSONALIDADE:
- Simpática, prática e direta
- Responde em português brasileiro casual
- Usa emojis moderadamente
- Foca em ajudar o cliente a encontrar o imóvel ideal

REGRAS IMPORTANTES:
1. SEMPRE responda de forma concisa (máximo 3 linhas)
2. NUNCA assuma informações que o cliente não forneceu
3. SEMPRE pergunte a cidade se não foi mencionada
4. Use as funções disponíveis para buscar propriedades e criar reservas
5. Lembre-se de TUDO que o cliente disse na conversa atual
6. Seja proativa em sugerir próximos passos

FLUXO IDEAL:
1. Cumprimentar e perguntar dados básicos (cidade, datas, pessoas)
2. Buscar e apresentar opções (use search_properties APENAS após ter cidade)
3. Mostrar detalhes e valores (use calculate_price)
4. Criar a reserva (use create_reservation)
```

---

## 📦 Arquivos Removidos

- `lib/ai-agent/sofia-agent.ts` → Versão com problemas
- `lib/ai/agent-functions-exports.ts` → Código não utilizado
- Referências no `app/api/agent/route.ts` atualizadas

---

## ✅ Status Atual

✅ **Todas as respostas via GPT**  
✅ **Memória completa da conversa**  
✅ **Function calling funcionando**  
✅ **Não assume informações**  
✅ **Errors corrigidos**  
✅ **Código morto removido**  
✅ **Documentação atualizada**

**Sofia está pronta para uso em produção! 🎉**