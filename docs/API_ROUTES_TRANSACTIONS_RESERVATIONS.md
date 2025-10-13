# API Routes: Transactions & Reservations

Complete CRUD API endpoints for Transactions and Reservations, following the same patterns as Properties and Clients APIs.

## Table of Contents

- [Transactions API](#transactions-api)
- [Reservations API](#reservations-api)
- [Authentication](#authentication)
- [Error Handling](#error-handling)
- [Testing](#testing)

---

## Transactions API

Base URL: `/api/transactions`

### List All Transactions

**Endpoint:** `GET /api/transactions`

**Query Parameters:**
- `page` (number, default: 1) - Page number for pagination
- `limit` (number, default: 10) - Items per page
- `search` (string) - Search in description, notes, and ID
- `type` (string) - Filter by type: `income` | `expense`
- `status` (string) - Filter by status: `pending` | `completed` | `cancelled`
- `category` (string) - Filter by category: `reservation` | `maintenance` | `cleaning` | `commission` | `refund` | `other`
- `paymentMethod` (string) - Filter by payment method: `stripe` | `pix` | `cash` | `bank_transfer` | `credit_card` | `debit_card`
- `startDate` (ISO date) - Filter transactions from this date
- `endDate` (ISO date) - Filter transactions until this date
- `reservationId` (string) - Filter by reservation ID
- `clientId` (string) - Filter by client ID
- `propertyId` (string) - Filter by property ID

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "txn_123",
      "amount": 150.00,
      "type": "income",
      "status": "completed",
      "description": "Payment for reservation #456",
      "category": "reservation",
      "paymentMethod": "pix",
      "date": "2025-10-15T00:00:00.000Z",
      "reservationId": "res_456",
      "clientId": "cli_789",
      "propertyId": "prop_012",
      "notes": "Paid via PIX",
      "tags": ["rental", "october"],
      "createdByAI": false,
      "createdAt": "2025-10-15T10:30:00.000Z",
      "updatedAt": "2025-10-15T10:30:00.000Z",
      "tenantId": "tenant_001"
    }
  ],
  "totals": {
    "income": 1500.00,
    "expense": 300.00,
    "pending": 200.00
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "totalPages": 3
  }
}
```

---

### Create Transaction

**Endpoint:** `POST /api/transactions`

**Request Body:**
```json
{
  "amount": 150.00,
  "type": "income",
  "status": "pending",
  "description": "Payment for reservation #456",
  "category": "reservation",
  "subcategory": "rental_payment",
  "paymentMethod": "pix",
  "date": "2025-10-15T00:00:00.000Z",
  "reservationId": "res_456",
  "clientId": "cli_789",
  "propertyId": "prop_012",
  "isRecurring": false,
  "recurringType": "monthly",
  "recurringEndDate": "2026-10-15T00:00:00.000Z",
  "notes": "Payment received via PIX",
  "tags": ["rental", "october"],
  "createdByAI": false,
  "aiConversationId": "conv_123"
}
```

**Required Fields:**
- `amount` (number) - Must be positive
- `type` (string) - `income` or `expense`
- `description` (string) - 3-500 characters
- `category` (string) - One of: `reservation`, `maintenance`, `cleaning`, `commission`, `refund`, `other`
- `paymentMethod` (string) - One of: `stripe`, `pix`, `cash`, `bank_transfer`, `credit_card`, `debit_card`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "txn_123",
    "amount": 150.00,
    "type": "income",
    "status": "pending",
    "description": "Payment for reservation #456",
    "category": "reservation",
    "paymentMethod": "pix",
    "date": "2025-10-15T00:00:00.000Z",
    "createdAt": "2025-10-15T10:30:00.000Z",
    "updatedAt": "2025-10-15T10:30:00.000Z",
    "tenantId": "tenant_001"
  },
  "message": "Transação criada com sucesso"
}
```

---

### Get Transaction by ID

**Endpoint:** `GET /api/transactions/:id`

**Query Parameters:**
- `include` (string) - Comma-separated relations: `client`, `property`, `reservation`

**Example:** `GET /api/transactions/txn_123?include=client,property,reservation`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "txn_123",
    "amount": 150.00,
    "type": "income",
    "status": "completed",
    "description": "Payment for reservation #456",
    "category": "reservation",
    "paymentMethod": "pix",
    "date": "2025-10-15T00:00:00.000Z",
    "client": {
      "id": "cli_789",
      "name": "João Silva",
      "phone": "+5511999999999"
    },
    "property": {
      "id": "prop_012",
      "title": "Apartamento Centro",
      "address": "Rua Principal, 123"
    },
    "reservation": {
      "id": "res_456",
      "checkIn": "2025-10-15T00:00:00.000Z",
      "checkOut": "2025-10-20T00:00:00.000Z"
    }
  }
}
```

---

### Update Transaction

**Endpoint:** `PUT /api/transactions/:id`

**Request Body:** (All fields optional)
```json
{
  "amount": 150.00,
  "type": "income",
  "status": "completed",
  "description": "Updated description",
  "category": "reservation",
  "subcategory": "rental_payment",
  "paymentMethod": "pix",
  "date": "2025-10-15T00:00:00.000Z",
  "notes": "Updated notes",
  "tags": ["rental", "updated"],
  "confirmedBy": "admin_user_id",
  "confirmedAt": "2025-10-15T12:00:00.000Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "txn_123",
    "amount": 150.00,
    "status": "completed",
    "updatedAt": "2025-10-15T12:00:00.000Z"
  },
  "message": "Transação atualizada com sucesso"
}
```

---

### Delete Transaction

**Endpoint:** `DELETE /api/transactions/:id`

**Query Parameters:**
- `soft` (boolean, default: true) - If true, marks as cancelled instead of deleting

**Soft Delete (Cancel):**
```
DELETE /api/transactions/txn_123?soft=true
```

**Response:**
```json
{
  "success": true,
  "message": "Transação cancelada com sucesso"
}
```

**Hard Delete:**
```
DELETE /api/transactions/txn_123?soft=false
```

**Response:**
```json
{
  "success": true,
  "message": "Transação excluída com sucesso"
}
```

---

## Reservations API

Base URL: `/api/reservations`

### List All Reservations

**Endpoint:** `GET /api/reservations`

**Query Parameters:**
- `page` (number, default: 1) - Page number for pagination
- `limit` (number, default: 10) - Items per page
- `search` (string) - Search in ID, special requests, observations
- `status` (string) - Filter by status: `pending` | `confirmed` | `checked_in` | `checked_out` | `cancelled` | `no_show`
- `paymentStatus` (string) - Filter by payment status: `pending` | `paid` | `overdue` | `cancelled` | `refunded` | `partial`
- `source` (string) - Filter by source: `whatsapp_ai` | `manual` | `website` | `phone` | `email`
- `propertyId` (string) - Filter by property ID
- `clientId` (string) - Filter by client ID
- `startDate` (ISO date) - Filter reservations from this check-in date
- `endDate` (ISO date) - Filter reservations until this check-in date
- `include` (string) - Comma-separated relations: `property`, `client`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "res_456",
      "propertyId": "prop_012",
      "clientId": "cli_789",
      "status": "confirmed",
      "checkIn": "2025-10-15T14:00:00.000Z",
      "checkOut": "2025-10-20T11:00:00.000Z",
      "guests": 2,
      "nights": 5,
      "totalAmount": 750.00,
      "paidAmount": 375.00,
      "pendingAmount": 375.00,
      "paymentMethod": "pix",
      "paymentStatus": "partial",
      "source": "manual",
      "specialRequests": "Early check-in if possible",
      "observations": "VIP client",
      "guestDetails": [
        {
          "id": "guest_1",
          "name": "João Silva",
          "document": "12345678900",
          "documentType": "cpf",
          "isMainGuest": true
        }
      ],
      "extraServices": [],
      "createdAt": "2025-10-01T10:00:00.000Z",
      "updatedAt": "2025-10-01T10:00:00.000Z",
      "tenantId": "tenant_001"
    }
  ],
  "stats": {
    "total": 50,
    "pending": 5,
    "confirmed": 30,
    "checkedIn": 10,
    "checkedOut": 3,
    "cancelled": 2,
    "totalRevenue": 15000.00,
    "pendingRevenue": 3000.00
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "totalPages": 5
  }
}
```

