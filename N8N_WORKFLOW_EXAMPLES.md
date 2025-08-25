# 🔧 N8N Workflow - Exemplos Práticos

## 📋 Fluxo Básico de Mensagem

### 1. **Webhook Trigger (Receber mensagem)**
```json
{
  "httpMethod": "POST",
  "path": "whatsapp-messages",
  "responseMode": "onReceived",
  "responseData": "{ \"success\": true, \"message\": \"Mensagem recebida\" }"
}
```

**Validação do Secret**:
```javascript
// Em um Code node após o Webhook
if (headers['x-webhook-signature'] !== 'SEU_SECRET_CONFIGURADO') {
  throw new Error('Invalid webhook signature');
}

// Extrair dados da mensagem
const tenantId = $input.all()[0].json.tenantId;
const clientPhone = $input.all()[0].json.data.from;
const message = $input.all()[0].json.data.message;

return [{
  json: {
    tenantId,
    clientPhone,
    message,
    originalPayload: $input.all()[0].json
  }
}];
```

## 💬 **Workflow Exemplo: Busca de Propriedades**

### Estrutura Completa:
```
Webhook → Detectar Intenção → Buscar Propriedades → Enviar Resposta
```

### 2. **Code Node - Detectar Intenção**
```javascript
const message = $input.all()[0].json.message.toLowerCase();

let intent = 'unknown';
let params = {};

// Detectar busca de propriedades
if (message.includes('apartamento') || message.includes('casa') || message.includes('propriedade')) {
  intent = 'search_properties';
  
  // Extrair parâmetros básicos
  if (message.includes('praia')) params.location = 'Praia Grande';
  if (message.includes('santos')) params.location = 'Santos';
  
  // Detectar número de quartos
  const bedroomMatch = message.match(/(\d+)\s*(quarto|bedroom)/);
  if (bedroomMatch) params.bedrooms = parseInt(bedroomMatch[1]);
  
  // Detectar orçamento
  const priceMatch = message.match(/até\s*R?\$?\s*(\d+)/);
  if (priceMatch) params.maxPrice = parseInt(priceMatch[1]);
}

return [{
  json: {
    ...($input.all()[0].json),
    intent,
    params
  }
}];
```

### 3. **HTTP Request - Buscar Propriedades**
```json
{
  "method": "POST",
  "url": "https://seu-dominio.com/api/ai/functions/search-properties",
  "headers": {
    "Content-Type": "application/json",
    "x-source": "n8n",
    "User-Agent": "N8N-Workflow/1.0"
  },
  "body": {
    "tenantId": "{{ $json.tenantId }}",
    "location": "{{ $json.params.location }}",
    "bedrooms": "{{ $json.params.bedrooms }}",
    "maxPrice": "{{ $json.params.maxPrice }}"
  }
}
```

### 4. **Code Node - Processar Resultados**
```javascript
const searchResult = $input.all()[0].json;
const originalData = $input.all()[1].json; // Dados do webhook

let response = '';

if (searchResult.success && searchResult.data.properties.length > 0) {
  const properties = searchResult.data.properties;
  const count = properties.length;
  
  response = `🏠 Encontrei ${count} propriedade(s) para você:\n\n`;
  
  properties.slice(0, 3).forEach((prop, index) => {
    response += `${index + 1}. *${prop.name}*\n`;
    response += `📍 ${prop.location}\n`;
    response += `🛏️ ${prop.bedrooms} quartos\n`;
    response += `💰 R$ ${prop.price.toLocaleString()}/mês\n\n`;
  });
  
  if (count > 3) {
    response += `... e mais ${count - 3} opções!\n\n`;
  }
  
  response += '💬 Quer ver fotos de alguma propriedade específica?';
  
} else {
  response = '😔 Não encontrei propriedades com esses critérios. Vamos ajustar sua busca?';
}

return [{
  json: {
    tenantId: originalData.tenantId,
    clientPhone: originalData.clientPhone,
    finalMessage: response,
    searchResults: searchResult.data
  }
}];
```

