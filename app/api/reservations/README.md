# Reservation API Documentation

## Overview

Production-ready reservation endpoints with authentication, validation, rate limiting, and comprehensive business logic.

## Endpoints

### 1. List Reservations
```
GET /api/reservations
```

Query Parameters:
- `status`: Filter by reservation status (pending, confirmed, checked_in, checked_out, cancelled, no_show)
- `startDate`: Filter by check-in date (ISO 8601)
- `endDate`: Filter by check-out date (ISO 8601)
- `propertyId`: Filter by property
- `clientId`: Filter by client
- `source`: Filter by source (whatsapp_ai, manual, website, phone, email)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sortBy`: Sort field (createdAt, checkIn, checkOut, totalAmount)
- `sortOrder`: Sort direction (asc, desc)

Rate Limit: 100 requests/minute

### 2. Create Reservation
```
POST /api/reservations
```

Request Body:
```json
{
  "propertyId": "prop123",
  "clientId": "client456",
  "checkIn": "2024-01-15T15:00:00Z",
  "checkOut": "2024-01-20T11:00:00Z",
  "guests": 4,
  "guestDetails": [
    {
      "name": "João Silva",
      "document": "123.456.789-00",
      "documentType": "cpf",
      "phone": "+5511999999999",
      "email": "joao@example.com",
      "isMainGuest": true
    }
  ],
  "totalAmount": 2500.00,
  "paymentMethod": "pix",
  "extraServices": [
    {
      "id": "service1",
      "name": "Transfer Aeroporto",
      "price": 150.00,
      "quantity": 1,
      "total": 150.00,
      "category": "transport"
    }
  ],
  "specialRequests": "Late check-in requested",
  "source": "whatsapp_ai"
}
```

Validations:
- Check-in date must be in the future
- Check-out must be after check-in
- Maximum stay: 365 days
- Guest count must match property capacity
- Property must be available for dates
- At least one main guest required

Rate Limit: 20 requests/minute

### 3. Update Reservation
```
PUT /api/reservations
```

Request Body:
```json
{
  "id": "reservation123",
  "status": "confirmed",
  "guests": 3,
  "paidAmount": 1000.00
}
```

Validations:
- Cannot modify checked-in, checked-out, or cancelled reservations
- Date changes require availability check
- Guest changes require capacity check

Rate Limit: 20 requests/minute

### 4. Delete Reservation
```
DELETE /api/reservations?id=reservation123
```

Restrictions:
- Only pending reservations can be deleted
- Use cancel endpoint for other statuses

Rate Limit: 10 requests/minute

### 5. Get Single Reservation
```
GET /api/reservations/[id]
```

Rate Limit: 100 requests/minute

### 6. Cancel Reservation
```
POST /api/reservations/[id]/cancel
```

Request Body:
```json
{
  "reason": "Guest requested cancellation",
  "refundAmount": 1500.00,
  "refundMethod": "pix"
}
```

Cancellation Policy:
- 48+ hours before: Full refund
- 24-48 hours: 50% refund
- <24 hours: No refund

Rate Limit: 20 requests/minute

### 7. Check-in/Check-out
```
POST /api/reservations/[id]/check-in-out
```

Request Body:
```json
{
  "action": "check_in",
  "notes": "Guest arrived 30 minutes late",
  "actualGuests": 3
}
```

Validations:
- Check-in: Only confirmed reservations, max 1 day early
- Check-out: Only after check-in

Rate Limit: 20 requests/minute

### 8. Check Availability
```
POST /api/reservations/check-availability
```

Request Body:
```json
{
  "propertyId": "prop123",
  "checkIn": "2024-01-15T15:00:00Z",
  "checkOut": "2024-01-20T11:00:00Z",
  "excludeReservationId": "res456"
}
```

Response includes conflicting reservations if not available.

Rate Limit: 50 requests/minute

### 9. Analytics
```
GET /api/reservations/analytics
```

Query Parameters:
- `startDate`: Start date (required)
- `endDate`: End date (required)
- `propertyId`: Filter by property
- `groupBy`: Time grouping (day, week, month)

Returns comprehensive analytics including:
- Summary statistics
- Revenue breakdown
- Status distribution
- Source analysis
- Timeline data

Rate Limit: 100 requests/minute

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error message in Portuguese",
  "code": "ERROR_CODE",
  "details": [] // For validation errors
}
```

Common error codes:
- `VALIDATION_ERROR`: Input validation failed
- `NOT_FOUND`: Resource not found
- `FORBIDDEN`: Access denied
- `UNAUTHORIZED`: Not authenticated
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `PROPERTY_NOT_AVAILABLE`: Date conflict
- `INVALID_STATUS`: Operation not allowed in current status

## Authentication

All endpoints require authentication via NextAuth session.
Tenant isolation is automatically enforced.

## Rate Limiting

Rate limits are per IP address and include headers:
- `X-RateLimit-Limit`: Request limit
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset time
- `Retry-After`: Seconds until retry (429 responses)

## Business Rules

1. **Date Validation**:
   - No past check-in dates
   - Maximum 2 years in future
   - Maximum 365 days stay

2. **Availability**:
   - Checked for pending, confirmed, and checked-in reservations
   - Proper overlap detection

3. **Capacity**:
   - Guest count cannot exceed property maximum
   - Minimum nights enforcement

4. **Status Transitions**:
   - Pending → Confirmed → Checked In → Checked Out
   - Pending/Confirmed → Cancelled
   - No modifications after check-in

5. **Payment**:
   - Automatic status updates based on paid amount
   - Refund calculations based on cancellation policy

## Security

- Input sanitization on all fields
- SQL injection prevention
- XSS protection
- Tenant isolation
- Role-based access control ready