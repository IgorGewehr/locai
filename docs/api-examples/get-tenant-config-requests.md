# 📨 Exemplos de Requisições: get-tenant-config

Todos os exemplos práticos de como usar o endpoint `/api/ai/functions/get-tenant-config`.

---

## 🌐 Base URL

```
http://localhost:8080/api/ai/functions/get-tenant-config
```

**Produção:**
```
https://alugazap.com/api/ai/functions/get-tenant-config
```

---

## 📋 Exemplo 1: Requisição Completa (Todas as Seções)

### cURL
```bash
curl -X POST http://localhost:8080/api/ai/functions/get-tenant-config \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_abc123",
    "includeSettings": ["all"]
  }'
```

### JavaScript (Fetch)
```javascript
const response = await fetch('http://localhost:8080/api/ai/functions/get-tenant-config', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    tenantId: 'tenant_abc123',
    includeSettings: ['all']
  })
});

const data = await response.json();
console.log(data);
```

### Python (requests)
```python
import requests

url = 'http://localhost:8080/api/ai/functions/get-tenant-config'
payload = {
    'tenantId': 'tenant_abc123',
    'includeSettings': ['all']
}

response = requests.post(url, json=payload)
config = response.json()
print(config)
```

### Node.js (axios)
```javascript
const axios = require('axios');

const response = await axios.post(
  'http://localhost:8080/api/ai/functions/get-tenant-config',
  {
    tenantId: 'tenant_abc123',
    includeSettings: ['all']
  }
);

console.log(response.data);
```

---

## 📋 Exemplo 2: Apenas Configurações de IA

### cURL
```bash
curl -X POST http://localhost:8080/api/ai/functions/get-tenant-config \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_abc123",
    "includeSettings": ["ai"]
  }'
```

### Resposta Reduzida
```json
{
  "success": true,
  "data": {
    "tenantId": "tenant_abc123",
    "fetchedAt": "2025-11-20T17:34:08.562Z",
    "aiConfig": {
      "enabled": true,
      "autoResponse": true,
      "businessHoursOnly": false,
      "agentPermissions": { /* ... */ },
      "discountSettings": { /* ... */ },
      "customPrompts": { /* ... */ }
    }
  },
  "meta": { /* ... */ }
}
```

---

## 📋 Exemplo 3: Múltiplas Seções Específicas

### cURL
```bash
curl -X POST http://localhost:8080/api/ai/functions/get-tenant-config \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant_abc123",
    "includeSettings": ["ai", "negotiation", "policies"]
  }'
```

### JavaScript
```javascript
const response = await fetch('http://localhost:8080/api/ai/functions/get-tenant-config', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tenantId: 'tenant_abc123',
    includeSettings: ['ai', 'negotiation', 'policies']
  })
});

const { data } = await response.json();

// Acesso às configurações
console.log('AI Config:', data.aiConfig);
console.log('Negotiation:', data.negotiation);
console.log('Policies:', data.policies);
// data.company não estará presente
```

---

## 📋 Exemplo 4: Health Check

### cURL
```bash
curl -X GET http://localhost:8080/api/ai/functions/get-tenant-config
```

### Resposta
```json
{
  "function": "get-tenant-config",
  "version": "2.0.0",
  "description": "AI agent retrieves complete tenant configuration for N8N workflows",
  "status": "operational",
  "parameters": {
    "required": ["tenantId"],
    "optional": ["includeSettings"]
  },
  "availableSettings": [
    "ai - AI agent behavior (agentPermissions, discountSettings, customPrompts)",
    "negotiation - Pricing and discount settings",
    "policies - Cancellation, check-in/out, house rules",
    "company - Company information and contact",
    "all - All settings above (default)"
  ],
  "timestamp": "2025-11-20T17:34:10.155Z"
}
```

---

## 🤖 Exemplo 5: N8N HTTP Request Node

### Configuração do Node
```
Method: POST
URL: {{$env.API_URL}}/api/ai/functions/get-tenant-config
Authentication: None
Body Content Type: JSON

Body:
{
  "tenantId": "{{$json.tenantId}}",
  "includeSettings": ["all"]
}
```

