# AI Agent API Route

This is the core AI agent endpoint that processes WhatsApp messages and generates intelligent responses using OpenAI GPT-4 with function calling.

## Features

### 🔒 Security & Authentication
- **Optional Authentication**: WhatsApp webhook requests are allowed without auth
- **Multiple Auth Methods**: 
  - Session-based (NextAuth)
  - API Key (via `x-api-key` header)
  - Bearer Token (JWT)
- **Tenant Isolation**: Multi-tenant support with data segregation
- **Input Validation**: Comprehensive validation for all inputs
- **Response Sanitization**: All AI responses are sanitized to prevent XSS and injection attacks

### 🚦 Rate Limiting
- **Per Phone Number**: 20 messages per minute limit
- **Redis Support**: Uses Redis if available, falls back to in-memory
- **Graceful Handling**: Returns remaining quota and reset time

### 📊 Monitoring & Logging
- **Request Logging**: All requests are logged with:
  - Response time
  - Status code
  - Error details
  - Function calls executed
  - Client and conversation IDs
- **Batch Writing**: Logs are batched for performance
- **Error Classification**: Errors are categorized for better monitoring

### 🤖 AI Processing
- **Timeout Protection**: 30-second timeout for AI responses
- **Error Recovery**: Graceful fallback messages on AI errors
- **Function Calling**: Supports all agent functions:
  - Property search
  - Price calculation
  - Media sending
  - Reservation creation
  - Client preference updates

### 🛡️ Production Ready
- **No Mock Data**: All data comes from Firestore
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **Performance**: Optimized for production workloads
- **Scalability**: Designed for high-volume WhatsApp conversations

## API Endpoints

### POST /api/agent
Process a message from WhatsApp and generate a response.

**Request Body:**
```json
{
  "message": "string (required)",
  "clientPhone": "string (required)",
  "whatsappNumber": "string (optional)",
  "tenantId": "string (optional - uses auth context or default)"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "response": "AI generated response",
    "functionResults": [],
    "conversationId": "string",
    "clientId": "string"
  }
}
```

**Rate Limit Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Reset time (ISO 8601)

### GET /api/agent?conversationId={id}
Retrieve conversation history (requires authentication).

**Response:**
```json
{
  "success": true,
  "data": {
    "conversation": { /* conversation object */ },
    "messages": [ /* array of messages */ ]
  }
}
```

## Error Codes

- `VALIDATION_ERROR`: Input validation failed
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `CLIENT_ERROR`: Failed to create/find client
- `CONVERSATION_ERROR`: Failed to create/find conversation
- `AI_ERROR`: AI processing failed
- `UNAUTHORIZED`: Authentication required
- `NOT_FOUND`: Resource not found
- `INTERNAL_ERROR`: Server error

## Environment Variables

Required:
- `OPENAI_API_KEY`: OpenAI API key
- `TENANT_ID`: Default tenant ID (or use header/auth)

Optional:
- `API_KEY`: API key for external access
- `JWT_SECRET`: Secret for JWT tokens
- `REDIS_URL`: Redis connection for rate limiting

## Usage Examples

### With API Key
```bash
curl -X POST https://your-domain.com/api/agent \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -H "x-tenant-id: your-tenant" \
  -d '{
    "message": "Quero alugar uma casa na praia",
    "clientPhone": "5511999999999"
  }'
```

### From WhatsApp Webhook
The webhook automatically calls this endpoint with proper formatting.