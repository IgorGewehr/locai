# 🔍 Debug: Search Properties Não Retorna Resultados

**Problema:** Busca por "Balneário Piratuba" não retorna propriedades

---

## 🎯 Possíveis Causas

### 1. Nome da Localização Não Coincide

**Busca:** `"Balneário Piratuba"`

**Propriedade pode estar cadastrada como:**
- ✅ "Piratuba" (sem "Balneário")
- ✅ "Piratuba, SC"
- ✅ "PIRATUBA"
- ✅ "piratuba"
- ❌ "Piratuba - SC" (pode funcionar, depends do campo)

**Como verificar:**
```bash
# Opção 1: Ver no Firebase Console
Firestore > tenants > U11UvXr67vWnDtDpDaaJDTuEcxo2 > properties

# Opção 2: Fazer busca sem localização
curl -X POST http://localhost:3000/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"U11UvXr67vWnDtDpDaaJDTuEcxo2"}'
```

**Solução se for isso:**
- Buscar só por "Piratuba" (sem "Balneário")
- OU atualizar cadastro da propriedade para incluir "Balneário"

---

### 2. Preço Acima do Limite

**Filtro aplicado:** `maxPrice: 300` (R$ 300/noite)

**Código:**
```typescript
filteredProperties = filteredProperties.filter(property =>
  (property.basePrice || 0) <= 300
);
```

**Como verificar:**
1. Ver preço da propriedade no Firebase
2. Fazer busca SEM filtro de preço:
```json
{
  "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
  "location": "Piratuba"
  // SEM maxPrice
}
```

**Solução se for isso:**
- Aumentar `maxPrice` para 500 ou 1000
- OU remover filtro de preço

---

### 3. Tipo de Propriedade Não Coincide

**Filtro aplicado:** `propertyType: "apartamento"`

**Código:**
```typescript
const type = "apartamento".toLowerCase();
filteredProperties = filteredProperties.filter(property =>
  property.category?.toLowerCase().includes("apartamento")
);
```

**Property.category pode ser:**
- ✅ "Apartamento" → match!
- ✅ "apartamento" → match!
- ✅ "Apartamento 2 quartos" → match!
- ❌ "Casa" → NÃO match
- ❌ "Flat" → NÃO match
- ❌ "Studio" → NÃO match
- ❌ undefined → NÃO match

**Como verificar:**
```bash
# Buscar sem filtro de tipo
curl -X POST http://localhost:3000/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"U11UvXr67vWnDtDpDaaJDTuEcxo2","location":"Piratuba"}'
```

**Solução se for isso:**
- Remover filtro `propertyType`
- OU usar categoria correta (ver no Firebase)

---

### 4. Número de Quartos/Hóspedes

**Filtros aplicados:**
- `bedrooms: 1` → Propriedade precisa ter >= 1 quarto
- `guests: 2` → Propriedade precisa ter `maxGuests >= 2`

**Código:**
```typescript
// Filtro de quartos
filteredProperties = filteredProperties.filter(property =>
  (property.bedrooms || 0) >= 1
);

// Filtro de hóspedes
filteredProperties = filteredProperties.filter(property =>
  (property.maxGuests || 0) >= 2
);
```

**Como verificar:**
Ver campos `bedrooms` e `maxGuests` no Firebase

**Solução se for isso:**
- Ajustar valores dos filtros
- OU corrigir cadastro da propriedade

---

### 5. Propriedade Inativa

**Filtro automático:** Busca apenas propriedades com `isActive: true`

**Código:**
```typescript
const allProperties = await propertyService.getMany([
  { field: 'isActive', operator: '==', value: true }
]);
```

**Como verificar:**
Ver campo `isActive` no Firebase

**Solução se for isso:**
Ativar a propriedade no dashboard ou Firebase

---

## 🧪 Script de Debug

Execute o script criado:

```bash
# 1. Iniciar servidor
npm run dev

# 2. Em outro terminal
node scripts/debug-search.js
```

O script testa:
1. Busca ampla (sem filtros)
2. Busca com "Balneário Piratuba"
3. Busca com TODOS os filtros
4. Lista TODAS as propriedades ativas

---

## 📋 Checklist de Diagnóstico

Execute em ordem:

### Passo 1: Verificar se existem propriedades ativas

```bash
curl -X POST http://localhost:3000/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"U11UvXr67vWnDtDpDaaJDTuEcxo2"}'
```

**Se retornar 0 propriedades:**
- ❌ Não há propriedades ativas no tenant
- ✅ Criar/ativar propriedades no dashboard

**Se retornar > 0 propriedades:**
- ✅ Existem propriedades, problema está nos filtros
- ➡️ Vá para Passo 2

---

### Passo 2: Testar sem filtro de localização

```bash
curl -X POST http://localhost:3000/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"U11UvXr67vWnDtDpDaaJDTuEcxo2","guests":2,"bedrooms":1,"maxPrice":300,"propertyType":"apartamento"}'
```

