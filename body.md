# 📋 GUIA DE BODY PARA FUNÇÕES API - LocAI

Este arquivo documenta o formato correto do body para cada endpoint da API LocAI.

## 🎯 **FUNÇÕES TESTADAS E FUNCIONAIS**

### ✅ 1. CHECK AVAILABILITY
**Endpoint:** `POST /api/ai/functions/check-availability`

```json
{
  "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
  "propertyId": "3g580gSc4PFbM8kxhQ0U",
  "checkIn": "2025-03-01",
  "checkOut": "2025-03-05"
}
```

**Tipos:**
- `tenantId`: string (obrigatório)
- `propertyId`: string (obrigatório)
- `checkIn`: string formato "YYYY-MM-DD" (obrigatório)
- `checkOut`: string formato "YYYY-MM-DD" (obrigatório)

### ✅ 2. GET POLICIES
**Endpoint:** `POST /api/ai/functions/get-policies`

```json
{
  "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
  "policyType": "cancellation"
}
```

**Tipos:**
- `tenantId`: string (obrigatório)
- `policyType`: "cancellation" | "payment" | "checkin" (obrigatório)

### ✅ 3. GET PROPERTY DETAILS
**Endpoint:** `POST /api/ai/functions/get-property-details`

```json
{
  "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
  "propertyId": "3g580gSc4PFbM8kxhQ0U"
}
```

**Tipos:**
- `tenantId`: string (obrigatório)
- `propertyId`: string (obrigatório)

### ✅ 4. SEARCH PROPERTIES
**Endpoint:** `POST /api/ai/functions/search-properties`

```json
{
  "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
  "location": "Centro",
  "guests": 2,
  "bedrooms": 1,
  "maxPrice": 1000,
  "checkIn": "2025-03-01",
  "checkOut": "2025-03-05"
}
```

**Tipos:**
- `tenantId`: string (obrigatório)
- `location`: string (opcional)
- `guests`: number (opcional)
- `bedrooms`: number (opcional)
- `maxPrice`: number (opcional)
- `checkIn`: string formato "YYYY-MM-DD" (opcional)
- `checkOut`: string formato "YYYY-MM-DD" (opcional)
- `amenities`: string[] (opcional)
- `propertyType`: string (opcional)

### ✅ 5. REGISTER CLIENT
**Endpoint:** `POST /api/ai/functions/register-client`

```json
{
  "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
  "name": "João Silva Santos",
  "phone": "+5511999887766",
  "email": "joao.silva@email.com",
  "document": "123.456.789-00"
}
```

**Tipos:**
- `tenantId`: string (obrigatório)
- `name`: string (obrigatório)
- `phone`: string (opcional)
- `email`: string (opcional)
- `document`: string (opcional)
- `whatsappNumber`: string (opcional)

### ✅ 6. CALCULATE PRICE
**Endpoint:** `POST /api/ai/functions/calculate-price`

```json
{
  "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
  "propertyId": "3g580gSc4PFbM8kxhQ0U",
  "checkIn": "2025-03-01",
  "checkOut": "2025-03-05",
  "guests": 2,
  "clientPhone": "+5511999887766"
}
```

**Tipos:**
- `tenantId`: string (obrigatório)
- `propertyId`: string (obrigatório)
- `checkIn`: string formato "YYYY-MM-DD" (obrigatório)
- `checkOut`: string formato "YYYY-MM-DD" (obrigatório)
- `guests`: number (opcional)
- `clientPhone`: string (opcional)

---

## 🔧 **FUNÇÕES COM VALIDAÇÃO FUNCIONANDO**

### ⚠️ 7. CREATE RESERVATION
**Endpoint:** `POST /api/ai/functions/create-reservation`

```json
{
  "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
  "propertyId": "3g580gSc4PFbM8kxhQ0U",
  "clientId": "Rq75gxc6MIGlHnbLAIiC",
  "clientName": "João Silva Santos",
  "clientPhone": "+5511999887766",
  "clientEmail": "joao.silva@email.com",
  "checkIn": "2025-03-01",
  "checkOut": "2025-03-05",
  "guests": 2,
  "totalPrice": 1540.00
}
```

**Tipos:**
- `tenantId`: string (obrigatório)
- `propertyId`: string (obrigatório)
- `clientId`: string (opcional)
- `clientPhone`: string (opcional)
- `clientName`: string (opcional)
- `clientEmail`: string (opcional)
- `checkIn`: string formato "YYYY-MM-DD" futuro (obrigatório)
- `checkOut`: string formato "YYYY-MM-DD" futuro (obrigatório)
- `guests`: number (obrigatório)
- `totalPrice`: number (opcional)

### ⚠️ 8. GENERATE QUOTE
**Endpoint:** `POST /api/ai/functions/generate-quote`

```json
{
  "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
  "propertyId": "3g580gSc4PFbM8kxhQ0U",
  "checkIn": "2025-03-01",
  "checkOut": "2025-03-05",
  "guests": 2,
  "includeDetails": true,
  "paymentMethod": "pix"
}
```

**Tipos:**
- `tenantId`: string (obrigatório)
- `propertyId`: string (obrigatório)
- `checkIn`: string formato "YYYY-MM-DD" futuro (obrigatório)
- `checkOut`: string formato "YYYY-MM-DD" futuro (obrigatório)
- `guests`: number (obrigatório)
- `includeDetails`: boolean (opcional)
- `paymentMethod`: "pix" | "credit_card" | "debit_card" | "bank_transfer" | "cash" (opcional)

