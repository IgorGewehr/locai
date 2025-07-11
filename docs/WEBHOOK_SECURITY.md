# WhatsApp Webhook Security Configuration

## Overview

This document outlines the security measures implemented in the WhatsApp webhook endpoint and the required configuration steps.

## Security Features Implemented

### 1. Webhook Signature Verification
- All incoming webhook requests are verified using HMAC-SHA256 signatures
- Prevents unauthorized requests and ensures data integrity
- Uses timing-safe comparison to prevent timing attacks

### 2. Rate Limiting
- Implements per-phone-number rate limiting (20 messages/minute)
- Prevents abuse and protects against spam
- Configurable limits for different scenarios

### 3. Request Deduplication
- Tracks processed message IDs for 5 minutes
- Prevents duplicate processing of the same message
- Automatic cleanup of old entries

### 4. Input Validation & Sanitization
- Comprehensive payload validation using Zod schemas
- Input sanitization to prevent XSS and injection attacks
- JSON parsing with prototype pollution protection

### 5. Error Handling
- Professional error handling with user-friendly messages
- No sensitive data exposure in error responses
- Comprehensive error logging for debugging

### 6. Webhook Event Logging
- All webhook events are logged for auditing
- Critical events stored in Firestore
- Structured logging for easy analysis

### 7. Timeout Protection
- 30-second timeout for message processing
- Prevents hanging operations
- Graceful error handling on timeout

## Required Environment Variables

Add these to your `.env.local` file:

```env
# WhatsApp Configuration
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_ACCESS_TOKEN=your_access_token
WHATSAPP_VERIFY_TOKEN=your_verify_token
WHATSAPP_APP_SECRET=your_app_secret  # Required for signature verification

# Application Configuration
TENANT_ID=your_tenant_id
```

## Setting Up Webhook Security

### 1. Generate App Secret
1. Go to your Meta App Dashboard
2. Navigate to Settings > Basic
3. Find and copy your App Secret
4. Add it to your environment variables

### 2. Configure Webhook URL
1. In Meta App Dashboard, go to WhatsApp > Configuration
2. Set your webhook URL: `https://yourdomain.com/api/webhook/whatsapp`
3. Set your verify token (must match `WHATSAPP_VERIFY_TOKEN`)
4. Subscribe to the following webhook fields:
   - messages
   - message_status
   - message_errors

### 3. Enable Webhook Signature Verification
1. In the webhook configuration, ensure "Verify Token" is set
2. The webhook will automatically verify signatures using your App Secret

## Testing Webhook Security

### 1. Verify Signature Validation
```bash
# Test with invalid signature (should return 401)
curl -X POST https://yourdomain.com/api/webhook/whatsapp \
  -H "Content-Type: application/json" \
  -H "X-Hub-Signature-256: invalid_signature" \
  -d '{"object":"whatsapp_business_account","entry":[]}'
```

### 2. Test Rate Limiting
```bash
# Send multiple requests quickly (should rate limit after 20)
for i in {1..25}; do
  # Use the WhatsApp test tool or send actual messages
  echo "Request $i"
done
```

### 3. Verify Deduplication
- Send the same message multiple times
- Check logs to confirm only first instance is processed

## Monitoring & Alerts

### 1. Key Metrics to Monitor
- Webhook request volume
- Rate limit violations
- Signature verification failures
- Processing timeouts
- Error rates by type

### 2. Recommended Alerts
- High rate of signature failures (possible attack)
- Sudden spike in rate limit violations
- Increased timeout errors
- Unusual error patterns

### 3. Log Analysis
Query webhook logs in Firestore:
```javascript
// Find all errors in last hour
const errors = await db.collection('webhook_logs')
  .where('type', '==', 'error')
  .where('timestamp', '>', new Date(Date.now() - 3600000).toISOString())
  .get()
```

## Security Best Practices

### 1. Environment Variables
- Never commit secrets to version control
- Use different secrets for each environment
- Rotate access tokens regularly
- Use strong, randomly generated verify tokens

### 2. Network Security
- Always use HTTPS for webhook endpoints
- Consider IP whitelisting if possible
- Use a Web Application Firewall (WAF)
- Enable DDoS protection

### 3. Application Security
- Keep dependencies updated
- Regular security audits
- Monitor for suspicious patterns
- Implement proper logging and alerting

### 4. Data Protection
- Sanitize all user inputs
- Validate data types and formats
- Implement proper error boundaries
- Never log sensitive information

## Troubleshooting

### Common Issues

1. **Signature Verification Failing**
   - Verify `WHATSAPP_APP_SECRET` is correctly set
   - Check for trailing spaces in environment variables
   - Ensure request body is not modified by proxies

2. **Rate Limiting Too Aggressive**
   - Adjust limits in `lib/utils/rate-limiter.ts`
   - Consider per-user vs per-phone limits
   - Implement allowlists for testing

3. **Duplicate Messages**
   - Check if Meta is retrying due to timeout
   - Ensure webhook returns 200 status quickly
   - Verify deduplication cache is working

4. **Missing Webhook Events**
   - Verify webhook subscriptions in Meta dashboard
   - Check webhook URL is publicly accessible
   - Review Meta webhook delivery insights

## Performance Optimization

1. **Async Processing**
   - Process messages asynchronously when possible
   - Return 200 immediately after validation
   - Use message queues for heavy processing

2. **Caching**
   - Cache frequently accessed data
   - Implement Redis for distributed rate limiting
   - Use CDN for static resources

3. **Database Optimization**
   - Index webhook_logs collection properly
   - Implement log rotation
   - Archive old logs periodically

## Compliance & Privacy

1. **Data Retention**
   - Define retention policies for logs
   - Implement automatic data deletion
   - Comply with GDPR/LGPD requirements

2. **Audit Trail**
   - Maintain comprehensive audit logs
   - Track all data access and modifications
   - Implement tamper-proof logging

3. **Privacy Protection**
   - Minimize logged PII
   - Encrypt sensitive data at rest
   - Implement proper access controls