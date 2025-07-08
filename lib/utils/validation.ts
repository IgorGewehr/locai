import { ValidationError } from './errors'

export function validatePhoneNumber(phone: string): string {
  if (!phone) {
    throw new ValidationError('Phone number is required', 'phone')
  }

  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '')
  
  // Brazilian phone number validation
  if (cleanPhone.length < 10 || cleanPhone.length > 15) {
    throw new ValidationError('Invalid phone number format', 'phone')
  }

  // Ensure it starts with country code or add default Brazil code
  if (cleanPhone.length === 11 && cleanPhone.startsWith('11')) {
    return `55${cleanPhone}` // Add Brazil country code
  }
  
  if (cleanPhone.length === 13 && cleanPhone.startsWith('55')) {
    return cleanPhone
  }

  throw new ValidationError('Phone number must be in Brazilian format', 'phone')
}

export function validateEmail(email: string): string {
  if (!email) {
    throw new ValidationError('Email is required', 'email')
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    throw new ValidationError('Invalid email format', 'email')
  }

  return email.toLowerCase().trim()
}

export function sanitizeUserInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 4000) // Limit length to prevent memory issues
}

export function validateMessageContent(content: string): string {
  if (!content || typeof content !== 'string') {
    throw new ValidationError('Message content is required', 'content')
  }

  const sanitized = sanitizeUserInput(content)
  
  if (sanitized.length === 0) {
    throw new ValidationError('Message content cannot be empty', 'content')
  }

  if (sanitized.length > 4000) {
    throw new ValidationError('Message content is too long (max 4000 characters)', 'content')
  }

  return sanitized
}

export function validateDate(date: any, fieldName: string): Date {
  if (!date) {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }

  const parsedDate = new Date(date)
  
  if (isNaN(parsedDate.getTime())) {
    throw new ValidationError(`Invalid ${fieldName} format`, fieldName)
  }

  return parsedDate
}

export function validatePositiveNumber(value: any, fieldName: string): number {
  if (value === null || value === undefined) {
    throw new ValidationError(`${fieldName} is required`, fieldName)
  }

  const num = Number(value)
  
  if (isNaN(num) || num < 0) {
    throw new ValidationError(`${fieldName} must be a positive number`, fieldName)
  }

  return num
}

export function validateTenantId(tenantId: string): string {
  if (!tenantId || typeof tenantId !== 'string') {
    throw new ValidationError('Tenant ID is required', 'tenantId')
  }

  const cleanTenantId = tenantId.trim()
  
  if (cleanTenantId.length === 0) {
    throw new ValidationError('Tenant ID cannot be empty', 'tenantId')
  }

  // Basic validation for tenant ID format
  if (!/^[a-zA-Z0-9_-]+$/.test(cleanTenantId)) {
    throw new ValidationError('Tenant ID contains invalid characters', 'tenantId')
  }

  return cleanTenantId
}

export function validateConversationData(data: any): void {
  if (!data || typeof data !== 'object') {
    throw new ValidationError('Invalid conversation data', 'data')
  }

  if (data.phoneNumber) {
    validatePhoneNumber(data.phoneNumber)
  }

  if (data.tenantId) {
    validateTenantId(data.tenantId)
  }

  if (data.message) {
    validateMessageContent(data.message)
  }
}

export function validatePropertySearchCriteria(criteria: any): void {
  if (!criteria || typeof criteria !== 'object') {
    throw new ValidationError('Invalid search criteria', 'criteria')
  }

  if (criteria.checkIn) {
    validateDate(criteria.checkIn, 'checkIn')
  }

  if (criteria.checkOut) {
    validateDate(criteria.checkOut, 'checkOut')
  }

  if (criteria.guests) {
    validatePositiveNumber(criteria.guests, 'guests')
  }

  if (criteria.budget) {
    validatePositiveNumber(criteria.budget, 'budget')
  }

  // Validate date range
  if (criteria.checkIn && criteria.checkOut) {
    const checkIn = new Date(criteria.checkIn)
    const checkOut = new Date(criteria.checkOut)
    
    if (checkOut <= checkIn) {
      throw new ValidationError('Check-out date must be after check-in date', 'dateRange')
    }

    // Validate reasonable date range (max 30 days)
    const daysDiff = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    if (daysDiff > 30) {
      throw new ValidationError('Stay duration cannot exceed 30 days', 'dateRange')
    }

    // Validate not too far in the future (max 2 years)
    const maxFutureDate = new Date()
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 2)
    
    if (checkIn > maxFutureDate) {
      throw new ValidationError('Check-in date is too far in the future', 'checkIn')
    }
  }
}