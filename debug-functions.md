# 🔍 Debug das Funções API - Problemas Identificados

## 📋 **Resumo dos Problemas**

Com base na análise do código, identifiquei possíveis causas dos erros:

### 1. **CALCULATE_PRICE** - Possíveis causas:
- ❌ **Propriedade não existe** no tenant especificado
- ❌ **Cálculo de preços falhando** por falta de dados de pricing
- ❌ **ConversationStateManager** falhando ao buscar contexto
- ❌ **Datas inválidas** ou em formato incorreto

### 2. **CREATE_RESERVATION** - Possíveis causas:
- ❌ **Propriedade não disponível** nas datas especificadas
- ❌ **Falha na criação do cliente** automaticamente
- ❌ **Validação de dados** falhando
- ❌ **Conflito de reservas** nas mesmas datas

### 3. **REGISTER_CLIENT** - Possíveis causas:
- ❌ **Deduplicação por telefone** falhando
- ❌ **Validação de campos obrigatórios**
- ❌ **Problemas no FirestoreService**

### 4. **CHECK_AVAILABILITY** - Possíveis causas:
- ❌ **Propriedade não encontrada**
- ❌ **Serviço de disponibilidade** não implementado
- ❌ **Datas de check-in/check-out** inválidas

---

## 🧪 **TESTE DIAGNÓSTICO COMPLETO**

### **Passo 1: Verificar se o servidor está rodando**
```bash
curl -X GET http://localhost:8080/api/health
```

**Esperado:** Status 200 com informações do sistema

---

### **Passo 2: Testar search-properties (que funciona)**
```bash
curl -X POST http://localhost:8080/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
    "location": "Centro",
    "guests": 2
  }'
```

**➡️ IMPORTANTE: SALVE UM PROPERTY ID DA RESPOSTA**

---

### **Passo 3: Testar register-client (versão simplificada)**
```bash
curl -X POST http://localhost:8080/api/ai/functions/register-client \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
    "name": "João Silva",
    "phone": "+5511999887766"
  }'
```

**Possíveis erros e soluções:**

#### Se der erro `TenantServiceFactory não encontrado`:
```json
{
  "success": false,
  "error": "TenantServiceFactory is not defined"
}
```
**Solução:** Problema na importação do serviço

#### Se der erro `Firestore permission denied`:
```json
{
  "success": false,
  "error": "Permission denied"
}
```
**Solução:** Verificar configurações do Firebase

#### Se der erro `Tenant not found`:
```json
{
  "success": false,
  "error": "Tenant configuration not found"
}
```
**Solução:** Verificar se o tenant ID existe no sistema

---

### **Passo 4: Testar calculate-price (com property ID válido)**
```bash
curl -X POST http://localhost:8080/api/ai/functions/calculate-price \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "U11UvXr67vWnDpDaaJDTuEcxo2",
    "propertyId": "SEU_PROPERTY_ID_AQUI",
    "checkIn": "2025-02-01",
    "checkOut": "2025-02-03",
    "guests": 2
  }'
```

**Possíveis erros:**

#### Se der `Property not found`:
- Usar um propertyId válido do search-properties
- Verificar se a propriedade pertence ao tenant correto

#### Se der `Pricing calculation failed`:
- A propriedade pode não ter preços configurados
- Verificar se há dados de pricing na propriedade

---

### **Passo 5: Testar check-availability**
```bash
curl -X POST http://localhost:8080/api/ai/functions/check-availability \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
    "propertyId": "SEU_PROPERTY_ID_AQUI",
    "checkIn": "2025-02-01",
    "checkOut": "2025-02-03"
  }'
```

---

### **Passo 6: Testar create-reservation (por último)**
```bash
curl -X POST http://localhost:8080/api/ai/functions/create-reservation \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
    "propertyId": "SEU_PROPERTY_ID_AQUI",
    "clientName": "João Silva",
    "clientPhone": "+5511999887766",
    "checkIn": "2025-02-01",
    "checkOut": "2025-02-03",
    "guests": 2,
    "totalPrice": 300.00
  }'
```

---

## 🛠️ **VERIFICAÇÕES DE SISTEMA**

### **1. Verificar se há propriedades no Firebase:**
1. Acesse Firebase Console
2. Firestore Database
3. Navegue: `tenants` → `U11UvXr67vWnDtDpDaaJDTuEcxo2` → `collections` → `properties`
4. **Se estiver vazio:** Você precisa cadastrar propriedades primeiro

### **2. Verificar configuração do tenant:**
```bash
curl -X GET "http://localhost:8080/api/admin/tenant-mapping?tenantId=U11UvXr67vWnDtDpDaaJDTuEcxo2"
```

### **3. Verificar logs do servidor:**
- Procure por logs com `❌ [TenantAgent]` 
- Verifique se há erros de conexão com Firebase
- Procure por erros de importação de módulos

---

## 🎯 **TESTE RÁPIDO NO POSTMAN**

### **Collection Setup:**
1. **Base URL:** `http://localhost:8080`
2. **Headers globais:**
   ```
   Content-Type: application/json
   x-source: postman-debug
   ```

### **Ordem de teste:**
1. `GET /api/health` - Verificar se API está up
2. `POST /api/ai/functions/search-properties` - Obter property IDs
3. `POST /api/ai/functions/register-client` - Teste simples
4. `POST /api/ai/functions/calculate-price` - Com property ID válido
5. `POST /api/ai/functions/check-availability` - Com property ID válido
6. `POST /api/ai/functions/create-reservation` - Por último

---

## 🚨 **ERRO MAIS PROVÁVEL**

Com base nos códigos analisados, o erro mais provável é:

**❌ Não há propriedades cadastradas para este tenant**

### Para verificar:
1. Execute search-properties
2. Se retornar array vazio ou erro
3. Você precisa cadastrar propriedades primeiro

### Para cadastrar uma propriedade de teste:
```bash
curl -X POST http://localhost:8080/api/properties \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_TOKEN" \
  -d '{
    "name": "Apartamento Teste",
    "location": "Centro",
    "bedrooms": 1,
    "bathrooms": 1,
    "maxGuests": 2,
    "basePrice": 150.00,
    "available": true
  }'
```

---

**Execute os testes nesta ordem e me informe onde falha primeiro!**