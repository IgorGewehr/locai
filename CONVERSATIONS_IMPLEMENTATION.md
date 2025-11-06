# 💬 Sistema de Conversas - Implementação Completa

## 📋 Visão Geral

Sistema otimizado de armazenamento e visualização de conversas entre clientes e o agente Sofia, preparado para fine-tuning futuro.

---

## 🏗️ Arquitetura Implementada

### **Modelo de Duas Coleções**

```
tenants/{tenantId}/
  ├── conversations/          # Headers leves (listagem rápida)
  │   └── {conversationId}
  │       ├── clientId
  │       ├── clientPhone
  │       ├── clientName
  │       ├── startedAt
  │       ├── lastMessageAt
  │       ├── messageCount
  │       ├── status
  │       ├── tags[]
  │       └── timestamps
  │
  └── messages/               # Mensagens detalhadas
      └── {messageId}
          ├── conversationId  # INDEXED
          ├── clientMessage
          ├── sofiaMessage
          ├── timestamp
          ├── context         # Para fine-tuning
          └── metadata
```

**Vantagens:**
- ✅ Performance: Lista conversas sem carregar mensagens
- ✅ Escalabilidade: Evita documents > 1MB (limite Firestore)
- ✅ Fine-tuning: Mensagens isoladas facilitam export
- ✅ Queries rápidas: Indexes otimizados

---

## 📦 Arquivos Criados

### 1. **Types** (`lib/types/conversation-optimized.ts`)

```typescript
// ConversationHeader - Lightweight para listagem
interface ConversationHeader {
  id: string;
  tenantId: string;
  clientId?: string;
  clientPhone: string;
  clientName?: string;
  startedAt: Date;
  lastMessageAt: Date;
  messageCount: number;
  status: 'active' | 'completed' | 'abandoned';
  tags: string[];
}

// ConversationMessage - Detalhado com contexto
interface ConversationMessage {
  id: string;
  conversationId: string; // FK - INDEXED
  tenantId: string;
  clientMessage: string;
  sofiaMessage: string;
  timestamp: Date;
  context?: MessageContext; // Para fine-tuning
}

// MessageContext - Dados para IA
interface MessageContext {
  intent?: string;
  entities?: Record<string, any>;
  functionsCalled?: string[];
  confidence?: number;
  metadata?: Record<string, any>;
}
```

### 2. **Validation** (`lib/validation/conversation-schemas.ts`)

```typescript
// Zod schemas para validação
export const PostConversationSchema = z.object({
  tenantId: z.string().min(1),
  clientMessage: z.string().min(1).max(10000),
  sofiaMessage: z.string().min(1).max(10000),
  clientPhone: z.string().optional(),
  clientName: z.string().max(200).optional(),
  context: MessageContextSchema,
  conversationId: z.string().optional(),
});
```

### 3. **API Route** (`app/api/ai/functions/post-conversation/route.ts`)

**Endpoint:** `POST /api/ai/functions/post-conversation`

**Request Body:**
```json
{
  "tenantId": "tenant123",
  "clientMessage": "Olá, gostaria de alugar um imóvel",
  "sofiaMessage": "Olá! Ficarei feliz em ajudar...",
  "clientPhone": "+5511999999999",
  "clientName": "João Silva",
  "context": {
    "intent": "booking",
    "entities": { "guests": 4 },
    "functionsCalled": ["search-properties"]
  },
  "conversationId": "conv123" // Opcional
}
```

**Response:**
```json
{
  "success": true,
  "conversationId": "conv123",
  "messageId": "msg456",
  "isNewConversation": false,
  "meta": {
    "requestId": "post_conv_xxx",
    "processingTime": 150,
    "timestamp": "2025-11-05T..."
  }
}
```

**Lógica:**
1. Valida dados com Zod
2. Sanitiza mensagens
3. Identifica ou cria Conversation:
   - Se `conversationId` fornecido → usa ele
   - Senão, busca conversa ativa por `clientPhone`
   - Senão, cria nova conversa
4. Salva mensagem em `messages`
5. Atualiza `lastMessageAt` e `messageCount` em conversation
6. Retorna IDs

