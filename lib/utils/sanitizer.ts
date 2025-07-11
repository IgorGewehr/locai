// lib/utils/sanitizer.ts
import DOMPurify from 'isomorphic-dompurify'

interface SanitizationOptions {
  maxLength?: number
  allowedTags?: string[]
  allowedAttributes?: string[]
  stripHtml?: boolean
}

export function sanitizeAIResponse(
  response: string,
  options: SanitizationOptions = {}
): string {
  const {
    maxLength = 4096,
    allowedTags = [],
    allowedAttributes = [],
    stripHtml = true
  } = options

  if (!response || typeof response !== 'string') {
    return ''
  }

  // First, use DOMPurify to clean any potential XSS
  let sanitized = DOMPurify.sanitize(response, {
    ALLOWED_TAGS: stripHtml ? [] : allowedTags,
    ALLOWED_ATTR: stripHtml ? [] : allowedAttributes,
    KEEP_CONTENT: true,
    RETURN_DOM_FRAGMENT: false,
    RETURN_DOM: false
  })

  // Remove any potential script injections
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(/eval\(/gi, '')
    .replace(/expression\(/gi, '')

  // Remove SQL-like injections
  sanitized = sanitized
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|EXEC|EXECUTE)\b)/gi, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')

  // Remove potential system commands
  sanitized = sanitized
    .replace(/(\b(rm|sudo|chmod|chown|wget|curl|nc|bash|sh|cmd|powershell)\b)/gi, '')
    .replace(/[;&|`$]/g, '')

  // Clean up excessive whitespace
  sanitized = sanitized
    .replace(/\s+/g, ' ')
    .trim()

  // Enforce max length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength - 3) + '...'
  }

  return sanitized
}

export function sanitizeObject<T extends Record<string, any>>(
  obj: T,
  options: SanitizationOptions = {}
): T {
  if (!obj || typeof obj !== 'object') {
    return obj
  }

  const sanitized: any = Array.isArray(obj) ? [] : {}

  for (const [key, value] of Object.entries(obj)) {
    // Skip prototype pollution attempts
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue
    }

    if (typeof value === 'string') {
      sanitized[key] = sanitizeAIResponse(value, options)
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value, options)
    } else {
      sanitized[key] = value
    }
  }

  return sanitized as T
}

export function sanitizeFunctionResults(results: any[]): any[] {
  if (!Array.isArray(results)) {
    return []
  }

  return results.map(result => {
    if (!result || typeof result !== 'object') {
      return result
    }

    const sanitized: any = {}

    // Sanitize known fields
    if (result.function) {
      sanitized.function = sanitizeAIResponse(result.function, { maxLength: 100 })
    }

    if (result.result) {
      if (typeof result.result === 'object') {
        sanitized.result = sanitizeObject(result.result)
      } else {
        sanitized.result = result.result
      }
    }

    if (result.message) {
      sanitized.message = sanitizeAIResponse(result.message)
    }

    if (result.error) {
      sanitized.error = sanitizeAIResponse(result.error, { maxLength: 500 })
    }

    return sanitized
  })
}

export function sanitizePhoneNumber(phone: string): string {
  if (!phone || typeof phone !== 'string') {
    return ''
  }

  // Remove all non-digit characters
  return phone.replace(/\D/g, '').slice(0, 20)
}

export function sanitizeClientData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data
  }

  const sanitized: any = {}

  // Sanitize specific fields
  if (data.name) {
    sanitized.name = sanitizeAIResponse(data.name, { maxLength: 100 })
  }

  if (data.phone) {
    sanitized.phone = sanitizePhoneNumber(data.phone)
  }

  if (data.email) {
    sanitized.email = sanitizeAIResponse(data.email, { maxLength: 254 })
      .toLowerCase()
      .trim()
  }

  if (data.whatsappNumber) {
    sanitized.whatsappNumber = sanitizePhoneNumber(data.whatsappNumber)
  }

  if (data.preferences) {
    sanitized.preferences = sanitizeObject(data.preferences)
  }

  // Copy over safe fields
  const safeFields = ['id', 'createdAt', 'updatedAt', 'isActive', 'totalSpent']
  for (const field of safeFields) {
    if (field in data) {
      sanitized[field] = data[field]
    }
  }

  return sanitized
}