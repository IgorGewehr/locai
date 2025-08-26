# 🚀 Configuração N8N → Microservice Direto

Este documento detalha como configurar o N8N para se comunicar diretamente com o WhatsApp Microservice, eliminando o LocAI como intermediário.

## 📋 **Arquitetura**

### **Fluxo Atual (com LocAI)**:
```
WhatsApp → Microservice → LocAI → N8N → LocAI → Microservice → WhatsApp
```

### **Novo Fluxo (Direto)**:
```
WhatsApp → Microservice → LocAI → N8N → Microservice → WhatsApp
```

## 🔧 **1. Configuração do Microservice**

### **Variáveis de Ambiente (.env do microservice)**

Adicione/configure estas variáveis no arquivo `.env` do microservice:

```bash
# Configurações básicas
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
BASE_URL=http://167.172.116.195:3000

# Autenticação
JWT_SECRET=your-super-secure-jwt-secret-here-min-32-chars
API_KEY=tTmMQE3Rdgu1UpwEwTBow4GmBU9XstTaGva2kIqGjCU=
REQUIRE_AUTH=true

# CORS - Permitir N8N Cloud
ALLOWED_ORIGINS=*

# Logging
LOG_LEVEL=info

# WhatsApp/Baileys
WHATSAPP_SESSION_DIR=./sessions
WHATSAPP_TIMEOUT=60000
QR_TIMEOUT=120000
MAX_RECONNECT_ATTEMPTS=5

# LocAI Webhook (manter para receber mensagens)
LOCAI_WEBHOOK_URL=https://alugazap.com/api/webhook/whatsapp-microservice
LOCAI_WEBHOOK_SECRET=gGN2nsle3GBw67Eyzg4uUfhnig3NH7jm9nDw2FWnje4=

# Rate limiting
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100

# Cache
CACHE_TTL=300
```

### **Endpoints Disponíveis no Microservice**

#### **1. Enviar Mensagem**
```
POST /api/v1/messages/{tenantId}/send
```

#### **2. Status da Sessão**
```
GET /api/v1/sessions/{tenantId}/status
```

#### **3. Iniciar Sessão**
```
POST /api/v1/sessions/{tenantId}/start
```

#### **4. Desconectar Sessão**
```
DELETE /api/v1/sessions/{tenantId}
```

## 🎯 **2. Configuração N8N**

### **HTTP Request Node Settings**

#### **URL**
```
http://167.172.116.195:3000/api/v1/messages/{{$json.tenantId}}/send
```

#### **Method**
```
POST
```

#### **Headers**
```json
{
  "Content-Type": "application/json",
  "Authorization": "Bearer tTmMQE3Rdgu1UpwEwTBow4GmBU9XstTaGva2kIqGjCU=",
  "X-Tenant-ID": "{{$json.tenantId}}"
}
```

#### **Body para Mensagem de Texto**
```json
{
  "to": "{{$json.data.from}}",
  "message": "{{$('AI Agent').first().json.output}}",
  "type": "text"
}
```

#### **Body para Mensagem com Imagem**
```json
{
  "to": "{{$json.data.from}}",
  "message": "{{$('AI Agent').first().json.output}}",
  "type": "image",
  "mediaUrl": "{{$('AI Agent').first().json.mediaUrl}}"
}
```

#### **Body para Mensagem com Vídeo**
```json
{
  "to": "{{$json.data.from}}",
  "message": "{{$('AI Agent').first().json.output}}",
  "type": "video",
  "mediaUrl": "{{$('AI Agent').first().json.mediaUrl}}"
}
```

#### **Body para Documento**
```json
{
  "to": "{{$json.data.from}}",
  "message": "{{$('AI Agent').first().json.output}}",
  "type": "document",
  "mediaUrl": "{{$('AI Agent').first().json.mediaUrl}}",
  "filename": "{{$('AI Agent').first().json.filename || 'Document'}}"
}
```

### **Configurações Avançadas do HTTP Request**

#### **Timeout**
```
30000 (30 segundos)
```

#### **Retry on Fail**
```
Enabled: true
Number of Retries: 2
```

#### **Response**
```
Response Format: JSON
```

## 🧠 **3. JavaScript Node (Preparação de Dados)**

### **Código para Preparar Payload**
```javascript
// Extrair dados da mensagem original e resposta da IA
const originalData = $('webhook').first().json;
const aiResponse = $('AI Agent').first().json;

// Limpar número de telefone (remover caracteres especiais)
const cleanPhone = originalData.data.from.replace(/[^\d]/g, '');

// Determinar tipo de mensagem
let messageType = 'text';
let mediaUrl = null;
let filename = null;

if (aiResponse.mediaUrl) {
  if (aiResponse.mediaUrl.includes('.jpg') || aiResponse.mediaUrl.includes('.png') || aiResponse.mediaUrl.includes('.jpeg')) {
    messageType = 'image';
  } else if (aiResponse.mediaUrl.includes('.mp4') || aiResponse.mediaUrl.includes('.avi')) {
    messageType = 'video';
  } else {
    messageType = 'document';
    filename = aiResponse.filename || 'Document';
  }
  mediaUrl = aiResponse.mediaUrl;
}

// Preparar payload para o microservice
const payload = {
  to: cleanPhone,
  message: aiResponse.output || aiResponse.text || "Desculpe, houve um problema na resposta.",
  type: messageType
};

// Adicionar mídia se existir
if (mediaUrl) {
  payload.mediaUrl = mediaUrl;
  if (filename) {
    payload.filename = filename;
  }
}

console.log('Payload preparado para microservice:', JSON.stringify(payload, null, 2));

return { 
  json: payload,
  tenantId: originalData.tenantId
};
```