### Usando a Resposta
```javascript
// Function Node depois do HTTP Request
const config = $json.data;

// Extrair configurações específicas
const aiEnabled = config.aiConfig.enabled;
const canNegotiate = config.aiConfig.agentPermissions.sales;
const maxDiscount = config.aiConfig.discountSettings.maxPercentage;

// Retornar para próximo nó
return {
  aiEnabled,
  canNegotiate,
  maxDiscount,
  companyName: config.aiConfig.customPrompts.companyName,
  tone: config.aiConfig.customPrompts.tone
};
```

---

## 📋 Exemplo 6: Postman Collection

### Request Configuration
```
POST http://localhost:8080/api/ai/functions/get-tenant-config

Headers:
  Content-Type: application/json

Body (raw, JSON):
{
  "tenantId": "{{tenantId}}",
  "includeSettings": ["all"]
}

Tests:
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response has aiConfig", function () {
  const jsonData = pm.response.json();
  pm.expect(jsonData.data.aiConfig).to.exist;
});
```

---

## 📋 Exemplo 7: Requisição Mínima

### cURL (Padrão - Todas as Seções)
```bash
curl -X POST http://localhost:8080/api/ai/functions/get-tenant-config \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "tenant_abc123"}'
```

Quando `includeSettings` não é especificado, o padrão é `["all"]`.

---

## 📋 Exemplo 8: Tratamento de Erros

### JavaScript com Try/Catch
```javascript
async function getTenantConfig(tenantId) {
  try {
    const response = await fetch('http://localhost:8080/api/ai/functions/get-tenant-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Failed to get config');
    }

    return result.data;

  } catch (error) {
    console.error('Error fetching tenant config:', error);
    throw error;
  }
}

// Uso
const config = await getTenantConfig('tenant_abc123');
console.log('AI Enabled:', config.aiConfig.enabled);
```

### Python com Exception Handling
```python
import requests
from typing import Dict, Any

def get_tenant_config(tenant_id: str) -> Dict[str, Any]:
    try:
        response = requests.post(
            'http://localhost:8080/api/ai/functions/get-tenant-config',
            json={'tenantId': tenant_id},
            timeout=10
        )
        response.raise_for_status()

        data = response.json()

        if not data.get('success'):
            raise Exception(data.get('error', 'Failed to get config'))

        return data['data']

    except requests.exceptions.RequestException as e:
        print(f'Error fetching config: {e}')
        raise

# Uso
config = get_tenant_config('tenant_abc123')
print(f"AI Enabled: {config['aiConfig']['enabled']}")
```

---

## 📋 Exemplo 9: Cache e Revalidação

### JavaScript com Cache Local
```javascript
class TenantConfigCache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutos
    this.cache = new Map();
    this.ttl = ttl;
  }

  async get(tenantId) {
    const cached = this.cache.get(tenantId);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      console.log('Using cached config');
      return cached.data;
    }

    console.log('Fetching fresh config');
    const data = await this.fetch(tenantId);

    this.cache.set(tenantId, {
      data,
      timestamp: Date.now()
    });

    return data;
  }

  async fetch(tenantId) {
    const response = await fetch('http://localhost:8080/api/ai/functions/get-tenant-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId })
    });

    const result = await response.json();
    return result.data;
  }

  invalidate(tenantId) {
    this.cache.delete(tenantId);
  }
}

// Uso
const cache = new TenantConfigCache();
const config = await cache.get('tenant_abc123');
```

---

## 📋 Exemplo 10: Verificação de Permissões

### N8N Function Node
```javascript
// Recebe config do nó anterior
const config = $json.data;
const userRequest = $json.userRequest; // "fazer reserva", "negociar preço", etc

// Mapear requisições para permissões
const permissionMap = {
  'buscar imovel': 'search',
  'fazer reserva': 'booking',
  'negociar preço': 'sales',
  'cancelar reserva': 'support',
  'processar pagamento': 'payments'
};

const requiredPermission = permissionMap[userRequest];

if (!requiredPermission) {
  return { allowed: true, reason: 'No special permission required' };
}

const allowed = config.aiConfig.agentPermissions[requiredPermission];

if (!allowed) {
  return {
    allowed: false,
    reason: `Sofia não tem permissão para ${userRequest}`,
    suggestedAction: 'transfer_to_human'
  };
}

return {
  allowed: true,
  permission: requiredPermission
};
```

