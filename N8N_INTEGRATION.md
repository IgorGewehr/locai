# Integração N8N - Nova Arquitetura

## 📋 Visão Geral

O sistema agora utiliza o N8N como agente de processamento de mensagens, substituindo completamente a Sofia. O frontend serve apenas para:

1. **Interface de QR Code** - Para conectar o WhatsApp
2. **APIs CRUD** - Para operações de dados chamadas pelo N8N
3. **Dashboard** - Para gerenciamento de propriedades, reservas, clientes, etc.

## 🔄 Fluxo de Mensagens

```
WhatsApp → Microservice (Baileys) → Webhook Frontend → N8N → Processamento → Resposta
```

### Detalhamento:

1. **Mensagem recebida no WhatsApp**
   - Capturada pelo microserviço rodando Baileys

2. **Microserviço envia para Frontend**
   - POST `/api/webhook/whatsapp-microservice`
   - Autenticação via API Key ou HMAC

3. **Frontend encaminha para N8N**
   - POST para webhook configurado em `N8N_WEBHOOK_URL`
   - Apenas repassa a mensagem, não processa

4. **N8N processa a mensagem**
   - Usa seu próprio agente/lógica
   - Chama APIs do frontend quando necessário

5. **N8N envia resposta**
   - POST `/api/whatsapp/send-n8n`
   - Frontend encaminha para o microserviço

## 🚀 APIs Disponíveis para o N8N

### Funções CRUD (`/api/ai/functions/*`)

Todas as funções abaixo requerem `tenantId` no body da requisição:

- **search-properties** - Buscar propriedades
- **get-property-details** - Detalhes de uma propriedade
- **calculate-price** - Calcular preço para período
- **check-availability** - Verificar disponibilidade
- **create-reservation** - Criar reserva
- **cancel-reservation** - Cancelar reserva
- **modify-reservation** - Modificar reserva
- **register-client** - Registrar cliente
- **create-lead** - Criar lead no CRM
- **update-lead** - Atualizar lead
- **classify-lead** - Classificar lead
- **schedule-visit** - Agendar visita
- **create-transaction** - Criar transação financeira
- **generate-quote** - Gerar orçamento
- **get-policies** - Obter políticas

### WhatsApp (`/api/whatsapp/*`)

- **GET /qr** - Obter QR Code para conexão
- **GET /session** - Status da sessão
- **POST /session** - Iniciar sessão
- **DELETE /session** - Desconectar sessão
- **POST /send** - Enviar mensagem (uso interno)
- **POST /send-n8n** - Enviar mensagem (chamado pelo N8N)

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Copie `.env.n8n.example` para `.env.local` e configure:

```bash
# N8N
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/xyz
N8N_WEBHOOK_SECRET=seu-secret
N8N_API_KEY=sua-api-key

# Microserviço WhatsApp
WHATSAPP_MICROSERVICE_URL=http://localhost:3001
WHATSAPP_MICROSERVICE_API_KEY=sua-api-key
```

### 2. Configurar N8N

No seu workflow do N8N:

1. **Webhook Trigger** - Para receber mensagens
   - Configure o secret para validação

2. **HTTP Request Nodes** - Para chamar APIs do frontend
   - Base URL: `https://seu-frontend.com/api/ai/functions`
   - Headers: `Authorization: Bearer {N8N_API_KEY}`
   - Body: Sempre incluir `tenantId`

3. **Webhook Response** - Para enviar resposta
   - POST para `/api/whatsapp/send-n8n`

## 🔒 Segurança

1. **Autenticação por API Key**
   - Todas as chamadas do N8N devem incluir API Key
   - Configurada em `N8N_API_KEY`

2. **Validação HMAC**
   - Opcionalmente, use HMAC para validar webhooks
   - Secret configurado em `N8N_WEBHOOK_SECRET`

3. **Tenant Isolation**
   - Sempre incluir `tenantId` nas requisições
   - Dados isolados por tenant

## 📝 Exemplo de Chamada do N8N

### Buscar Propriedades

```javascript
// POST /api/ai/functions/search-properties
{
  "tenantId": "tenant-123",
  "location": "Praia Grande",
  "bedrooms": 2,
  "maxPrice": 5000
}
```

### Enviar Resposta

```javascript
// POST /api/whatsapp/send-n8n
{
  "tenantId": "tenant-123",
  "clientPhone": "5511999999999",
  "finalMessage": "Olá! Encontrei 3 propriedades...",
  "mediaUrl": "https://exemplo.com/imagem.jpg" // opcional
}
```

## 🧹 O que foi removido

- Toda a lógica da Sofia (`/lib/ai-agent/*`)
- Rotas de processamento de agente (`/api/agent/*`)
- Páginas de teste da Sofia
- Métricas e analytics da Sofia
- Enhanced Intent Detection
- Processamento direto de mensagens no frontend

## ✅ O que foi mantido

- Autenticação e autorização
- Todas as rotas CRUD
- Dashboard completo
- Sistema de QR Code
- Conexão com WhatsApp via Baileys
- Multi-tenancy
- Firebase/Firestore

## 🔧 Troubleshooting

### WhatsApp não conecta
1. Verifique se o microserviço está rodando
2. Confirme as credenciais em `.env.local`
3. Verifique logs do microserviço

### N8N não recebe mensagens
1. Confirme `N8N_WEBHOOK_URL` está correto
2. Verifique se o N8N está acessível
3. Valide o secret de autenticação

### APIs retornam 401
1. Verifique `N8N_API_KEY`
2. Confirme header `Authorization: Bearer {key}`
3. Verifique se o tenant existe

## 📚 Próximos Passos

1. Configure o workflow no N8N
2. Teste a conexão WhatsApp
3. Implemente a lógica de processamento no N8N
4. Configure as chamadas para as APIs CRUD
5. Teste o fluxo completo