### ⚠️ 9. SCHEDULE VISIT
**Endpoint:** `POST /api/ai/functions/schedule-visit`

```json
{
  "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
  "propertyId": "3g580gSc4PFbM8kxhQ0U",
  "clientId": "Rq75gxc6MIGlHnbLAIiC",
  "clientName": "João Silva Santos",
  "clientPhone": "+5511999887766",
  "visitDate": "2025-03-01",
  "visitTime": "15:00",
  "notes": "Cliente interessado, primeira visita"
}
```

**Tipos:**
- `tenantId`: string (obrigatório)
- `propertyId`: string (obrigatório)
- `clientId`: string (opcional)
- `clientName`: string (opcional)
- `clientPhone`: string (opcional)
- `visitDate`: string formato "YYYY-MM-DD" futuro (obrigatório)
- `visitTime`: string formato "HH:MM" (opcional)
- `notes`: string (opcional)

---

## 🔴 **FUNÇÕES COM ERROS TÉCNICOS**

### ❌ 10. CREATE LEAD
**Endpoint:** `POST /api/ai/functions/create-lead`

```json
{
  "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
  "clientPhone": "+5511888776655",
  "clientName": "Maria Oliveira",
  "source": "whatsapp",
  "interestedProperties": ["3g580gSc4PFbM8kxhQ0U"],
  "notes": "Lead interessado em apartamento vista mar"
}
```

**Tipos:**
- `tenantId`: string (obrigatório)
- `clientPhone`: string (obrigatório)
- `clientName`: string (opcional)
- `source`: "whatsapp" | "website" | "phone" | "email" (opcional)
- `interestedProperties`: string[] (opcional)
- `notes`: string (opcional)

**Status:** ❌ Erro: "Unsupported field value: undefined"

### ❌ 11. CLASSIFY LEAD
**Endpoint:** `POST /api/ai/functions/classify-lead`

```json
{
  "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
  "clientPhone": "+5511999887766",
  "interactionType": "whatsapp_inquiry",
  "sentiment": "positive",
  "interestedProperties": ["3g580gSc4PFbM8kxhQ0U"],
  "budget": 2000,
  "timeline": "próximos 30 dias"
}
```

**Tipos:**
- `tenantId`: string (obrigatório)
- `clientPhone`: string (obrigatório)
- `interactionType`: string (obrigatório)
- `sentiment`: "positive" | "neutral" | "negative" (opcional)
- `interestedProperties`: string[] (opcional)
- `budget`: number (opcional)
- `timeline`: string (opcional)
- `notes`: string (opcional)

**Status:** ❌ Erro: "serviceFactory.get is not a function"

### ❌ 12. UPDATE LEAD STATUS
**Endpoint:** `POST /api/ai/functions/update-lead-status`

```json
{
  "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
  "clientPhone": "+5511999887766",
  "newStatus": "qualified",
  "reason": "Cliente confirmou interesse",
  "notes": "Agendou visita para próxima semana"
}
```

**Tipos:**
- `tenantId`: string (obrigatório)
- `clientPhone`: string (obrigatório)
- `newStatus`: string (obrigatório)
- `reason`: string (opcional)
- `notes`: string (opcional)

---

## 📊 **DADOS VÁLIDOS DO SISTEMA**

### 🏢 **Tenant ID:**
```
U11UvXr67vWnDtDpDaaJDTuEcxo2
```

### 🏠 **Property ID:**
```
3g580gSc4PFbM8kxhQ0U (Apartamento Vista Mar)
```

### 👤 **Client ID:**
```
Rq75gxc6MIGlHnbLAIiC (João Silva Santos)
```

### 📞 **Phone Numbers:**
```
+5511999887766 (João Silva Santos - cliente existente)
+5511888776655 (Maria Oliveira - para testes de lead)
```

---

## 🚀 **COMANDOS CURL DE EXEMPLO**

### Testar check-availability:
```bash
curl -X POST http://localhost:8080/api/ai/functions/check-availability \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
    "propertyId": "3g580gSc4PFbM8kxhQ0U",
    "checkIn": "2025-03-01",
    "checkOut": "2025-03-05"
  }'
```

### Testar get-policies:
```bash
curl -X POST http://localhost:8080/api/ai/functions/get-policies \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "U11UvXr67vWnDtDpDaaJDTuEcxo2",
    "policyType": "cancellation"
  }'
```

---

## ⚠️ **OBSERVAÇÕES IMPORTANTES**

1. **Datas futuras**: Funções como `create-reservation` e `generate-quote` validam se as datas são futuras
2. **Formato de data**: Sempre use "YYYY-MM-DD" para datas
3. **Formato de hora**: Use "HH:MM" para horários
4. **Tenant ID**: Sempre obrigatório em todas as funções
5. **Property ID**: Use IDs válidos do sistema para testes reais
6. **Validação de telefone**: Use formato internacional (+55...)

## 🎯 **STATUS GERAL**

- ✅ **6 funções funcionando perfeitamente**
- ⚠️ **3 funções com validações corretas**
- ❌ **3 funções com erros técnicos para correção**

**Total: 12 funções documentadas**

---

*Documento gerado automaticamente em: 2025-08-26*  
*Sistema: LocAI - Agente Imobiliário Inteligente*