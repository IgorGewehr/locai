# 🧪 Guia de Teste - Integração N8N

## 🔧 **Suas Configurações Atuais:**
```bash
N8N_WEBHOOK_URL=https://alugazap.app.n8n.cloud/webhook/61d4590e-41ec-4ba0-a9f9-4746c29364cb
N8N_WEBHOOK_SECRET=gGN2nsle3GBw67Eyzg4uUfhnig3NH7jm9nDw2FWnje4=
N8N_API_KEY=f423ae223f4b7d2297f72f39390a70cd8b50560a12fef2330e2f638d2c9aa3eb
```

## ⚠️ **Problema Identificado:**
O N8N está retornando `"Authorization data is wrong!"`. Isso geralmente significa que o webhook não está configurado corretamente para validar o header `x-webhook-signature`.

## 🔧 **Soluções:**

### **Opção 1: Configurar Validação no N8N**

No seu workflow N8N, no **Webhook Node**:

1. **Authentication**: Deixe como `None`
2. **Options** → **Response**: 
   - Mode: `On Received`
   - Response Data: `{"success": true}`

3. **Adicionar Code Node** após o webhook para validar:
```javascript
// Validar secret (opcional - pode remover se não quiser validação)
const receivedSignature = $input.all()[0].headers['x-webhook-signature'];
const expectedSignature = 'gGN2nsle3GBw67Eyzg4uUfhnig3NH7jm9nDw2FWnje4=';

// Se quiser validar o secret, descomente:
// if (receivedSignature !== expectedSignature) {
//   throw new Error('Invalid signature');
// }

// Processar dados da mensagem
const tenantId = $input.all()[0].json.tenantId;
const clientPhone = $input.all()[0].json.data.from;
const message = $input.all()[0].json.data.message;

console.log('🎉 Mensagem recebida:', {
  tenantId,
  clientPhone: clientPhone.substring(0, 6) + '***',
  message: message.substring(0, 50) + '...'
});

return [{
  json: {
    tenantId,
    clientPhone,
    message,
    processedAt: new Date().toISOString()
  }
}];
```

### **Opção 2: Teste Sem Validação (Mais Simples)**

1. **Remova a validação** do webhook temporariamente
2. **Configure apenas Response**: `{"success": true}`

## 🧪 **Como Testar:**

### **1. Iniciar seu Frontend**
```bash
cd /mnt/c/Users/Administrador/Documents/Projetos/locai
npm run dev
```

### **2. Testar Configuração**
```bash
# Verificar se as variáveis estão corretas
curl http://localhost:3000/api/n8n/test
```

### **3. Testar Envio para N8N (Simplificado)**
```bash
# Teste direto sem validação
curl -X POST https://alugazap.app.n8n.cloud/webhook/61d4590e-41ec-4ba0-a9f9-4746c29364cb \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-tenant",
    "data": {
      "from": "5511999999999",
      "message": "Olá! Gostaria de alugar um apartamento na praia",
      "messageId": "test_123",
      "timestamp": "'$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)'"
    },
    "event": "message",
    "source": "manual-test"
  }'
```

### **4. Testar via Endpoint Interno**
```bash
# Testar integração completa
curl -X POST http://localhost:3000/api/n8n/test \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "test-tenant",
    "message": "Teste de integração - busco apartamento 2 quartos na praia",
    "simulate": false
  }'
```

### **5. Testar Resposta do N8N**
No final do workflow N8N, adicione este **HTTP Request Node**:

```json
{
  "method": "POST",
  "url": "https://seu-dominio.com/api/whatsapp/send-n8n",
  "headers": {
    "Content-Type": "application/json",
    "Authorization": "Bearer f423ae223f4b7d2297f72f39390a70cd8b50560a12fef2330e2f638d2c9aa3eb"
  },
  "body": {
    "tenantId": "{{ $json.tenantId }}",
    "clientPhone": "{{ $json.clientPhone }}",
    "finalMessage": "🎉 N8N funcionando! Sua mensagem foi: {{ $json.message }}"
  }
}
```

## 📋 **Workflow N8N Básico para Teste:**

```
1. Webhook Trigger
   ↓
2. Code Node (processar dados)
   ↓  
3. HTTP Request (enviar resposta)
```

### **Code Node Simples:**
```javascript
const data = $input.all()[0].json;

// Simular processamento
const responses = [
  "🏠 Encontrei algumas opções de apartamentos na praia!",
  "📍 Temos várias propriedades disponíveis na região.",
  "💰 Os preços variam de R$ 2.500 a R$ 8.000 por mês.",
  "📞 Gostaria de mais detalhes sobre alguma propriedade?"
];

const randomResponse = responses[Math.floor(Math.random() * responses.length)];

return [{
  json: {
    tenantId: data.tenantId,
    clientPhone: data.data.from,
    finalMessage: `${randomResponse}\n\n✅ Teste N8N realizado com sucesso!`,
    originalMessage: data.data.message
  }
}];
```

## 🔍 **Debug e Monitoramento:**

### **No N8N:**
- Vá em **Executions** para ver se o webhook foi chamado
- Verifique os logs de cada node
- Teste cada node individualmente

### **No Frontend (quando estiver rodando):**
```bash
# Ver logs de teste
tail -f logs/app.log | grep "N8N-TEST"

# Ver chamadas recebidas do N8N
grep "N8N-WhatsApp" logs/app.log

# Ver erros
grep "❌" logs/app.log | grep "N8N"
```

## ✅ **Checklist de Validação:**

### **N8N:**
- [ ] Webhook criado e ativo
- [ ] URL do webhook correta no .env
- [ ] Workflow publicado (não em draft)
- [ ] Response configurado no webhook
- [ ] HTTP Request final configurado

### **Frontend:**
- [ ] Variáveis de ambiente configuradas
- [ ] Servidor rodando (`npm run dev`)
- [ ] Endpoint `/api/whatsapp/send-n8n` funcionando
- [ ] Logs sendo gerados corretamente

### **Fluxo Completo:**
- [ ] Mensagem chega no webhook
- [ ] N8N processa corretamente  
- [ ] N8N chama `/api/whatsapp/send-n8n`
- [ ] Frontend recebe e confirma sucesso
- [ ] Mensagem seria enviada ao WhatsApp

## 🚀 **Próximos Passos:**

1. **Configure o N8N** sem validação primeiro
2. **Inicie o frontend** (`npm run dev`)  
3. **Teste o workflow** básico
4. **Adicione validação** depois que funcionar
5. **Implemente lógica** mais complexa no N8N

**Precisa de ajuda com algum passo específico?**