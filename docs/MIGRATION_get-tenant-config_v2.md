# 🔄 Guia de Migração: get-tenant-config v1.0.0 → v2.0.0

**Breaking Changes:** Sim
**Data:** 2025-11-20
**Impacto:** Alto (workflows N8N precisam ser atualizados)

---

## 📋 Índice

1. [O Que Mudou](#o-que-mudou)
2. [Tabela de Mapeamento](#tabela-de-mapeamento)
3. [Exemplos de Migração](#exemplos-de-migração)
4. [Checklist de Migração](#checklist-de-migração)
5. [Problemas Comuns](#problemas-comuns)

---

## 🔧 O Que Mudou

### 1. **Caminho do Firestore**
```diff
- tenants/{tenantId}/settings/aiConfig
+ tenants/{tenantId}/aiConfig/settings
```

### 2. **Estrutura do aiConfig**
```diff
{
  "aiConfig": {
    "enabled": true,
    "autoResponse": true,
    "businessHoursOnly": false,
-   "agentBehavior": { /* ... */ },
-   "features": { /* ... */ }
+   "agentPermissions": { /* ... */ },
+   "discountSettings": { /* ... */ },
+   "customPrompts": { /* ... */ }
  }
}
```

### 3. **Campos Removidos**
- ❌ `aiConfig.agentBehavior`
- ❌ `aiConfig.features`

### 4. **Campos Adicionados**
- ✅ `aiConfig.agentPermissions`
- ✅ `aiConfig.discountSettings`
- ✅ `aiConfig.customPrompts`

---

## 📊 Tabela de Mapeamento

### aiConfig

| v1.0.0 | v2.0.0 | Tipo | Notas |
|--------|--------|------|-------|
| `enabled` | `enabled` | ✅ Mantido | Sem mudanças |
| `autoResponse` | `autoResponse` | ✅ Mantido | Sem mudanças |
| `businessHoursOnly` | `businessHoursOnly` | ✅ Mantido | Sem mudanças |
| `agentBehavior.search` | `agentPermissions.search` | ⚠️ Migrado | Agora é boolean |
| `agentBehavior.booking` | `agentPermissions.booking` | ⚠️ Migrado | Agora é boolean |
| `agentBehavior.support` | `agentPermissions.support` | ⚠️ Migrado | Agora é boolean |
| ❌ | `agentPermissions.sales` | ➕ Novo | Controla negociação |
| ❌ | `agentPermissions.payments` | ➕ Novo | Futuro (sempre false) |
| `features.*` | ❌ | 🗑️ Removido | Não existe mais |
| ❌ | `discountSettings.*` | ➕ Novo | Configurações de desconto |
| ❌ | `customPrompts.*` | ➕ Novo | Personalização de mensagens |

### agentBehavior → agentPermissions (Detalhado)

| v1.0.0 | v2.0.0 | Mudança |
|--------|--------|---------|
| `agentBehavior.search.maxPropertiesPerSearch` | ❌ | Removido |
| `agentBehavior.search.autoSendPhotos` | ❌ | Removido |
| `agentBehavior.search.autoSendMap` | ❌ | Removido |
| `agentBehavior.booking.requireEmail` | ❌ | Removido |
| `agentBehavior.booking.requireDocument` | ❌ | Removido |
| `agentBehavior.booking.autoScheduleKeyPickup` | ❌ | Removido |
| `agentBehavior.support.allowCancellations` | ❌ | Removido |
| `agentBehavior.support.allowModifications` | ❌ | Removido |
| `agentBehavior.support.autoTransferThreshold` | ❌ | Removido |

**Nota:** Essas configurações detalhadas foram simplificadas para booleans de permissão.

---

## 🔄 Exemplos de Migração

### Exemplo 1: Verificar se Search está habilitado

#### v1.0.0 ❌
```javascript
const config = $json.data;

// Verificar se search está habilitado
const canSearch = config.aiConfig.agentBehavior?.search?.maxPropertiesPerSearch > 0;

if (canSearch) {
  // Sofia pode buscar imóveis
}
```

#### v2.0.0 ✅
```javascript
const config = $json.data;

// Verificar se search está habilitado
const canSearch = config.aiConfig.agentPermissions.search;

if (canSearch) {
  // Sofia pode buscar imóveis
}
```

---

### Exemplo 2: Verificar Features

#### v1.0.0 ❌
```javascript
const config = $json.data;

// Verificar se analytics está habilitado
const hasAnalytics = config.aiConfig.features?.analytics || false;
```

#### v2.0.0 ✅
```javascript
const config = $json.data;

// Features foi removido - usar agentPermissions para lógica de negócio
// Se precisar de analytics, usar outro endpoint específico
```

---

### Exemplo 3: Obter Nome da Empresa

#### v1.0.0 ❌
```javascript
const config = $json.data;

// Nome da empresa estava apenas em company
const companyName = config.company?.name || 'Imobiliária';
```

#### v2.0.0 ✅
```javascript
const config = $json.data;

// Agora também está em customPrompts para uso em mensagens
const companyName = config.aiConfig.customPrompts.companyName ||
                    config.company?.name ||
                    'Imobiliária';
```

---

### Exemplo 4: Lógica de Negociação

#### v1.0.0 ❌
```javascript
const config = $json.data;

// Não havia configuração de descontos dinâmicos
// Lógica estava hardcoded no workflow

const canNegotiate = config.negotiation?.allowAINegotiation || false;
const maxDiscount = 20; // Hardcoded
```

#### v2.0.0 ✅
```javascript
const config = $json.data;

// Verificar permissão E configurações de desconto
const canNegotiate = config.aiConfig.agentPermissions.sales &&
                     config.negotiation.allowAINegotiation &&
                     config.aiConfig.discountSettings.enabled;

const maxDiscount = Math.min(
  config.aiConfig.discountSettings.maxPercentage,
  config.negotiation.maxDiscountPercentage
);

// Verificar critérios permitidos
const allowedCriteria = config.aiConfig.discountSettings.allowedCriteria;

if (allowedCriteria.longStay) {
  // Pode oferecer desconto por estadia longa
}
```

---

### Exemplo 5: Personalização de Tom

#### v1.0.0 ❌
```javascript
// Não existia customização de tom
// Mensagens eram sempre no mesmo estilo
const greeting = "Olá! Sou a Sofia.";
```

#### v2.0.0 ✅
```javascript
const config = $json.data;
const prompts = config.aiConfig.customPrompts;

// Usar mensagem personalizada
let greeting = prompts.welcome || "Olá! Sou a Sofia.";

// Adaptar baseado no tom
const tone = prompts.tone; // 'formal', 'casual', 'friendly'

if (tone === 'formal') {
  greeting = "Prezado(a) cliente, bem-vindo(a). Sou a Sofia.";
} else if (tone === 'casual') {
  greeting = "E aí! Sou a Sofia 👋";
}

// Incluir valores da empresa se configurado
if (prompts.companyValues) {
  greeting += `\n\n${prompts.companyValues}`;
}
```

---

## ✅ Checklist de Migração

### 🔍 1. Auditoria de Código

- [ ] Buscar por `agentBehavior` no código
- [ ] Buscar por `features` no código
- [ ] Identificar todos os workflows N8N que usam `get-tenant-config`
- [ ] Listar todas as propriedades acessadas de `aiConfig`

### 🔄 2. Atualização de Código

- [ ] Substituir `agentBehavior` por `agentPermissions`
- [ ] Remover referências a `features`
- [ ] Adicionar lógica para `discountSettings`
- [ ] Adicionar suporte a `customPrompts`
- [ ] Atualizar verificações de permissão para usar booleans

### 🧪 3. Testes

- [ ] Testar com tenant que tem configurações customizadas
- [ ] Testar com tenant que usa configurações padrão
- [ ] Testar cenário de desconto dinâmico
- [ ] Testar personalização de tom e mensagens
- [ ] Validar que campos removidos não quebram o código

### 📝 4. Documentação

- [ ] Atualizar documentação interna do N8N
- [ ] Notificar equipe sobre breaking changes
- [ ] Atualizar comentários no código
- [ ] Revisar README de workflows

---

## 🐛 Problemas Comuns

### Problema 1: `Cannot read property 'search' of undefined`

**Causa:** Tentando acessar `agentBehavior.search` que não existe mais.

**Solução:**
```javascript
// ❌ Antes
const maxProps = config.aiConfig.agentBehavior.search.maxPropertiesPerSearch;

// ✅ Depois
const canSearch = config.aiConfig.agentPermissions.search;
```

---

### Problema 2: `features is undefined`

**Causa:** Campo `features` foi removido.

**Solução:**
```javascript
// ❌ Antes
const hasAnalytics = config.aiConfig.features.analytics;

// ✅ Depois
// Se precisar de features, criar lógica específica ou usar outro endpoint
// Para analytics, por exemplo:
const hasAnalytics = true; // Ou buscar de outro lugar
```

---

### Problema 3: Desconto sempre 0%

**Causa:** Não está verificando `discountSettings.enabled`.

**Solução:**
```javascript
// ❌ Antes
const canDiscount = config.negotiation.allowAINegotiation;

// ✅ Depois
const canDiscount = config.aiConfig.agentPermissions.sales &&
                    config.negotiation.allowAINegotiation &&
                    config.aiConfig.discountSettings.enabled;
```

---

### Problema 4: Mensagens não personalizadas

**Causa:** Não está usando `customPrompts`.

**Solução:**
```javascript
// ❌ Antes
const greeting = "Olá! Sou a Sofia.";

// ✅ Depois
const greeting = config.aiConfig.customPrompts.welcome ||
                 "Olá! Sou a Sofia.";
```

---

## 🔧 Script de Migração Automática

### Node.js Script
```javascript
/**
 * Script para converter código v1.0.0 para v2.0.0
 */

const fs = require('fs');
const path = require('path');

function migrateCode(code) {
  let migrated = code;

  // 1. agentBehavior → agentPermissions
  migrated = migrated.replace(
    /\.agentBehavior\.(search|booking|support)/g,
    '.agentPermissions.$1'
  );

  // 2. Remover referências a features
  migrated = migrated.replace(
    /config\.aiConfig\.features\.\w+/g,
    '/* MIGRAÇÃO: features removido - revisar manualmente */'
  );

  // 3. Adicionar nota sobre discountSettings
  if (migrated.includes('negotiation.allowAINegotiation')) {
    migrated = migrated.replace(
      'negotiation.allowAINegotiation',
      '/* MIGRAÇÃO: Adicionar verificação de discountSettings.enabled */\n' +
      '  negotiation.allowAINegotiation'
    );
  }

  return migrated;
}

// Uso
const workflowPath = './n8n-workflows';
const files = fs.readdirSync(workflowPath);

files.forEach(file => {
  const filePath = path.join(workflowPath, file);
  const content = fs.readFileSync(filePath, 'utf8');
  const migrated = migrateCode(content);

  if (content !== migrated) {
    fs.writeFileSync(filePath + '.migrated', migrated);
    console.log(`✅ Migrado: ${file}`);
  }
});
```

---

## 📚 Recursos Adicionais

- [Dossiê Completo](/DOSSIE_get-tenant-config.md)
- [Exemplos de Requisições](/docs/api-examples/get-tenant-config-requests.md)
- [Changelog](/CHANGELOG_get-tenant-config.md)
- [Resposta JSON Exemplo](/docs/api-examples/get-tenant-config-response.json)

---

## 🆘 Suporte

Se encontrar problemas durante a migração:

1. Consulte a [documentação completa](/DOSSIE_get-tenant-config.md)
2. Verifique os [exemplos práticos](/docs/api-examples/get-tenant-config-requests.md)
3. Teste usando o health check endpoint
4. Entre em contato com a equipe de desenvolvimento

---

**Última atualização:** 2025-11-20
**Versão:** 2.0.0
**Status:** ✅ Em produção