**Se retornar > 0 propriedades:**
- ❌ Problema é o filtro de localização
- ✅ Ver Passo 3

**Se retornar 0 propriedades:**
- ❌ Problema está em outro filtro
- ✅ Ver Passo 4

---

### Passo 3: Testar variações de localização

```bash
# Teste 1: Sem "Balneário"
curl -X POST http://localhost:3000/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"U11UvXr67vWnDtDpDaaJDTuEcxo2","location":"Piratuba"}'

# Teste 2: Só "SC"
curl -X POST http://localhost:3000/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"U11UvXr67vWnDtDpDaaJDTuEcxo2","location":"SC"}'

# Teste 3: Busca parcial
curl -X POST http://localhost:3000/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"U11UvXr67vWnDtDpDaaJDTuEcxo2","location":"Pirat"}'
```

**Se algum retornar > 0:**
- ✅ Propriedade existe, mas com nome diferente
- ✅ Usar termo que funcionou

---

### Passo 4: Testar cada filtro individualmente

```bash
# Sem filtro de preço
curl -X POST http://localhost:3000/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"U11UvXr67vWnDtDpDaaJDTuEcxo2","location":"Piratuba","guests":2,"bedrooms":1,"propertyType":"apartamento"}'

# Sem filtro de tipo
curl -X POST http://localhost:3000/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"U11UvXr67vWnDtDpDaaJDTuEcxo2","location":"Piratuba","guests":2,"bedrooms":1,"maxPrice":300}'

# Sem filtro de quartos
curl -X POST http://localhost:3000/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"U11UvXr67vWnDtDpDaaJDTuEcxo2","location":"Piratuba","guests":2,"maxPrice":300,"propertyType":"apartamento"}'

# Sem filtro de hóspedes
curl -X POST http://localhost:3000/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{"tenantId":"U11UvXr67vWnDtDpDaaJDTuEcxo2","location":"Piratuba","bedrooms":1,"maxPrice":300,"propertyType":"apartamento"}'
```

**Qual deles retorna > 0?**
- ✅ Esse é o filtro problemático
- ✅ Ajustar filtro ou cadastro

---

## 🔧 Melhorias Possíveis

### 1. Busca Fuzzy para Localização

Permitir variações como:
- "Balneário Piratuba" = "Piratuba"
- "São Paulo" = "SP"
- "Rio de Janeiro" = "RJ"

**Implementação:**
```typescript
// Mapa de sinônimos
const locationSynonyms = {
  'balneário piratuba': ['piratuba', 'balneario piratuba'],
  'são paulo': ['sp', 'sao paulo'],
  // ...
};

// Busca com sinônimos
const searchTerms = [location, ...(locationSynonyms[location] || [])];
filteredProperties = filteredProperties.filter(property =>
  searchTerms.some(term => property.location?.toLowerCase().includes(term))
);
```

### 2. Logging Detalhado

Adicionar logs de cada filtro:
```typescript
logger.info('Filtros aplicados', {
  location: { term: 'Balneário Piratuba', matched: 0 },
  price: { max: 300, matched: 5 },
  type: { term: 'apartamento', matched: 3 },
  bedrooms: { min: 1, matched: 8 },
  guests: { min: 2, matched: 10 }
});
```

### 3. Sugestões de Busca

Retornar sugestões quando não encontrar:
```json
{
  "success": true,
  "properties": [],
  "totalFound": 0,
  "suggestions": {
    "relaxPrice": "Tente aumentar o preço máximo para R$ 500",
    "relaxType": "Tente remover o filtro de tipo de propriedade",
    "similarLocations": ["Piratuba", "Piratuba - SC"]
  }
}
```

---

## 📊 Exemplo de Diagnóstico Completo

```
🔍 DIAGNÓSTICO PASSO A PASSO

1. Total de propriedades ativas: 15 ✅
2. Com localização "Balneário Piratuba": 0 ❌
3. Com localização "Piratuba": 3 ✅
4. Com Piratuba + maxPrice 300: 2 ✅
5. Com Piratuba + tipo apartamento: 1 ✅
6. Com TODOS os filtros: 1 ✅

CONCLUSÃO:
- Problema: Nome da localização
- Solução: Buscar por "Piratuba" em vez de "Balneário Piratuba"
- OU: Atualizar propriedade no Firebase para incluir "Balneário"
```

---

## ✅ Ações Recomendadas

1. **Executar script de debug** (`node scripts/debug-search.js`)
2. **Verificar logs** do servidor (procurar por `[TenantAgent] search_properties`)
3. **Ver propriedades no Firebase Console**
4. **Testar variações de filtros**
5. **Ajustar busca ou cadastro** conforme necessário

---

**Data:** 17 de Janeiro de 2025
**Arquivo:** `docs/SEARCH_PROPERTIES_DEBUG.md`
