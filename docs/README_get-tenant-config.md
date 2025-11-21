# 📚 Documentação Completa: get-tenant-config API

**Endpoint:** `/api/ai/functions/get-tenant-config`
**Versão:** 2.0.0
**Status:** ✅ Operacional
**Última Atualização:** 2025-11-20

---

## 🎯 Visão Geral

O endpoint `get-tenant-config` centraliza **todas** as configurações do tenant em um único lugar, permitindo que o N8N Sofia AI tenha acesso completo às personalizações:

- ✅ Configurações de IA (permissões, descontos, prompts)
- ✅ Regras de negociação (PIX, parcelamento, descontos)
- ✅ Políticas (cancelamento, check-in/out)
- ✅ Informações da empresa

---

## 📖 Documentação Disponível

### 📋 [**DOSSIÊ COMPLETO**](./DOSSIE_get-tenant-config.md)
**Documentação técnica completa**
- 📥 Estrutura de requisição
- 📤 Estrutura de resposta completa
- 📊 Detalhamento de todos os campos
- 💡 Exemplos de uso N8N
- 🎯 Casos de uso práticos
- 🛠️ Troubleshooting

👉 **Comece aqui se for sua primeira vez**

---

### 📨 [**Exemplos de Requisições**](./api-examples/get-tenant-config-requests.md)
**Exemplos práticos em múltiplas linguagens**
- cURL
- JavaScript (Fetch)
- Python (requests)
- Node.js (axios)
- N8N HTTP Request
- Postman Collection
- Cache e revalidação
- Tratamento de erros

👉 **Use para implementação rápida**

---

### 📄 [**Resposta JSON Exemplo**](./api-examples/get-tenant-config-response.json)
**JSON completo de exemplo com todos os campos**
- Dados reais formatados
- Todos os campos preenchidos
- Comentários sobre valores

👉 **Use para referência rápida**

---

### 🔄 [**Guia de Migração v1 → v2**](./MIGRATION_get-tenant-config_v2.md)
**Breaking changes e como atualizar**
- Tabela de mapeamento de campos
- Exemplos de migração de código
- Checklist de migração
- Problemas comuns e soluções
- Script de migração automática

👉 **Obrigatório se você está atualizando workflows existentes**

---

### 📝 [**Changelog**](../CHANGELOG_get-tenant-config.md)
**Histórico de mudanças**
- v2.0.0 vs v1.0.0
- Breaking changes detalhados
- Impacto no N8N
- Validações realizadas

👉 **Veja o que mudou entre versões**

---

## 🚀 Quick Start

### 1️⃣ Health Check
```bash
curl http://localhost:8080/api/ai/functions/get-tenant-config
```

### 2️⃣ Requisição Básica
```bash
curl -X POST http://localhost:8080/api/ai/functions/get-tenant-config \
  -H "Content-Type: application/json" \
  -d '{"tenantId": "seu-tenant-id"}'
```

### 3️⃣ Usar no N8N
```javascript
// HTTP Request Node
POST {{$env.API_URL}}/api/ai/functions/get-tenant-config

Body:
{
  "tenantId": "{{$json.tenantId}}",
  "includeSettings": ["all"]
}

// Function Node (próximo nó)
const config = $json.data;
const canNegotiate = config.aiConfig.agentPermissions.sales;
const maxDiscount = config.aiConfig.discountSettings.maxPercentage;
```

---

## 📊 Estrutura de Dados (Resumo)

### Requisição
```json
{
  "tenantId": "string (required)",
  "includeSettings": ["ai", "negotiation", "policies", "company", "all"] (optional)
}
```

### Resposta
```json
{
  "success": true,
  "data": {
    "tenantId": "string",
    "fetchedAt": "ISO timestamp",
    "aiConfig": {
      "enabled": "boolean",
      "autoResponse": "boolean",
      "businessHoursOnly": "boolean",
      "agentPermissions": { /* search, booking, sales, support, payments */ },
      "discountSettings": { /* enabled, maxPercentage, allowedCriteria */ },
      "customPrompts": { /* welcome, companyName, tone, etc */ }
    },
    "negotiation": { /* regras de desconto e negociação */ },
    "policies": { /* políticas de cancelamento e check-in */ },
    "company": { /* informações da empresa */ }
  },
  "meta": { /* requestId, processingTime, timestamp */ }
}
```

---

## 🎯 Casos de Uso Principais

### 1. Verificar Permissões
```javascript
const canSearch = config.aiConfig.agentPermissions.search;
const canNegotiate = config.aiConfig.agentPermissions.sales;
const canBook = config.aiConfig.agentPermissions.booking;
```

### 2. Calcular Desconto Dinâmico
```javascript
const maxDiscount = Math.min(
  config.aiConfig.discountSettings.maxPercentage,
  config.negotiation.maxDiscountPercentage
);

const allowedCriteria = config.aiConfig.discountSettings.allowedCriteria;
// earlyBooking, longStay, lowSeason, lastMinute, multiProperty
```