### 5. **HTTP Request - Enviar Resposta**
```json
{
  "method": "POST",
  "url": "https://seu-dominio.com/api/whatsapp/send-n8n",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer SEU_N8N_API_KEY"
  },
  "body": {
    "tenantId": "{{ $json.tenantId }}",
    "clientPhone": "{{ $json.clientPhone }}",
    "finalMessage": "{{ $json.finalMessage }}"
  }
}
```

## 🎯 **Workflow Exemplo: Criar Reserva**

### If Node - Detectar Intenção de Reserva
```javascript
// Condição
$json.message.toLowerCase().includes('quero reservar') || 
$json.message.toLowerCase().includes('fazer reserva')
```

### HTTP Request - Verificar Disponibilidade
```json
{
  "method": "POST",
  "url": "https://seu-dominio.com/api/ai/functions/check-availability",
  "body": {
    "tenantId": "{{ $json.tenantId }}",
    "propertyId": "{{ $json.propertyId }}",
    "checkIn": "{{ $json.checkIn }}",
    "checkOut": "{{ $json.checkOut }}",
    "guests": "{{ $json.guests }}"
  }
}
```

### Code Node - Processar Disponibilidade
```javascript
const availability = $input.all()[0].json;

if (availability.success && availability.data.available) {
  // Calcular preço
  return [{
    json: {
      ...($input.all()[1].json),
      available: true,
      nextStep: 'calculate_price'
    }
  }];
} else {
  return [{
    json: {
      ...($input.all()[1].json),
      available: false,
      response: '😔 Desculpe, essas datas não estão disponíveis. Que tal tentar outras datas?'
    }
  }];
}
```

## 🔄 **Workflow com Múltiplas Funções**

### Switch Node - Roteamento por Intenção
```javascript
// Expressão no Switch
$json.intent

// Casos:
// - search_properties
// - create_reservation  
// - calculate_price
// - get_property_details
// - register_client
```

### Exemplo de Chamada Sequencial
```javascript
// 1. Registrar cliente primeiro
// 2. Depois criar lead
// 3. Por fim, processar reserva

// Code node para sequenciar
const clientResult = $input.all()[0].json; // Resultado do register-client

if (clientResult.success) {
  return [{
    json: {
      clientId: clientResult.data.clientId,
      clientPhone: clientResult.data.phone,
      tenantId: $json.tenantId,
      nextAction: 'create_lead'
    }
  }];
}
```

## 📸 **Envio de Mídia**

### HTTP Request - Enviar Fotos da Propriedade
```json
{
  "method": "POST",
  "url": "https://seu-dominio.com/api/ai/functions/send-property-media",
  "body": {
    "tenantId": "{{ $json.tenantId }}",
    "propertyId": "{{ $json.propertyId }}",
    "clientPhone": "{{ $json.clientPhone }}",
    "mediaType": "photos",
    "maxItems": 5,
    "includeDescription": true
  }
}
```

### Code Node - Processar Resposta de Mídia
```javascript
const mediaResult = $input.all()[0].json;

if (mediaResult.success) {
  const response = '📸 Enviei as fotos da propriedade! O que achou? Gostaria de agendar uma visita?';
  
  return [{
    json: {
      tenantId: $json.tenantId,
      clientPhone: $json.clientPhone,
      finalMessage: response,
      sentMedia: true
    }
  }];
}
```

## 🎯 **Template para Funções Genéricas**

### HTTP Request Padrão
```json
{
  "method": "POST",
  "url": "https://seu-dominio.com/api/ai/functions/{{ $json.functionName }}",
  "headers": {
    "Content-Type": "application/json",
    "x-source": "n8n",
    "User-Agent": "N8N-Workflow/1.0"
  },
  "body": {
    "tenantId": "{{ $json.tenantId }}",
    "...params": "{{ $json.params }}"
  }
}
```