---

## 📋 Exemplo 11: Cálculo de Desconto Dinâmico

### JavaScript
```javascript
async function calculateOptimalDiscount(tenantId, bookingDetails) {
  // Buscar configurações
  const response = await fetch('http://localhost:8080/api/ai/functions/get-tenant-config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenantId,
      includeSettings: ['ai', 'negotiation']
    })
  });

  const { data } = await response.json();
  const { aiConfig, negotiation } = data;

  // Verificar se pode oferecer descontos
  if (!aiConfig.discountSettings.enabled) {
    return { discount: 0, reason: 'Discounts disabled' };
  }

  let totalDiscount = 0;
  const appliedCriteria = [];

  // 1. Desconto por estadia longa
  if (aiConfig.discountSettings.allowedCriteria.longStay &&
      negotiation.extendedStayDiscountEnabled) {

    const stayDays = bookingDetails.stayDays;
    const rule = negotiation.extendedStayRules
      .filter(r => stayDays >= r.minDays)
      .sort((a, b) => b.minDays - a.minDays)[0];

    if (rule) {
      totalDiscount += rule.discountPercentage;
      appliedCriteria.push(`Estadia longa (${stayDays} dias): ${rule.discountPercentage}%`);
    }
  }

  // 2. Desconto por reserva antecipada
  if (aiConfig.discountSettings.allowedCriteria.earlyBooking &&
      negotiation.earlyBookingDiscountEnabled) {

    const daysInAdvance = bookingDetails.daysInAdvance;
    const rule = negotiation.earlyBookingRules
      .filter(r => daysInAdvance >= r.daysInAdvance)
      .sort((a, b) => b.daysInAdvance - a.daysInAdvance)[0];

    if (rule) {
      totalDiscount += rule.discountPercentage;
      appliedCriteria.push(`Reserva antecipada (${daysInAdvance} dias): ${rule.discountPercentage}%`);
    }
  }

  // 3. Desconto PIX
  if (bookingDetails.paymentMethod === 'pix' && negotiation.pixDiscountEnabled) {
    totalDiscount += negotiation.pixDiscountPercentage;
    appliedCriteria.push(`Pagamento PIX: ${negotiation.pixDiscountPercentage}%`);
  }

  // Aplicar limite máximo
  totalDiscount = Math.min(
    totalDiscount,
    aiConfig.discountSettings.maxPercentage,
    negotiation.maxDiscountPercentage
  );

  // Verificar se precisa aprovação
  const needsApproval = totalDiscount > aiConfig.discountSettings.approvalThreshold;

  return {
    discount: totalDiscount,
    appliedCriteria,
    needsApproval,
    maxAllowed: Math.min(
      aiConfig.discountSettings.maxPercentage,
      negotiation.maxDiscountPercentage
    )
  };
}

// Uso
const result = await calculateOptimalDiscount('tenant_abc123', {
  stayDays: 10,
  daysInAdvance: 45,
  paymentMethod: 'pix'
});

console.log(result);
// {
//   discount: 35,
//   appliedCriteria: [
//     'Estadia longa (10 dias): 15%',
//     'Reserva antecipada (45 dias): 10%',
//     'Pagamento PIX: 10%'
//   ],
//   needsApproval: true,
//   maxAllowed: 30
// }
```

---

## 📝 Notas Importantes

1. **Sem Autenticação:** O endpoint não requer token de autenticação, apenas o `tenantId`.

2. **Cache:** O endpoint **não** faz cache. Sempre retorna dados frescos do Firestore.

3. **Performance:** Requisições completas (`includeSettings: ["all"]`) levam ~1500ms.

4. **Defaults:** Se uma configuração não existir, valores padrão são retornados com `note`.

5. **Versioning:** Sempre verifique o campo `version` na resposta do health check.

---

**Última atualização:** 2025-11-20