## 📊 **4. Validação de Resposta**

### **Resposta de Sucesso do Microservice**
```json
{
  "success": true,
  "messageId": "msg_1756171234567_abc123",
  "timestamp": "2025-08-26T02:00:00.000Z",
  "to": "5547999887766",
  "type": "text",
  "status": "sent"
}
```

### **Resposta de Erro**
```json
{
  "success": false,
  "error": "Session not connected",
  "code": "WHATSAPP_NOT_CONNECTED",
  "timestamp": "2025-08-26T02:00:00.000Z"
}
```

### **Node de Validação (JavaScript)**
```javascript
// Validar resposta do microservice
const response = $('Send Message').first().json;

if (response.success) {
  console.log('✅ Mensagem enviada com sucesso:', response.messageId);
  return {
    json: {
      status: 'success',
      messageId: response.messageId,
      timestamp: response.timestamp
    }
  };
} else {
  console.error('❌ Erro ao enviar mensagem:', response.error);
  
  // Opcional: Tentar fallback via LocAI
  return {
    json: {
      status: 'error',
      error: response.error,
      fallback_needed: true,
      original_payload: $('Prepare Payload').first().json
    }
  };
}
```

## 🔄 **5. Workflow N8N Completo**

### **Estrutura do Workflow**
```
1. Webhook Trigger (recebe mensagem do LocAI)
   ↓
2. JavaScript Node (extrai dados da mensagem)
   ↓
3. AI Agent Node (OpenAI/Claude/etc)
   ↓
4. JavaScript Node (prepara payload para microservice)
   ↓
5. HTTP Request Node (envia para microservice)
   ↓
6. JavaScript Node (valida resposta)
   ↓
7. End Node
```

### **Webhook Trigger Settings**
```
HTTP Method: POST
Path: /webhook/whatsapp-response
Authentication: Header Auth
Header Name: x-webhook-signature
Header Value: gGN2nsle3GBw67Eyzg4uUfhnig3NH7jm9nDw2FWnje4=
```

## 🚨 **6. Tratamento de Erros**

### **Error Trigger Node**
```javascript
// Capturar erros e logar
const error = $json.error;

console.error('❌ Erro no workflow:', {
  error: error.message,
  node: error.node?.name,
  timestamp: new Date().toISOString()
});

// Opcional: Notificar via Slack/Discord/Email
return {
  json: {
    alert: 'workflow_error',
    error: error.message,
    node: error.node?.name,
    timestamp: new Date().toISOString()
  }
};
```

## 📈 **7. Vantagens da Configuração Direta**

✅ **Redução de Latência**: Elimina 1 salto HTTP (LocAI)
✅ **Maior Confiabilidade**: Menos pontos de falha
✅ **Melhor Performance**: Comunicação direta com microservice
✅ **Logs Simplificados**: Menos camadas para debuggar
✅ **Escalabilidade**: N8N pode escalar independentemente

## 🔍 **8. Monitoramento e Debug**

### **Logs Importantes**
- **Microservice**: Logs de envio de mensagem
- **N8N**: Logs de execução do workflow
- **LocAI**: Logs de recebimento de mensagens (ainda necessário)

### **Métricas para Acompanhar**
- Tempo de resposta do microservice
- Taxa de sucesso de envio
- Latência total do fluxo
- Erros de timeout

## 🚀 **9. Deploy e Produção**

### **Checklist de Deploy**
- [ ] Variáveis de ambiente configuradas no microservice
- [ ] N8N workflow atualizado com nova URL
- [ ] Headers de autenticação corretos
- [ ] Timeout configurado (30s recomendado)
- [ ] Error handling implementado
- [ ] Logs de monitoramento ativos
- [ ] Teste completo do fluxo

### **Teste de Produção**
```bash
# Testar endpoint diretamente
curl -X POST "http://167.172.116.195:3000/api/v1/messages/U11UvXr67vWnDtDpDaaJDTuEcxo2/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer tTmMQE3Rdgu1UpwEwTBow4GmBU9XstTaGva2kIqGjCU=" \
  -H "X-Tenant-ID: U11UvXr67vWnDtDpDaaJDTuEcxo2" \
  -d '{
    "to": "5547999887766",
    "message": "Teste de conexão direta N8N → Microservice",
    "type": "text"
  }'
```

## 📋 **10. Rollback Plan**

Caso haja problemas, o rollback é simples:

1. **Alterar URL do N8N** de volta para: `https://alugazap.com/api/whatsapp/send-n8n`
2. **Manter headers** com a API Key do LocAI
3. **Usar body format** original do LocAI

## 🎯 **Resumo das Mudanças**

### **No N8N**:
- URL: `http://167.172.116.195:3000/api/v1/messages/{tenantId}/send`
- Headers: Authorization com API Key do microservice
- Body: Formato do microservice (`to`, `message`, `type`)

### **No Microservice**:
- Nenhuma mudança necessária (já está funcionando)
- Apenas certificar que as variáveis de ambiente estão corretas

### **No LocAI**:
- Manter para receber mensagens do WhatsApp
- Routes `/api/ai/functions/*` ainda necessárias para N8N usar as funções CRUD
- Deploy do timeout fix para resolver problemas de latência

Esta configuração oferece **melhor performance**, **maior confiabilidade** e **arquitetura mais simples**!