---

### Create Reservation

**Endpoint:** `POST /api/reservations`

**Request Body:**
```json
{
  "propertyId": "prop_012",
  "clientId": "cli_789",
  "checkIn": "2025-10-15T14:00:00.000Z",
  "checkOut": "2025-10-20T11:00:00.000Z",
  "guests": 2,
  "totalAmount": 750.00,
  "paidAmount": 0,
  "status": "pending",
  "paymentStatus": "pending",
  "paymentMethod": "pix",
  "source": "manual",
  "specialRequests": "Early check-in requested",
  "observations": "First-time guest",
  "guestDetails": [
    {
      "name": "João Silva",
      "document": "12345678900",
      "documentType": "cpf",
      "phone": "+5511999999999",
      "email": "joao@example.com",
      "isMainGuest": true
    }
  ],
  "extraServices": [
    {
      "name": "Airport Transfer",
      "description": "Round trip",
      "price": 100.00,
      "quantity": 1,
      "total": 100.00,
      "category": "transport"
    }
  ],
  "paymentPlan": {
    "totalAmount": 750.00,
    "paymentMethod": "pix",
    "feePercentage": 0,
    "totalFees": 0,
    "installments": [
      {
        "number": 1,
        "amount": 375.00,
        "dueDate": "2025-10-01T00:00:00.000Z",
        "description": "50% deposit",
        "isPaid": false
      },
      {
        "number": 2,
        "amount": 375.00,
        "dueDate": "2025-10-15T00:00:00.000Z",
        "description": "Final payment",
        "isPaid": false
      }
    ]
  }
}
```