### Code Node - Tratamento Universal de Resposta
```javascript
const result = $input.all()[0].json;
const originalData = $input.all()[1].json;

if (!result.success) {
  console.error('Função falhou:', result.error);
  
  return [{
    json: {
      ...originalData,
      error: true,
      errorMessage: result.error,
      response: 'Ops! Algo deu errado. Pode tentar novamente?'
    }
  }];
}

// Sucesso - processar dados específicos
return [{
  json: {
    ...originalData,
    functionResult: result.data,
    requestId: result.meta.requestId,
    processingTime: result.meta.processingTime
  }
}];
```

## 📊 **Monitoramento no N8N**

### Code Node - Log de Execução
```javascript
// No início do workflow
console.log('🚀 Iniciando processamento:', {
  tenantId: $json.tenantId,
  clientPhone: $json.clientPhone?.substring(0, 6) + '***',
  message: $json.message?.substring(0, 50) + '...',
  timestamp: new Date().toISOString()
});

// Ao chamar função
console.log('📡 Chamando função:', {
  function: $json.functionName,
  params: Object.keys($json.params),
  requestId: $json.requestId
});

// Ao finalizar
console.log('✅ Workflow concluído:', {
  success: $json.success,
  responseLength: $json.finalMessage?.length,
  processingTime: $json.totalTime + 'ms'
});
```

## ⚠️ **Tratamento de Erros**

### Error Node Configuration
```javascript
// Code node para capturar erros
const error = $input.all()[0].json;

console.error('❌ Erro no workflow:', {
  errorMessage: error.message,
  errorStack: error.stack,
  tenantId: $json.tenantId,
  step: $json.currentStep
});

// Enviar mensagem de erro amigável
return [{
  json: {
    tenantId: $json.tenantId,
    clientPhone: $json.clientPhone,
    finalMessage: '🤖 Desculpe, estou com dificuldades técnicas. Em alguns instantes estarei funcionando perfeitamente!',
    isError: true
  }
}];
```

## 🔧 **Configurações Recomendadas**

### Node Settings Globais
```json
{
  "executionTimeout": 60,
  "maxExecutionTime": 300,
  "saveExecutionProgress": true,
  "timezone": "America/Sao_Paulo"
}
```

### HTTP Request Settings
```json
{
  "timeout": 30000,
  "followRedirects": true,
  "ignoreSSLIssues": false,
  "proxy": ""
}
```

### Webhook Settings
```json
{
  "responseMode": "onReceived",
  "responseData": "{\"success\": true}",
  "options": {
    "rawBody": false,
    "allowedOrigins": "*"
  }
}
```

## 📋 **Checklist de Deploy**

### Antes de Ativar o Workflow:
- [ ] Configurar webhook URL correto no frontend
- [ ] Definir N8N_API_KEY no frontend  
- [ ] Testar cada função individualmente
- [ ] Configurar tratamento de erro em todos os nodes
- [ ] Adicionar logs de monitoramento
- [ ] Testar com diferentes tipos de mensagem
- [ ] Verificar timeout e retry policies
- [ ] Configurar alertas para falhas

### Variáveis de Ambiente no N8N:
```bash
# Adicionar nas configurações do N8N
FRONTEND_BASE_URL=https://seu-dominio.com
N8N_API_KEY=sua-chave-secreta
WEBHOOK_SECRET=seu-secret-webhook
TENANT_ID=seu-tenant-padrao
```

## 🚀 **Exemplo de Workflow Completo**

1. **Webhook** (recebe mensagem)
2. **Code** (extrai dados e detecta intenção)
3. **Switch** (roteia por tipo de intenção)
4. **HTTP Request** (chama função apropriada)  
5. **Code** (processa resultado)
6. **HTTP Request** (envia resposta)
7. **Set** (salva métricas/logs)

**Tempo estimado de execução**: 2-5 segundos
**Throughput**: 100+ mensagens/minuto