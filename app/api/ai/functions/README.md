# AI Functions API Endpoints for N8N Integration

This folder contains individual POST endpoints for each of the 24 tenant-aware agent functions. Each endpoint can be called directly from N8N workflows.

## Base URL Pattern
```
POST /api/ai/functions/{function-name}
```

## Request Format
All endpoints expect the following JSON structure:
```json
{
  "tenantId": "your-tenant-id",
  // ... function-specific parameters
}
```

## Response Format
All endpoints return the following JSON structure:
```json
{
  "success": true|false,
  "data": { ... }, // Function result data
  "error": "Error message" // Only present if success: false
}
```

## Available Functions

### 🔍 Property Search & Discovery
- **`/api/ai/functions/search-properties`** - Search available properties with filters
- **`/api/ai/functions/get-property-details`** - Get detailed property information
- **`/api/ai/functions/send-property-media`** - Send property photos/videos
- **`/api/ai/functions/check-availability`** - Check property availability for dates

### 💰 Pricing & Financial
- **`/api/ai/functions/calculate-price`** - Calculate pricing for date ranges
- **`/api/ai/functions/generate-quote`** - Generate detailed quotations
- **`/api/ai/functions/create-transaction`** - Create payment transactions

### 📅 Booking & Reservations
- **`/api/ai/functions/create-reservation`** - Create new reservations
- **`/api/ai/functions/cancel-reservation`** - Cancel existing reservations
- **`/api/ai/functions/modify-reservation`** - Modify reservation details

### 👤 Customer Management
- **`/api/ai/functions/register-client`** - Register new clients
- **`/api/ai/functions/create-lead`** - Create CRM leads
- **`/api/ai/functions/update-lead`** - Update lead information
- **`/api/ai/functions/classify-lead`** - Classify leads (hot/warm/cold)
- **`/api/ai/functions/update-lead-status`** - Update lead pipeline status

### 🏠 Visit Management
- **`/api/ai/functions/schedule-visit`** - Schedule property visits
- **`/api/ai/functions/check-visit-availability`** - Check visit availability

### 📋 Information & Policies
- **`/api/ai/functions/get-policies`** - Get cancellation/payment policies

### 📊 Analytics & Goals
- **`/api/ai/functions/create-goal`** - Create business goals
- **`/api/ai/functions/update-goal-progress`** - Update goal progress
- **`/api/ai/functions/analyze-performance`** - Analyze performance metrics
- **`/api/ai/functions/generate-report`** - Generate custom reports
- **`/api/ai/functions/track-metrics`** - Track business metrics

### 📝 Task Management
- **`/api/ai/functions/create-task`** - Create tasks
- **`/api/ai/functions/update-task`** - Update task status

## N8N Integration Example

### HTTP Request Node Configuration:
```
Method: POST
URL: https://your-domain.com/api/ai/functions/search-properties
Headers: 
  Content-Type: application/json
Body:
{
  "tenantId": "tenant123",
  "location": "São Paulo",
  "guests": 4,
  "checkIn": "2025-01-15",
  "checkOut": "2025-01-20",
  "maxPrice": 500
}
```

### Response Handling:
The response will be available in `{{$json}}` and contains:
- `success`: boolean indicating if the operation succeeded
- `data`: the function result data
- `error`: error message if success is false

## Error Handling

All endpoints include comprehensive error handling:
- Input validation (tenantId required)
- Professional logging with structured data
- Graceful error responses
- No sensitive data exposure

## Authentication

Currently, these endpoints don't require authentication. For production use, consider adding:
- API key validation
- Rate limiting per tenant
- Request size limits
- CORS configuration

## Monitoring

All endpoints log:
- Request parameters (sanitized)
- Execution success/failure
- Performance metrics
- Tenant isolation compliance

Use the structured logs for monitoring and debugging your N8N workflows.