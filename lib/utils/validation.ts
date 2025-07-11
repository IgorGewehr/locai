import { ValidationError } from './errors'
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

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

  // Use DOMPurify for comprehensive sanitization
  const cleaned = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  })

  return cleaned
    .trim()
    .slice(0, 4000) // Limit length to prevent memory issues
}

// Sanitize SQL-like input to prevent injection
export function sanitizeSQLInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return input
    .replace(/['"\\]/g, '') // Remove quotes and backslashes
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove multi-line comments
    .replace(/;/g, '') // Remove semicolons
    .trim()
}

// Validate and sanitize JSON input
export function validateJSON(input: string): any {
  try {
    const parsed = JSON.parse(input)
    // Additional validation to prevent prototype pollution
    if (parsed && typeof parsed === 'object') {
      const hasProto = '__proto__' in parsed || 'constructor' in parsed || 'prototype' in parsed
      if (hasProto) {
        throw new ValidationError('Invalid JSON: contains forbidden properties', 'json')
      }
    }
    return parsed
  } catch (error) {
    throw new ValidationError('Invalid JSON format', 'json')
  }
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

export function validateFinancialGoal(goal: any): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  // Required fields
  if (!goal || typeof goal !== 'object') {
    errors.push('Invalid goal data')
    return { valid: false, errors }
  }

  if (!goal.name || goal.name.trim().length === 0) {
    errors.push('Goal name is required')
  }

  if (!goal.type) {
    errors.push('Goal type is required')
  }

  if (!goal.category) {
    errors.push('Goal category is required')
  }

  if (!goal.metric) {
    errors.push('Goal metric is required')
  }

  // Validate numbers
  if (goal.targetValue === null || goal.targetValue === undefined) {
    errors.push('Target value is required')
  } else if (isNaN(Number(goal.targetValue))) {
    errors.push('Target value must be a number')
  }

  if (goal.startValue !== null && goal.startValue !== undefined && isNaN(Number(goal.startValue))) {
    errors.push('Start value must be a number')
  }

  // Validate target > start for most metrics
  if (goal.targetValue !== undefined && goal.startValue !== undefined) {
    const target = Number(goal.targetValue)
    const start = Number(goal.startValue)
    
    // For most metrics, target should be greater than start
    if (!['churn_rate', 'cac'].includes(goal.metric) && target <= start) {
      errors.push('Target value must be greater than start value')
    }
  }

  // Validate dates
  if (!goal.period || !goal.period.start || !goal.period.end) {
    errors.push('Goal period (start and end dates) is required')
  } else {
    try {
      const startDate = validateDate(goal.period.start, 'Start date')
      const endDate = validateDate(goal.period.end, 'End date')
      
      if (endDate <= startDate) {
        errors.push('End date must be after start date')
      }
      
      // Max goal duration: 5 years
      const yearsDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365)
      if (yearsDiff > 5) {
        errors.push('Goal duration cannot exceed 5 years')
      }
    } catch (error) {
      if (error instanceof ValidationError) {
        errors.push(error.message)
      }
    }
  }

  // Validate frequency
  if (!goal.frequency) {
    errors.push('Goal frequency is required')
  }

  // Validate status
  if (!goal.status) {
    errors.push('Goal status is required')
  }

  // Validate milestones if present
  if (goal.milestones && Array.isArray(goal.milestones)) {
    goal.milestones.forEach((milestone: any, index: number) => {
      if (!milestone.name || milestone.name.trim().length === 0) {
        errors.push(`Milestone ${index + 1}: name is required`)
      }
      
      if (milestone.targetValue === null || milestone.targetValue === undefined) {
        errors.push(`Milestone ${index + 1}: target value is required`)
      }
      
      if (!milestone.targetDate) {
        errors.push(`Milestone ${index + 1}: target date is required`)
      } else {
        try {
          const targetDate = validateDate(milestone.targetDate, 'Milestone date')
          
          // Milestone should be within goal period
          if (goal.period && goal.period.start && goal.period.end) {
            const start = new Date(goal.period.start)
            const end = new Date(goal.period.end)
            
            if (targetDate < start || targetDate > end) {
              errors.push(`Milestone ${index + 1}: date must be within goal period`)
            }
          }
        } catch (error) {
          if (error instanceof ValidationError) {
            errors.push(`Milestone ${index + 1}: ${error.message}`)
          }
        }
      }
    })
  }

  // Validate notification settings if present
  if (goal.notificationSettings) {
    if (goal.notificationSettings.deviationThreshold !== undefined) {
      const threshold = Number(goal.notificationSettings.deviationThreshold)
      if (isNaN(threshold) || threshold < 0 || threshold > 100) {
        errors.push('Deviation threshold must be between 0 and 100')
      }
    }
    
    if (goal.notificationSettings.recipients && Array.isArray(goal.notificationSettings.recipients)) {
      goal.notificationSettings.recipients.forEach((email: string, index: number) => {
        try {
          validateEmail(email)
        } catch (error) {
          errors.push(`Recipient ${index + 1}: invalid email format`)
        }
      })
    }
  }

  // Validate tenant ID if present
  if (goal.tenantId) {
    try {
      validateTenantId(goal.tenantId)
    } catch (error) {
      errors.push('Invalid tenant ID')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

export function validateGoalCheckpoint(checkpoint: any): void {
  if (!checkpoint || typeof checkpoint !== 'object') {
    throw new ValidationError('Invalid checkpoint data', 'checkpoint')
  }

  if (checkpoint.value === null || checkpoint.value === undefined) {
    throw new ValidationError('Checkpoint value is required', 'value')
  }

  const value = Number(checkpoint.value)
  if (isNaN(value)) {
    throw new ValidationError('Checkpoint value must be a number', 'value')
  }

  if (checkpoint.notes && typeof checkpoint.notes === 'string') {
    const sanitized = sanitizeUserInput(checkpoint.notes)
    if (sanitized.length > 500) {
      throw new ValidationError('Checkpoint notes cannot exceed 500 characters', 'notes')
    }
  }
}