### 4. **Service** (`lib/services/conversation-optimized-service.ts`)

```typescript
class ConversationOptimizedService {
  // Lista conversas de um cliente
  getClientConversations(clientId: string, limit = 20): Promise<ConversationHeader[]>

  // Lista conversas por telefone
  getConversationsByPhone(phone: string, limit = 20): Promise<ConversationHeader[]>

  // Carrega mensagens de uma conversa
  getConversationMessages(conversationId: string, limit = 50): Promise<ConversationMessage[]>

  // Carrega conversa completa (header + messages)
  getConversationWithMessages(conversationId: string): Promise<ConversationWithMessages>

  // Lista conversas com resumo (última mensagem, etc)
  getConversationSummaries(clientId?: string, limit = 20): Promise<ConversationSummary[]>

  // Atualiza status da conversa
  updateConversationStatus(conversationId: string, status: ConversationStatus): Promise<void>

  // Vincula conversa a um cliente
  linkConversationToClient(conversationId: string, clientId: string): Promise<void>
}
```

### 5. **UI Components**

#### **ConversationList** (`components/organisms/ConversationList/`)
- Lista de conversas com preview
- Status badges (ativa, concluída, abandonada)
- Timestamp formatado inteligentemente
- Tags de categorização
- Contador de mensagens
- Seleção visual

#### **ConversationThread** (`components/organisms/ConversationThread/`)
- Visualização estilo chat
- Avatares diferentes para cliente/Sofia
- Mensagens do cliente à esquerda
- Mensagens da Sofia à direita (destaque)
- Separadores de data
- Indicador de funções chamadas
- Auto-scroll para última mensagem

### 6. **Integração com Clientes** (`app/dashboard/clients/[id]/page.tsx`)

**Tab "Conversas":**
- Layout split: Lista (esquerda) + Thread (direita)
- Carregamento lazy de mensagens
- Estado de loading separado
- Preview placeholder quando nenhuma conversa selecionada

---

## 🚀 Como Usar

### **1. Agente Sofia Salvando Conversas**

```typescript
// No final de cada interação, Sofia chama:
const response = await fetch('/api/ai/functions/post-conversation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenantId: 'tenant123',
    clientMessage: userMessage,
    sofiaMessage: aiResponse,
    clientPhone: '+5511999999999',
    context: {
      intent: 'booking',
      entities: { guests: 4, dates: {...} },
      functionsCalled: ['search-properties', 'calculate-price'],
      confidence: 0.95
    }
  })
});

const { conversationId, messageId } = await response.json();
// Salvar conversationId para próximas mensagens
```

### **2. Visualizando no Dashboard**

```
/dashboard/clients/[clientId]
  └── Tab "Conversas"
      ├── Lista de conversas do cliente
      └── Thread de mensagens ao clicar
```

### **3. Carregando Programaticamente**

```typescript
import { createConversationOptimizedService } from '@/lib/services/conversation-optimized-service';

const service = createConversationOptimizedService(tenantId);

// Listar conversas
const conversations = await service.getClientConversations(clientId, 20);

// Carregar mensagens
const messages = await service.getConversationMessages(conversationId, 50);

// Resumos para exibição
const summaries = await service.getConversationSummaries(clientId);
```

---

## 🔍 Indexes Firestore Necessários

### **Criar via Firebase Console:**

```javascript
// Collection: messages
// Composite Index 1:
conversationId (ASC) + timestamp (DESC)

// Composite Index 2:
conversationId (ASC) + timestamp (ASC)

// Collection: conversations
// Composite Index 1:
clientId (ASC) + lastMessageAt (DESC)

// Composite Index 2:
status (ASC) + lastMessageAt (DESC)

// Composite Index 3:
tenantId (ASC) + lastMessageAt (DESC)

// Composite Index 4:
clientPhone (ASC) + status (ASC) + lastMessageAt (DESC)
```

---

## 📊 Preparação para Fine-Tuning

### **Export de Conversas**