**Required Fields:**
- `propertyId` (string) - Must be a valid property ID
- `clientId` (string) - Must be a valid client ID
- `checkIn` (ISO date) - Check-in date
- `checkOut` (ISO date) - Check-out date (must be after check-in)
- `guests` (number) - Number of guests (min: 1, max: property capacity)
- `totalAmount` (number) - Total amount (min: 0)

**Validation:**
- Check-out must be after check-in
- Number of guests must not exceed property capacity
- Property and client must exist

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "res_456",
    "propertyId": "prop_012",
    "clientId": "cli_789",
    "status": "pending",
    "checkIn": "2025-10-15T14:00:00.000Z",
    "checkOut": "2025-10-20T11:00:00.000Z",
    "guests": 2,
    "nights": 5,
    "totalAmount": 750.00,
    "paidAmount": 0,
    "pendingAmount": 750.00,
    "createdAt": "2025-10-01T10:00:00.000Z",
    "updatedAt": "2025-10-01T10:00:00.000Z",
    "tenantId": "tenant_001"
  },
  "message": "Reserva criada com sucesso"
}
```

---

### Get Reservation by ID

**Endpoint:** `GET /api/reservations/:id`

**Query Parameters:**
- `include` (string) - Comma-separated relations: `client`, `property`, `transactions`

**Example:** `GET /api/reservations/res_456?include=client,property,transactions`

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "res_456",
    "propertyId": "prop_012",
    "clientId": "cli_789",
    "status": "confirmed",
    "checkIn": "2025-10-15T14:00:00.000Z",
    "checkOut": "2025-10-20T11:00:00.000Z",
    "guests": 2,
    "nights": 5,
    "totalAmount": 750.00,
    "client": {
      "id": "cli_789",
      "name": "João Silva",
      "phone": "+5511999999999"
    },
    "property": {
      "id": "prop_012",
      "title": "Apartamento Centro",
      "address": "Rua Principal, 123",
      "maxGuests": 4
    },
    "transactions": [
      {
        "id": "txn_123",
        "amount": 375.00,
        "type": "income",
        "status": "completed",
        "description": "Deposit payment"
      }
    ]
  }
}
```

---

### Update Reservation

**Endpoint:** `PUT /api/reservations/:id`

**Request Body:** (All fields optional)
```json
{
  "checkIn": "2025-10-16T14:00:00.000Z",
  "checkOut": "2025-10-21T11:00:00.000Z",
  "guests": 3,
  "totalAmount": 900.00,
  "paidAmount": 450.00,
  "status": "confirmed",
  "paymentStatus": "partial",
  "specialRequests": "Updated: Late check-out needed",
  "observations": "Client confirmed by phone",
  "guestDetails": [
    {
      "name": "João Silva",
      "document": "12345678900",
      "documentType": "cpf",
      "isMainGuest": true
    },
    {
      "name": "Maria Silva",
      "document": "98765432100",
      "documentType": "cpf",
      "isMainGuest": false
    }
  ]
}
```

**Validation:**
- Check-out must be after check-in (if either is updated)
- Number of guests must not exceed property capacity
- Pending amount is automatically recalculated if totalAmount or paidAmount changes

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "res_456",
    "status": "confirmed",
    "checkIn": "2025-10-16T14:00:00.000Z",
    "checkOut": "2025-10-21T11:00:00.000Z",
    "guests": 3,
    "nights": 5,
    "totalAmount": 900.00,
    "paidAmount": 450.00,
    "pendingAmount": 450.00,
    "updatedAt": "2025-10-01T14:30:00.000Z"
  },
  "message": "Reserva atualizada com sucesso"
}
```

---

### Delete Reservation

**Endpoint:** `DELETE /api/reservations/:id`

**Query Parameters:**
- `soft` (boolean, default: true) - If true, marks as cancelled instead of deleting

**Soft Delete (Cancel) - DEFAULT:**
```
DELETE /api/reservations/res_456
```
or
```
DELETE /api/reservations/res_456?soft=true
```

**Response:**
```json
{
  "success": true,
  "message": "Reserva cancelada com sucesso"
}
```

**Hard Delete:**
```
DELETE /api/reservations/res_456?soft=false
```

**Response:**
```json
{
  "success": true,
  "message": "Reserva excluída com sucesso"
}
```

---

## Authentication

All endpoints require Firebase authentication.

**Headers:**
```
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

