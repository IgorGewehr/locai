# 📚 API AI Functions - Documentação Completa

> **Endpoint Base:** `/api/ai/functions/`
> **Método:** `POST` (todas as funções)
> **Autenticação:** Não requerida (multi-tenant via `tenantId`)
> **Content-Type:** `application/json`

---

## 📋 Índice

- [Propriedades (Properties)](#-propriedades-properties)
- [Reservas (Reservations)](#-reservas-reservations)
- [Clientes (Clients)](#-clientes-clients)
- [CRM & Leads](#-crm--leads)
- [Transações Financeiras](#-transações-financeiras)
- [Metas & Performance](#-metas--performance)
- [Políticas & Informações](#-políticas--informações)
- [Métricas & Analytics](#-métricas--analytics)

---

## 🏠 Propriedades (Properties)

### 1. `search-properties`
Busca propriedades com filtros avançados.

**Endpoint:** `/api/ai/functions/search-properties`

**Body:**
```json
{
  "tenantId": "string (required)",
  "location": "string (optional)",
  "guests": "number (optional)",
  "bedrooms": "number (optional)",
  "bathrooms": "number (optional)",
  "checkIn": "YYYY-MM-DD (optional)",
  "checkOut": "YYYY-MM-DD (optional)",
  "maxPrice": "number (optional)",
  "minPrice": "number (optional)",
  "amenities": ["string"] (optional),
  "propertyType": "string (optional)",
  "hasPool": "boolean (optional)",
  "petFriendly": "boolean (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "properties": [
      {
        "id": "string",
        "title": "string",
        "price": "number",
        "bedrooms": "number",
        "bathrooms": "number",
        "maxGuests": "number",
        "photos": ["string"],
        "amenities": ["string"],
        "location": "string",
        "available": "boolean"
      }
    ],
    "total": "number",
    "filters": {}
  },
  "meta": {
    "requestId": "string",
    "processingTime": "number",
    "timestamp": "string"
  }
}
```

---

### 2. `get-property-details`
Retorna detalhes completos de uma propriedade.

**Endpoint:** `/api/ai/functions/get-property-details`

**Body:**
```json
{
  "tenantId": "string (required)",
  "propertyName": "string (required)",
  "propertyIndex": "number (optional)",
  "propertyReference": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "property": {
      "id": "string",
      "title": "string",
      "description": "string",
      "basePrice": "number",
      "cleaningFee": "number",
      "bedrooms": "number",
      "bathrooms": "number",
      "maxGuests": "number",
      "photos": ["string"],
      "amenities": ["string"],
      "address": "string",
      "location": "string",
      "policies": {},
      "availability": {}
    }
  },
  "meta": { ... }
}
```

---

### 3. `check-availability`
Verifica disponibilidade de uma propriedade para datas específicas.

**Endpoint:** `/api/ai/functions/check-availability`

**Body:**
```json
{
  "tenantId": "string (required)",
  "propertyName": "string (required)",
  "checkIn": "YYYY-MM-DD (required)",
  "checkOut": "YYYY-MM-DD (required)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "available": "boolean",
    "propertyName": "string",
    "checkIn": "string",
    "checkOut": "string",
    "nights": "number",
    "unavailableDates": ["string"],
    "reason": "string"
  },
  "meta": { ... }
}
```

---

### 4. `send-property-media`
Retorna URLs de fotos/vídeos de uma propriedade.

**Endpoint:** `/api/ai/functions/send-property-media`

**Body:**
```json
{
  "tenantId": "string (required)",
  "propertyName": "string (optional)",
  "propertyIndex": "number (optional)",
  "mediaType": "photos | videos | all (optional, default: all)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "propertyName": "string",
    "photos": ["string"],
    "videos": ["string"],
    "totalMedia": "number"
  },
  "meta": { ... }
}
```

---

### 5. `send-property-map`
Retorna informações de localização e mapa da propriedade.

**Endpoint:** `/api/ai/functions/send-property-map`

**Body:**
```json
{
  "tenantId": "string (required)",
  "propertyName": "string (required)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "propertyName": "string",
    "address": "string",
    "location": "string",
    "coordinates": {
      "latitude": "number",
      "longitude": "number"
    },
    "mapUrl": "string",
    "googleMapsUrl": "string"
  },
  "meta": { ... }
}
```

---

## 💰 Reservas (Reservations)

### 6. `calculate-price`
Calcula preço total com taxas, descontos e feriados brasileiros.

**Endpoint:** `/api/ai/functions/calculate-price`

**Body:**
```json
{
  "tenantId": "string (required)",
  "propertyName": "string (required)",
  "checkIn": "YYYY-MM-DD (required)",
  "checkOut": "YYYY-MM-DD (required)",
  "guests": "number (optional)",
  "clientPhone": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "propertyName": "string",
    "basePrice": "number",
    "nights": "number",
    "subtotal": "number",
    "cleaningFee": "number",
    "extraGuestFee": "number",
    "weekendSurcharge": "number",
    "holidaySurcharge": "number",
    "discounts": "number",
    "total": "number",
    "currency": "BRL",
    "breakdown": {
      "dailyPrices": [
        {
          "date": "string",
          "price": "number",
          "isWeekend": "boolean",
          "isHoliday": "boolean"
        }
      ]
    }
  },
  "meta": { ... }
}
```

---

### 7. `create-reservation`
Cria uma nova reserva completa.

**Endpoint:** `/api/ai/functions/create-reservation`

**Body:**
```json
{
  "tenantId": "string (required)",
  "propertyName": "string (required)",
  "clientPhone": "string (required)",
  "clientName": "string (optional)",
  "clientEmail": "string (optional)",
  "clientId": "string (optional)",
  "checkIn": "YYYY-MM-DD (required)",
  "checkOut": "YYYY-MM-DD (required)",
  "guests": "number (required)",
  "totalPrice": "number (optional, will be calculated)",
  "paymentMethod": "pix | credit_card | debit_card | bank_transfer (optional)",
  "notes": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reservationId": "string",
    "status": "pending | confirmed",
    "propertyName": "string",
    "clientName": "string",
    "checkIn": "string",
    "checkOut": "string",
    "guests": "number",
    "totalPrice": "number",
    "confirmationCode": "string",
    "createdAt": "string"
  },
  "meta": { ... }
}
```

---

### 8. `cancel-reservation`
Cancela uma reserva existente.

**Endpoint:** `/api/ai/functions/cancel-reservation`

**Body:**
```json
{
  "tenantId": "string (required)",
  "reservationId": "string (optional)",
  "clientPhone": "string (optional)",
  "reason": "string (optional)",
  "refundAmount": "number (optional)",
  "refundPercentage": "number (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reservationId": "string",
    "status": "cancelled",
    "cancellationReason": "string",
    "refundAmount": "number",
    "refundStatus": "pending | processed",
    "cancelledAt": "string"
  },
  "meta": { ... }
}
```

---

### 9. `modify-reservation`
Modifica datas, hóspedes ou preço de uma reserva.

**Endpoint:** `/api/ai/functions/modify-reservation`

**Body:**
```json
{
  "tenantId": "string (required)",
  "reservationId": "string (optional)",
  "clientPhone": "string (optional)",
  "updates": {
    "checkIn": "YYYY-MM-DD (optional)",
    "checkOut": "YYYY-MM-DD (optional)",
    "guests": "number (optional)",
    "totalPrice": "number (optional)",
    "status": "string (optional)",
    "notes": "string (optional)"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reservationId": "string",
    "updated": "boolean",
    "changes": {},
    "newTotalPrice": "number"
  },
  "meta": { ... }
}
```

---

## 👤 Clientes (Clients)

### 10. `register-client`
Registra um novo cliente no sistema.

**Endpoint:** `/api/ai/functions/register-client`

**Body:**
```json
{
  "tenantId": "string (required)",
  "name": "string (required)",
  "phone": "string (optional)",
  "email": "string (optional)",
  "document": "string (optional)",
  "whatsappNumber": "string (optional)",
  "address": "string (optional)",
  "notes": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "clientId": "string",
    "name": "string",
    "phone": "string",
    "email": "string",
    "isNew": "boolean",
    "createdAt": "string"
  },
  "meta": { ... }
}
```

---

## 📊 CRM & Leads

### 11. `create-lead`
Cria ou atualiza um lead com deduplicação automática.

**Endpoint:** `/api/ai/functions/create-lead`

**Body:**
```json
{
  "tenantId": "string (required)",
  "phone": "string (required)",
  "whatsappNumber": "string (optional)",
  "name": "string (optional)",
  "email": "string (optional)",
  "source": "whatsapp_ai | website | referral | social_media | manual (optional)",
  "sourceDetails": "string (optional)",
  "initialInteraction": "string (optional)",
  "preferences": {
    "propertyType": ["string"] (optional),
    "location": ["string"] (optional),
    "priceRange": {
      "min": "number",
      "max": "number"
    } (optional),
    "bedrooms": {
      "min": "number",
      "max": "number"
    } (optional)
  } (optional)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leadId": "string",
    "isNew": "boolean",
    "status": "new | contacted | qualified | etc",
    "score": "number",
    "temperature": "cold | warm | hot",
    "createdAt": "string"
  },
  "meta": { ... }
}
```

---

### 12. `get-lead-details`
Busca informações completas de um lead.

**Endpoint:** `/api/ai/functions/get-lead-details`

**Body:**
```json
{
  "tenantId": "string (required)",
  "leadId": "string (optional)",
  "clientPhone": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leadId": "string",
    "phone": "string",
    "name": "string",
    "email": "string",
    "status": "string",
    "score": "number",
    "temperature": "string",
    "source": "string",
    "interactions": "number",
    "lastInteraction": "string",
    "preferences": {},
    "tags": ["string"],
    "createdAt": "string",
    "updatedAt": "string"
  },
  "meta": { ... }
}
```

---

### 13. `get-leads-list`
Lista leads com filtros e paginação.

**Endpoint:** `/api/ai/functions/get-leads-list`

**Body:**
```json
{
  "tenantId": "string (required)",
  "status": "string (optional)",
  "temperature": "cold | warm | hot (optional)",
  "minScore": "number (optional)",
  "source": "string (optional)",
  "page": "number (optional, default: 1)",
  "limit": "number (optional, default: 20)",
  "sortBy": "score | createdAt | lastInteraction (optional)",
  "sortOrder": "asc | desc (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leads": [
      {
        "leadId": "string",
        "name": "string",
        "phone": "string",
        "status": "string",
        "score": "number",
        "temperature": "string",
        "lastInteraction": "string"
      }
    ],
    "pagination": {
      "page": "number",
      "limit": "number",
      "total": "number",
      "totalPages": "number"
    }
  },
  "meta": { ... }
}
```

---

### 14. `add-lead-interaction`
Registra interação com lead e atualiza score.

**Endpoint:** `/api/ai/functions/add-lead-interaction`

**Body:**
```json
{
  "tenantId": "string (required)",
  "leadId": "string (optional)",
  "clientPhone": "string (optional)",
  "type": "message | call | email | visit | meeting (required)",
  "channel": "whatsapp | phone | email | in_person (optional)",
  "content": "string (optional)",
  "sentiment": "positive | neutral | negative (optional)",
  "interestedProperties": ["string"] (optional),
  "notes": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "interactionId": "string",
    "leadId": "string",
    "scoreChange": "number",
    "newScore": "number",
    "newTemperature": "string",
    "createdAt": "string"
  },
  "meta": { ... }
}
```

---

### 15. `analyze-lead-performance`
Análise AI do desempenho e comportamento do lead.

**Endpoint:** `/api/ai/functions/analyze-lead-performance`

**Body:**
```json
{
  "tenantId": "string (required)",
  "leadId": "string (optional)",
  "clientPhone": "string (optional)",
  "includeRecommendations": "boolean (optional, default: true)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leadId": "string",
    "analysis": {
      "engagementLevel": "low | medium | high",
      "conversionProbability": "number (0-100)",
      "recommendedActions": ["string"],
      "bestContactTime": "string",
      "interests": ["string"],
      "concerns": ["string"]
    },
    "metrics": {
      "responseRate": "number",
      "avgResponseTime": "number",
      "totalInteractions": "number",
      "propertiesViewed": "number"
    }
  },
  "meta": { ... }
}
```

---

### 16. `follow-up-lead`
Agenda follow-up automático para um lead.

**Endpoint:** `/api/ai/functions/follow-up-lead`

**Body:**
```json
{
  "tenantId": "string (required)",
  "leadId": "string (optional)",
  "clientPhone": "string (optional)",
  "followUpType": "email | whatsapp | call (required)",
  "scheduledDate": "YYYY-MM-DD (optional)",
  "scheduledTime": "HH:MM (optional)",
  "message": "string (optional)",
  "priority": "low | medium | high (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "followUpId": "string",
    "leadId": "string",
    "type": "string",
    "scheduledFor": "string",
    "status": "scheduled",
    "createdAt": "string"
  },
  "meta": { ... }
}
```

---

### 17. `lead-pipeline-movement`
Move lead automaticamente no pipeline CRM.

**Endpoint:** `/api/ai/functions/lead-pipeline-movement`

**Body:**
```json
{
  "tenantId": "string (required)",
  "leadId": "string (optional)",
  "clientPhone": "string (optional)",
  "trigger": "first_contact | qualification | presentation | proposal | etc (required)",
  "metadata": {} (optional)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leadId": "string",
    "previousStatus": "string",
    "newStatus": "string",
    "autoMoved": "boolean",
    "reason": "string",
    "updatedAt": "string"
  },
  "meta": { ... }
}
```

---

### 18. `update-lead`
Atualiza informações de um lead.

**Endpoint:** `/api/ai/functions/update-lead`

**Body:**
```json
{
  "tenantId": "string (required)",
  "leadId": "string (optional)",
  "clientPhone": "string (optional)",
  "updates": {
    "name": "string (optional)",
    "email": "string (optional)",
    "status": "string (optional)",
    "score": "number (optional)",
    "temperature": "cold | warm | hot (optional)",
    "clientId": "string (optional)",
    "preferences": {} (optional),
    "tags": ["string"] (optional),
    "notes": "string (optional)"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leadId": "string",
    "updated": "boolean",
    "changes": {},
    "updatedAt": "string"
  },
  "meta": { ... }
}
```

---

### 19. `update-lead-status`
Atualiza apenas o status do lead no pipeline.

**Endpoint:** `/api/ai/functions/update-lead-status`

**Body:**
```json
{
  "tenantId": "string (required)",
  "clientPhone": "string (required)",
  "newStatus": "new | contacted | qualified | presentation | proposal | negotiation | closing | won | lost (required)",
  "reason": "string (optional)",
  "notes": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leadId": "string",
    "previousStatus": "string",
    "newStatus": "string",
    "updatedAt": "string"
  },
  "meta": { ... }
}
```

---

### 20. `classify-lead`
Classifica lead automaticamente (hot/warm/cold).

**Endpoint:** `/api/ai/functions/classify-lead`

**Body:**
```json
{
  "tenantId": "string (required)",
  "clientPhone": "string (required)",
  "interactionType": "string (required)",
  "sentiment": "positive | neutral | negative (optional)",
  "interestedProperties": ["string"] (optional),
  "budget": "number (optional)",
  "timeline": "string (optional)",
  "notes": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "leadId": "string",
    "classification": "hot | warm | cold",
    "score": "number",
    "factors": ["string"],
    "updatedAt": "string"
  },
  "meta": { ... }
}
```

---

## 💳 Transações Financeiras

### 21. `create-transaction`
Cria transação financeira vinculada à reserva.

**Endpoint:** `/api/ai/functions/create-transaction`

**Body:**
```json
{
  "tenantId": "string (required)",
  "reservationId": "string (required)",
  "clientId": "string (required)",
  "propertyId": "string (required)",
  "totalAmount": "number (required)",
  "paymentMethod": "pix | credit_card | debit_card | bank_transfer | cash (required)",
  "advancePaymentPercentage": "number (optional, ex: 10 para 10%)",
  "notes": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactionId": "string",
    "reservationId": "string",
    "totalAmount": "number",
    "advanceAmount": "number",
    "remainingAmount": "number",
    "paymentMethod": "string",
    "status": "pending | completed",
    "createdAt": "string"
  },
  "meta": { ... }
}
```

---

### 22. `generate-quote`
Gera orçamento formal para cliente.

**Endpoint:** `/api/ai/functions/generate-quote`

**Body:**
```json
{
  "tenantId": "string (required)",
  "propertyId": "string (required)",
  "checkIn": "YYYY-MM-DD (required)",
  "checkOut": "YYYY-MM-DD (required)",
  "guests": "number (required)",
  "includeDetails": "boolean (optional, default: true)",
  "paymentMethod": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "quoteId": "string",
    "propertyName": "string",
    "checkIn": "string",
    "checkOut": "string",
    "guests": "number",
    "pricing": {
      "basePrice": "number",
      "cleaningFee": "number",
      "taxes": "number",
      "total": "number"
    },
    "details": "string (formatted quote text)",
    "validUntil": "string",
    "generatedAt": "string"
  },
  "meta": { ... }
}
```

---

## 🎯 Metas & Performance

### 23. `create-goal`
Cria meta de negócio.

**Endpoint:** `/api/ai/functions/create-goal`

**Body:**
```json
{
  "tenantId": "string (required)",
  "title": "string (required)",
  "type": "revenue | bookings | occupancy | conversion (required)",
  "targetValue": "number (required)",
  "currentValue": "number (optional, default: 0)",
  "deadline": "YYYY-MM-DD (required)",
  "description": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "goalId": "string",
    "title": "string",
    "type": "string",
    "targetValue": "number",
    "currentValue": "number",
    "progress": "number (percentage)",
    "deadline": "string",
    "status": "active | completed | overdue",
    "createdAt": "string"
  },
  "meta": { ... }
}
```

---

### 24. `update-goal-progress`
Atualiza progresso de uma meta.

**Endpoint:** `/api/ai/functions/update-goal-progress`

**Body:**
```json
{
  "tenantId": "string (required)",
  "goalId": "string (required)",
  "incrementValue": "number (optional)",
  "newValue": "number (optional)",
  "notes": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "goalId": "string",
    "previousValue": "number",
    "currentValue": "number",
    "progress": "number (percentage)",
    "status": "string",
    "updatedAt": "string"
  },
  "meta": { ... }
}
```

---

### 25. `analyze-performance`
Análise geral de performance do negócio.

**Endpoint:** `/api/ai/functions/analyze-performance`

**Body:**
```json
{
  "tenantId": "string (required)",
  "period": "week | month | quarter | year (optional, default: month)",
  "startDate": "YYYY-MM-DD (optional)",
  "endDate": "YYYY-MM-DD (optional)",
  "metrics": ["revenue", "bookings", "occupancy", "conversion"] (optional)
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "period": "string",
    "metrics": {
      "revenue": {
        "current": "number",
        "previous": "number",
        "change": "number (percentage)"
      },
      "bookings": {},
      "occupancy": {},
      "conversion": {}
    },
    "insights": ["string"],
    "recommendations": ["string"]
  },
  "meta": { ... }
}
```

---

## 📋 Políticas & Informações

### 26. `get-policies`
Retorna políticas de cancelamento, pagamento, check-in, etc.

**Endpoint:** `/api/ai/functions/get-policies`

**Body:**
```json
{
  "tenantId": "string (required)",
  "policyType": "cancellation | payment | check_in | general | all (optional, default: all)",
  "propertyId": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "cancellation": {
      "policy": "string",
      "refundRules": [
        {
          "daysBeforeCheckIn": "number",
          "refundPercentage": "number"
        }
      ]
    },
    "payment": {
      "methods": ["string"],
      "advancePayment": "number (percentage)",
      "fullPaymentDeadline": "string"
    },
    "checkIn": {
      "time": "HH:MM",
      "instructions": "string"
    },
    "checkOut": {
      "time": "HH:MM",
      "instructions": "string"
    },
    "general": ["string"]
  },
  "meta": { ... }
}
```

---

## 📅 Agenda & Visitas

### 27. `schedule-visit`
Agenda visita a uma propriedade.

**Endpoint:** `/api/ai/functions/schedule-visit`

**Body:**
```json
{
  "tenantId": "string (required)",
  "propertyId": "string (required)",
  "clientName": "string (required)",
  "clientPhone": "string (required)",
  "clientId": "string (optional)",
  "visitDate": "YYYY-MM-DD (required)",
  "visitTime": "HH:MM (optional)",
  "notes": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "visitId": "string",
    "propertyName": "string",
    "clientName": "string",
    "visitDate": "string",
    "visitTime": "string",
    "status": "scheduled",
    "createdAt": "string"
  },
  "meta": { ... }
}
```

---

### 28. `check-visit-availability`
Verifica horários disponíveis para visitas.

**Endpoint:** `/api/ai/functions/check-visit-availability`

**Body:**
```json
{
  "tenantId": "string (required)",
  "propertyId": "string (required)",
  "date": "YYYY-MM-DD (required)",
  "preferredTime": "HH:MM (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "string",
    "availableSlots": ["HH:MM"],
    "bookedSlots": ["HH:MM"],
    "recommended": "HH:MM"
  },
  "meta": { ... }
}
```

---

### 29. `check-agenda-availability`
Verifica disponibilidade da agenda geral (todas as propriedades).

**Endpoint:** `/api/ai/functions/check-agenda-availability`

**Body:**
```json
{
  "tenantId": "string (required)",
  "year": "number (required, ex: 2025)",
  "month": "number (required, 1-12)",
  "day": "number (optional, retorna apenas esse dia)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "date": "string (se day fornecido)",
    "month": "string (se day não fornecido)",
    "occupiedSlots": [
      {
        "id": "string",
        "date": "YYYY-MM-DD",
        "startTime": "HH:MM",
        "endTime": "HH:MM",
        "duration": "number (minutos)",
        "title": "string",
        "clientName": "string",
        "clientPhone": "string",
        "type": "meeting | visit | blocked",
        "status": "string",
        "notes": "string"
      }
    ],
    "totalOccupied": "number",
    "availableSuggestions": ["HH:MM"],
    "workingHours": {
      "start": "HH:MM",
      "end": "HH:MM",
      "lunchBreak": {
        "start": "HH:MM",
        "end": "HH:MM"
      }
    }
  },
  "meta": { ... }
}
```

---

### 30. `schedule-meeting`
Agenda reunião, visita ou retirada de chaves.

**Endpoint:** `/api/ai/functions/schedule-meeting`

**Body:**
```json
{
  "tenantId": "string (required)",
  "type": "meeting | visit | pickup (required)",
  "clientName": "string (required)",
  "clientPhone": "string (required)",
  "date": "YYYY-MM-DD (required)",
  "time": "HH:MM (required)",
  "duration": "number (minutos, optional, default: 60)",
  "propertyId": "string (optional)",
  "notes": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "meetingId": "string",
    "type": "string",
    "clientName": "string",
    "date": "string",
    "time": "string",
    "duration": "number",
    "status": "scheduled",
    "createdAt": "string"
  },
  "meta": { ... }
}
```

---

## 📊 Métricas & Analytics

### 31. `track-metrics`
Registra métrica customizada.

**Endpoint:** `/api/ai/functions/track-metrics`

**Body:**
```json
{
  "tenantId": "string (required)",
  "metricType": "string (required)",
  "value": "number (required)",
  "metadata": {} (optional),
  "timestamp": "string (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "metricId": "string",
    "type": "string",
    "value": "number",
    "recorded": "boolean",
    "timestamp": "string"
  },
  "meta": { ... }
}
```

---

### 32. `get-analytics-dashboard`
Retorna dashboard completo de analytics.

**Endpoint:** `/api/ai/functions/get-analytics-dashboard`

**Body:**
```json
{
  "tenantId": "string (required)",
  "period": "today | week | month | quarter | year (optional, default: month)",
  "includeCharts": "boolean (optional, default: false)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalRevenue": "number",
      "totalBookings": "number",
      "occupancyRate": "number",
      "averageBookingValue": "number",
      "conversionRate": "number"
    },
    "trends": {},
    "topProperties": [],
    "topClients": [],
    "charts": [] (if includeCharts: true)
  },
  "meta": { ... }
}
```

---

### 33. `get-business-insights`
Insights AI sobre o negócio.

**Endpoint:** `/api/ai/functions/get-business-insights`

**Body:**
```json
{
  "tenantId": "string (required)",
  "focusArea": "revenue | bookings | leads | operations | all (optional, default: all)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "insights": [
      {
        "type": "opportunity | warning | success",
        "title": "string",
        "description": "string",
        "impact": "high | medium | low",
        "actionable": "boolean",
        "recommendations": ["string"]
      }
    ],
    "score": "number (0-100)",
    "generatedAt": "string"
  },
  "meta": { ... }
}
```

---

### 34-38. `track-conversation-*`
Funções de tracking de conversação:

- `track-conversation-metric` - Métricas de conversa
- `track-conversation-session` - Sessões de conversa
- `track-conversion-step` - Steps de conversão
- `track-message-engagement` - Engajamento de mensagens
- `track-qualification-milestone` - Milestones de qualificação

**(Body e Response similares, ajustados por contexto)**

---

### 39. `generate-report`
Gera relatório customizado.

**Endpoint:** `/api/ai/functions/generate-report`

**Body:**
```json
{
  "tenantId": "string (required)",
  "reportType": "financial | bookings | leads | properties (required)",
  "startDate": "YYYY-MM-DD (required)",
  "endDate": "YYYY-MM-DD (required)",
  "format": "json | pdf | csv (optional, default: json)",
  "includeCharts": "boolean (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "string",
    "type": "string",
    "period": {
      "start": "string",
      "end": "string"
    },
    "data": {},
    "summary": {},
    "downloadUrl": "string (if format: pdf | csv)",
    "generatedAt": "string"
  },
  "meta": { ... }
}
```

---

### 40. `create-task` & `update-task`
Gerenciamento de tarefas/lembretes.

**Endpoints:**
- `/api/ai/functions/create-task`
- `/api/ai/functions/update-task`

**Body (create-task):**
```json
{
  "tenantId": "string (required)",
  "leadId": "string (optional)",
  "clientId": "string (optional)",
  "title": "string (required)",
  "description": "string (optional)",
  "dueDate": "YYYY-MM-DD (optional)",
  "priority": "low | medium | high (optional)",
  "type": "follow_up | reminder | action (optional)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "string",
    "title": "string",
    "status": "pending",
    "priority": "string",
    "dueDate": "string",
    "createdAt": "string"
  },
  "meta": { ... }
}
```

---

## 🔑 Padrões Gerais

### Headers Recomendados
```
Content-Type: application/json
x-source: whatsapp_ai | web | mobile | n8n
User-Agent: SofiaAgent/1.0
```

### Resposta Padrão de Erro
```json
{
  "success": false,
  "error": "Error message",
  "requestId": "string",
  "details": "string (only in development)"
}
```

### Status Codes
- `200` - Sucesso
- `400` - Bad Request (tenantId faltando, parâmetros inválidos)
- `404` - Not Found (recurso não encontrado)
- `500` - Internal Server Error

---

## 📝 Notas Importantes

1. **TenantId**: Obrigatório em TODAS as funções para isolamento multi-tenant
2. **PropertyName vs PropertyId**: Funções usam `propertyName` (título) em vez de ID para facilitar uso pelo AI
3. **Phone Format**: Aceita vários formatos, normalização automática
4. **Dates**: Sempre em formato `YYYY-MM-DD` (ISO 8601)
5. **Times**: Sempre em formato `HH:MM` (24 horas)
6. **Currency**: Sempre BRL (Real Brasileiro)
7. **Deduplicação**: Funções como `create-lead` e `register-client` fazem deduplicação automática
8. **Logging**: Todas as funções têm logging estruturado para debugging

---

## 🚀 Exemplo de Uso Completo

```bash
# 1. Buscar propriedades
curl -X POST https://alugazap.com/api/ai/functions/search-properties \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant123",
    "location": "Praia Grande",
    "bedrooms": 3,
    "guests": 6,
    "checkIn": "2025-12-20",
    "checkOut": "2025-12-27"
  }'

# 2. Calcular preço
curl -X POST https://alugazap.com/api/ai/functions/calculate-price \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant123",
    "propertyName": "Casa Beira Mar",
    "checkIn": "2025-12-20",
    "checkOut": "2025-12-27",
    "guests": 6
  }'

# 3. Criar lead
curl -X POST https://alugazap.com/api/ai/functions/create-lead \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant123",
    "phone": "+5511999999999",
    "name": "João Silva",
    "source": "whatsapp_ai",
    "initialInteraction": "Perguntou sobre casa para 6 pessoas"
  }'

# 4. Criar reserva
curl -X POST https://alugazap.com/api/ai/functions/create-reservation \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "tenant123",
    "propertyName": "Casa Beira Mar",
    "clientPhone": "+5511999999999",
    "clientName": "João Silva",
    "checkIn": "2025-12-20",
    "checkOut": "2025-12-27",
    "guests": 6
  }'
```

---

**Versão:** 1.0
**Última Atualização:** Outubro 2025
**Suporte:** https://alugazap.com/docs