```typescript
// Futuro: Endpoint para export
GET /api/ai/fine-tuning/export?startDate=2025-01-01&endDate=2025-12-31

// Formato OpenAI fine-tuning:
{
  "messages": [
    {
      "role": "user",
      "content": "Olá, gostaria de alugar um imóvel para 4 pessoas"
    },
    {
      "role": "assistant",
      "content": "Olá! Ficarei feliz em ajudar...",
      "function_call": {
        "name": "search-properties",
        "arguments": "{\"guests\": 4}"
      }
    }
  ]
}
```

### **Query para Export em Lote**

```typescript
const exportMessages = async (startDate: Date, endDate: Date) => {
  const messagesService = services.createService<ConversationMessage>('messages');

  const messages = await messagesService.getMany(
    [
      { field: 'timestamp', operator: '>=', value: startDate },
      { field: 'timestamp', operator: '<=', value: endDate }
    ],
    {
      orderBy: [{ field: 'timestamp', direction: 'asc' }],
      limit: 10000 // Ajustar conforme necessário
    }
  );

  return messages.map(msg => ({
    role: 'user',
    content: msg.clientMessage,
    next: {
      role: 'assistant',
      content: msg.sofiaMessage,
      context: msg.context
    }
  }));
};
```

---

## 🔒 Segurança Implementada

✅ **Validação de entrada** com Zod schemas
✅ **Sanitização** de clientMessage e sofiaMessage
✅ **Tenant isolation** via TenantServiceFactory
✅ **PII masking** em logs (phone, tenantId)
✅ **Error handling** profissional com requestId
✅ **Limite de tamanho** (10.000 chars por mensagem)

---

## 📈 Performance

**Otimizações implementadas:**
- ✅ Denormalização: `messageCount`, `clientName`, `lastMessageAt` em conversation
- ✅ Paginação: Cursor-based com `startAfter`
- ✅ Lazy loading: Mensagens só carregam ao clicar
- ✅ Indexes otimizados para queries frequentes
- ✅ Queries limitadas (max 20 conversas, 50 mensagens por vez)

**Tempos esperados:**
- Lista conversas: < 200ms
- Carregar mensagens: < 300ms
- Salvar mensagem: < 150ms

---

## 🎯 Próximos Passos Sugeridos

1. **Filtros avançados**
   - Por data
   - Por status
   - Por tags
   - Busca por texto

2. **Exportação**
   - Endpoint `/api/conversations/export`
   - Formato CSV e JSON
   - Range de datas

3. **Analytics (futuro)**
   - Taxa de conversão por conversa
   - Tempo médio de resposta
   - Funções mais chamadas
   - Tópicos mais discutidos

4. **Melhorias UI**
   - Busca em mensagens
   - Markdown/formatação nas mensagens
   - Anexos (imagens, documentos)
   - Indicador "digitando..."

---

## ✅ Checklist de Implementação

- [x] Types otimizados
- [x] Validation schemas
- [x] API route `/post-conversation`
- [x] Conversation service
- [x] ConversationList component
- [x] ConversationThread component
- [x] Integração com clientes
- [x] Documentação completa
- [ ] Criar indexes no Firestore
- [ ] Testar com dados reais
- [ ] Conectar Sofia ao endpoint

---

## 🧪 Como Testar

### **1. Testar API manualmente**

```bash
curl -X POST http://localhost:3000/api/ai/functions/post-conversation \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-tenant",
    "clientMessage": "Olá, preciso de um imóvel",
    "sofiaMessage": "Olá! Ficarei feliz em ajudar. Quantas pessoas?",
    "clientPhone": "+5511999999999",
    "clientName": "João Teste"
  }'
```

### **2. Testar UI**

1. Acesse `/dashboard/clients/[clientId]`
2. Clique na tab "Conversas"
3. Verifique se a lista aparece
4. Clique em uma conversa
5. Verifique se as mensagens aparecem no thread

### **3. Testar Service**

```typescript
const service = createConversationOptimizedService('tenant-id');
const conversations = await service.getClientConversations('client-id');
console.log(conversations);
```

---

**Implementação concluída!** 🎉

O sistema está pronto para receber conversas do agente Sofia e exibi-las de forma organizada e eficiente no dashboard.
