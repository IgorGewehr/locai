# Properties API Documentation

## Overview
All property endpoints are now production-ready with:
- ✅ Authentication required (JWT via NextAuth)
- ✅ Rate limiting (configurable per operation type)
- ✅ Input validation (Zod schemas)
- ✅ Tenant isolation (multi-tenant support)
- ✅ Proper error handling
- ✅ Input sanitization (XSS protection)
- ✅ No mock data

## Authentication
All endpoints require authentication. Include the session cookie or Authorization header with your requests.

## Rate Limits
- **Read operations**: 100 requests/minute
- **Write operations**: 20 requests/minute
- **Delete operations**: 10 requests/minute
- **Search operations**: 50 requests/minute

Rate limit headers are included in all responses:
- `X-RateLimit-Limit`: Total allowed requests
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Time when limit resets

## Error Responses
All errors follow a consistent format:
```json
{
  "error": "Human-readable error message in Portuguese",
  "code": "ERROR_CODE",
  "details": {} // Optional validation details
}
```

Common error codes:
- `UNAUTHORIZED`: Not authenticated
- `FORBIDDEN`: Access denied
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid input data
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `INTERNAL_ERROR`: Server error

## Endpoints

### 1. List Properties
**GET** `/api/properties`

Query parameters:
- `page` (number, default: 1): Page number
- `limit` (number, default: 10, max: 100): Items per page
- `search` (string): Text search in title, description, address
- `location` (string): Filter by location
- `bedrooms` (number): Filter by number of bedrooms
- `maxGuests` (number): Filter by max guests
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `amenities` (string): Comma-separated amenities
- `category` (enum): Property category (apartment, house, studio, villa, condo)
- `isActive` (boolean): Filter active/inactive
- `isFeatured` (boolean): Filter featured properties
- `allowsPets` (boolean): Filter pet-friendly properties
- `checkIn` (date): Check-in date for availability
- `checkOut` (date): Check-out date for availability
- `sortBy` (enum): Sort field (price, createdAt, title, maxGuests)
- `sortOrder` (enum): Sort order (asc, desc)

Response:
```json
{
  "success": true,
  "data": {
    "properties": [...],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "totalPages": 10,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### 2. Get Single Property
**GET** `/api/properties/{id}`

Response:
```json
{
  "success": true,
  "data": {
    "id": "prop123",
    "title": "Beautiful Beach House",
    "description": "...",
    "address": "...",
    "category": "house",
    "bedrooms": 3,
    "bathrooms": 2,
    "maxGuests": 6,
    "basePrice": 500,
    "pricePerExtraGuest": 50,
    "minimumNights": 2,
    "cleaningFee": 100,
    "amenities": ["Wi-Fi", "Piscina", "Ar Condicionado"],
    "isFeatured": true,
    "allowsPets": false,
    "paymentMethodSurcharges": {
      "credit_card": 3,
      "pix": 0,
      "cash": 0,
      "bank_transfer": 0
    },
    "photos": [...],
    "videos": [...],
    "unavailableDates": ["2024-01-15", "2024-01-16"],
    "customPricing": {
      "2024-12-25": 800,
      "2024-12-31": 1000
    },
    "isActive": true,
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-10T00:00:00Z",
    "tenantId": "tenant123"
  }
}
```

### 3. Create Property
**POST** `/api/properties`

Request body:
```json
{
  "title": "Beach House", // 3-100 characters
  "description": "Amazing beach house with ocean view", // 10-2000 characters
  "address": "Rua da Praia, 123", // 5-200 characters
  "category": "house", // Required enum
  "bedrooms": 3, // 0-20
  "bathrooms": 2, // 0-20
  "maxGuests": 6, // 1-50
  "basePrice": 500, // > 0, max 100000
  "pricePerExtraGuest": 50, // >= 0, max 10000
  "minimumNights": 2, // 1-365
  "cleaningFee": 100, // >= 0, max 10000
  "amenities": ["Wi-Fi", "Piscina"], // Max 50 items
  "isFeatured": false,
  "allowsPets": true,
  "paymentMethodSurcharges": {
    "credit_card": 3,
    "pix": 0
  },
  "photos": [
    {
      "id": "photo1",
      "url": "https://...",
      "filename": "beach1.jpg",
      "order": 0,
      "isMain": true,
      "caption": "Ocean view"
    }
  ],
  "videos": [], // Max 5 videos
  "unavailableDates": ["2024-01-15"],
  "customPricing": {
    "2024-12-25": 800
  },
  "isActive": true
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "new-property-id"
  },
  "message": "Propriedade criada com sucesso"
}
```

### 4. Update Property
**PUT** `/api/properties/{id}`

Request body: Same as create but all fields are optional

Response:
```json
{
  "success": true,
  "data": { /* updated property */ },
  "message": "Propriedade atualizada com sucesso"
}
```

### 5. Delete Property (Soft Delete)
**DELETE** `/api/properties/{id}`

Response:
```json
{
  "success": true,
  "message": "Propriedade removida com sucesso"
}
```

### 6. Patch Property (Specific Operations)
**PATCH** `/api/properties/{id}`

Operations:

#### Toggle Active Status
```json
{
  "operation": "toggleActive"
}
```

#### Toggle Featured Status
```json
{
  "operation": "toggleFeatured"
}
```

#### Update Pricing
```json
{
  "operation": "updatePricing",
  "basePrice": 600,
  "customPricing": {
    "2024-12-25": 900
  }
}
```

#### Update Availability
```json
{
  "operation": "updateAvailability",
  "unavailableDates": ["2024-01-15", "2024-01-16", "2024-01-17"]
}
```

## Security Features

### 1. Tenant Isolation
- All operations are scoped to the authenticated user's tenant
- Cross-tenant access is blocked at the API level
- Tenant ID is automatically set from the authenticated session

### 2. Input Sanitization
- All text inputs are sanitized to prevent XSS attacks
- HTML tags are stripped from user input
- Input length is limited to prevent memory issues

### 3. Validation
- Comprehensive input validation using Zod schemas
- Type checking at runtime
- Detailed validation error messages

### 4. Rate Limiting
- Prevents abuse and ensures fair usage
- Different limits for different operation types
- Automatic blocking for repeated violations

## Example Usage

### JavaScript/TypeScript
```typescript
// List properties with filters
const response = await fetch('/api/properties?category=house&bedrooms=3&page=1&limit=20', {
  credentials: 'include' // Include auth cookies
})

// Create new property
const newProperty = await fetch('/api/properties', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    title: 'My Beach House',
    description: 'Beautiful beach house with ocean view',
    address: 'Rua da Praia, 123',
    category: 'house',
    bedrooms: 3,
    bathrooms: 2,
    maxGuests: 6,
    basePrice: 500,
    minimumNights: 2
  })
})

// Toggle property active status
const toggleResponse = await fetch(`/api/properties/${propertyId}`, {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json'
  },
  credentials: 'include',
  body: JSON.stringify({
    operation: 'toggleActive'
  })
})
```

## Migration Notes

### Removed Mock Data
- The TODO comment for default tenantId has been addressed
- Tenant ID is now properly retrieved from the authenticated session
- No hardcoded or mock data remains in the production code

### Enhanced Features
- Added PATCH endpoint for specific operations
- Comprehensive search and filtering capabilities
- Sorting options for better data organization
- Pagination with detailed metadata

### Future Enhancements
- Add check for active reservations before deletion
- Implement bulk operations endpoint
- Add property statistics endpoint
- Implement property duplication feature