**How to get Firebase ID token:**
```javascript
import { auth } from '@/lib/firebase/config'

const user = auth.currentUser
const token = await user.getIdToken()

// Use token in API requests
fetch('/api/transactions', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

**Tenant Isolation:**
All data is automatically scoped to the authenticated user's tenant. The `tenantId` is extracted from the Firebase token and used to create tenant-scoped services.

---

## Error Handling

All endpoints return consistent error responses:

**Validation Error (400):**
```json
{
  "error": "Dados inválidos",
  "code": "VALIDATION_ERROR",
  "details": {
    "fieldErrors": {
      "amount": ["Valor deve ser positivo"],
      "description": ["Descrição deve ter pelo menos 3 caracteres"]
    }
  }
}
```

**Authentication Error (401):**
```json
{
  "error": "Authentication required",
  "code": "UNAUTHORIZED"
}
```

**Not Found Error (404):**
```json
{
  "error": "Transação não encontrada",
  "code": "NOT_FOUND"
}
```

**Server Error (500):**
```json
{
  "error": "Internal server error",
  "code": "INTERNAL_ERROR",
  "details": "Error description"
}
```

---

## Testing

### Manual Testing with curl

**Create Transaction:**
```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 150.00,
    "type": "income",
    "description": "Test transaction",
    "category": "reservation",
    "paymentMethod": "pix",
    "status": "pending"
  }'
```

**List Transactions:**
```bash
curl -X GET "http://localhost:3000/api/transactions?page=1&limit=10" \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN"
```

**Create Reservation:**
```bash
curl -X POST http://localhost:3000/api/reservations \
  -H "Authorization: Bearer YOUR_FIREBASE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "propertyId": "PROPERTY_ID",
    "clientId": "CLIENT_ID",
    "checkIn": "2025-12-01T14:00:00.000Z",
    "checkOut": "2025-12-05T11:00:00.000Z",
    "guests": 2,
    "totalAmount": 500.00,
    "paidAmount": 0,
    "status": "pending",
    "paymentStatus": "pending",
    "paymentMethod": "pix",
    "source": "manual",
    "guestDetails": []
  }'
```

### Automated Testing

Run the test script:
```bash
# Set your Firebase auth token
export TEST_AUTH_TOKEN="your-firebase-id-token"

# Run tests
node scripts/test-api-routes.js
```

See `scripts/test-api-routes.js` for a complete test suite.

---

## Migration from Direct Firestore Access

If your frontend code currently accesses Firestore directly for transactions and reservations, migrate to use these API routes:

**Before (Direct Firestore):**
```javascript
const services = new TenantServiceFactory(tenantId)
const transactions = await services.transactions.getAll()
```

**After (API Route):**
```javascript
const response = await fetch('/api/transactions', {
  headers: {
    'Authorization': `Bearer ${await auth.currentUser.getIdToken()}`,
  }
})
const { data } = await response.json()
```

**Benefits:**
- ✅ Consistent validation and error handling
- ✅ Automatic authentication and tenant isolation
- ✅ Professional API structure
- ✅ Easy to extend with additional features
- ✅ Better security (business logic on server)
- ✅ Easier to test and maintain

---

## Implementation Notes

1. **Tenant Isolation**: All operations are automatically scoped to the authenticated user's tenant
2. **Input Sanitization**: All text fields are sanitized to prevent XSS attacks
3. **Validation**: Comprehensive Zod schemas ensure data integrity
4. **Related Data**: Use `include` query parameter to load related entities in a single request
5. **Pagination**: All list endpoints support pagination for better performance
6. **Soft Deletes**: Transactions and reservations can be soft-deleted (marked as cancelled) instead of hard-deleted
7. **Professional Logging**: All errors are logged using the structured logger
8. **Type Safety**: Full TypeScript support with proper type definitions

---

## Next Steps

1. Update frontend components to use API routes instead of direct Firestore access
2. Add custom hooks for API calls (e.g., `useTransactions`, `useReservations`)
3. Implement caching layer for frequently accessed data
4. Add real-time updates using WebSockets or Server-Sent Events
5. Create admin dashboard for transaction and reservation management

---

**Created:** October 2025
**Last Updated:** October 2025
**Version:** 1.0.0