### 3. Personalizar Mensagens
```javascript
const greeting = config.aiConfig.customPrompts.welcome;
const tone = config.aiConfig.customPrompts.tone; // formal, casual, friendly
const companyName = config.aiConfig.customPrompts.companyName;
```

### 4. Validar Horário Comercial
```javascript
if (config.aiConfig.businessHoursOnly) {
  const businessHours = config.company.businessHours;
  // Verificar se está dentro do horário
}
```

---

## ⚠️ Breaking Changes (v2.0.0)

Se você está migrando de v1.0.0:

| v1.0.0 | v2.0.0 | Status |
|--------|--------|--------|
| `agentBehavior` | `agentPermissions` | ⚠️ Substituído |
| `features` | ❌ | 🗑️ Removido |
| ❌ | `discountSettings` | ➕ Novo |
| ❌ | `customPrompts` | ➕ Novo |

**👉 Leia o [Guia de Migração](./MIGRATION_get-tenant-config_v2.md)**

---

## 📚 Índice de Documentos

```
docs/
├── README_get-tenant-config.md           (Este arquivo - Índice principal)
├── DOSSIE_get-tenant-config.md           (Documentação técnica completa)
├── MIGRATION_get-tenant-config_v2.md     (Guia de migração v1→v2)
├── CHANGELOG_get-tenant-config.md        (Histórico de mudanças)
└── api-examples/
    ├── get-tenant-config-requests.md     (Exemplos de requisições)
    └── get-tenant-config-response.json   (JSON de resposta exemplo)
```

---

## 🔗 Links Rápidos

| Recurso | Link |
|---------|------|
| 📋 Dossiê Completo | [DOSSIE_get-tenant-config.md](./DOSSIE_get-tenant-config.md) |
| 📨 Exemplos de Requisições | [get-tenant-config-requests.md](./api-examples/get-tenant-config-requests.md) |
| 📄 JSON Exemplo | [get-tenant-config-response.json](./api-examples/get-tenant-config-response.json) |
| 🔄 Guia de Migração | [MIGRATION_get-tenant-config_v2.md](./MIGRATION_get-tenant-config_v2.md) |
| 📝 Changelog | [CHANGELOG_get-tenant-config.md](../CHANGELOG_get-tenant-config.md) |
| 💻 Implementação | [route.ts](../app/api/ai/functions/get-tenant-config/route.ts) |
| 🔧 Tipos TypeScript | [ai-config.ts](../lib/types/ai-config.ts) |

---

## 🆘 Precisa de Ajuda?

### Para Desenvolvedores
1. Consulte o [Dossiê Completo](./DOSSIE_get-tenant-config.md) para detalhes técnicos
2. Veja [Exemplos de Requisições](./api-examples/get-tenant-config-requests.md) para código pronto
3. Use o JSON exemplo como referência

### Para Workflows N8N
1. Veja os casos de uso no [Dossiê](./DOSSIE_get-tenant-config.md#casos-de-uso-n8n)
2. Exemplos específicos de N8N nos [Exemplos de Requisições](./api-examples/get-tenant-config-requests.md#exemplo-5-n8n-http-request-node)

### Para Migração
1. Leia o [Guia de Migração](./MIGRATION_get-tenant-config_v2.md) completo
2. Use o script de migração automática
3. Siga o checklist de migração

---

## ✅ Status da Documentação

| Documento | Status | Última Atualização |
|-----------|--------|-------------------|
| README (este arquivo) | ✅ Completo | 2025-11-20 |
| Dossiê | ✅ Completo | 2025-11-20 |
| Exemplos de Requisições | ✅ Completo | 2025-11-20 |
| JSON Exemplo | ✅ Completo | 2025-11-20 |
| Guia de Migração | ✅ Completo | 2025-11-20 |
| Changelog | ✅ Completo | 2025-11-20 |

---

## 🎓 Próximos Passos

1. **Novo no endpoint?**
   - Comece com o [Quick Start](#-quick-start)
   - Leia o [Dossiê Completo](./DOSSIE_get-tenant-config.md)

2. **Implementando em produção?**
   - Use os [Exemplos de Requisições](./api-examples/get-tenant-config-requests.md)
   - Configure cache e tratamento de erros

3. **Migrando de v1?**
   - Leia o [Guia de Migração](./MIGRATION_get-tenant-config_v2.md)
   - Execute o script de migração
   - Teste todos os workflows

4. **Problemas?**
   - Consulte o [Troubleshooting](./DOSSIE_get-tenant-config.md#troubleshooting)
   - Verifique o health check
   - Revise os exemplos

---

**Versão da API:** 2.0.0
**Versão da Documentação:** 1.0.0
**Status:** ✅ Produção
**Última Atualização:** 2025-11-20
