import { ValidationError } from './error-handler';

export interface ValidationRule {
  field: string;
  value: any;
  rules: Rule[];
}

export interface Rule {
  type: 'required' | 'email' | 'phone' | 'minLength' | 'maxLength' | 'pattern' | 'custom';
  message: string;
  value?: any;
  validator?: (value: any) => boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export class InputValidator {
  private static emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  private static phoneRegex = /^(\+55|55)?[\s-]?(\(?\d{2}\)?[\s-]?)?[\s-]?(\d{4,5}[\s-]?\d{4})$/;
  private static strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

  static validateInput(rules: ValidationRule[]): ValidationResult {
    const errors: ValidationError[] = [];

    for (const rule of rules) {
      const fieldErrors = this.validateField(rule);
      errors.push(...fieldErrors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  private static validateField(rule: ValidationRule): ValidationError[] {
    const errors: ValidationError[] = [];
    const { field, value, rules } = rule;

    for (const validationRule of rules) {
      const error = this.applyRule(field, value, validationRule);
      if (error) {
        errors.push(error);
      }
    }

    return errors;
  }

  private static applyRule(field: string, value: any, rule: Rule): ValidationError | null {
    switch (rule.type) {
      case 'required':
        if (value === undefined || value === null || value === '') {
          return new ValidationError(rule.message, field);
        }
        break;

      case 'email':
        if (value && !this.emailRegex.test(value)) {
          return new ValidationError(rule.message, field);
        }
        break;

      case 'phone':
        if (value && !this.phoneRegex.test(value)) {
          return new ValidationError(rule.message, field);
        }
        break;

      case 'minLength':
        if (value && value.length < rule.value) {
          return new ValidationError(rule.message, field);
        }
        break;

      case 'maxLength':
        if (value && value.length > rule.value) {
          return new ValidationError(rule.message, field);
        }
        break;

      case 'pattern':
        if (value && !rule.value.test(value)) {
          return new ValidationError(rule.message, field);
        }
        break;

      case 'custom':
        if (rule.validator && !rule.validator(value)) {
          return new ValidationError(rule.message, field);
        }
        break;
    }

    return null;
  }

  // Convenience methods for common validations
  static validateRequired(field: string, value: any): ValidationError | null {
    return this.applyRule(field, value, {
      type: 'required',
      message: `${field} é obrigatório`,
    });
  }

  static validateEmail(field: string, value: any): ValidationError | null {
    return this.applyRule(field, value, {
      type: 'email',
      message: `${field} deve ser um email válido`,
    });
  }

  static validatePhone(field: string, value: any): ValidationError | null {
    return this.applyRule(field, value, {
      type: 'phone',
      message: `${field} deve ser um telefone válido`,
    });
  }

  static validatePassword(field: string, value: any): ValidationError | null {
    return this.applyRule(field, value, {
      type: 'pattern',
      value: this.strongPasswordRegex,
      message: `${field} deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e símbolo`,
    });
  }

  static validateDate(field: string, value: any): ValidationError | null {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return new ValidationError(`${field} deve ser uma data válida`, field);
    }
    return null;
  }

  static validateFutureDate(field: string, value: any): ValidationError | null {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return new ValidationError(`${field} deve ser uma data válida`, field);
    }
    if (date <= new Date()) {
      return new ValidationError(`${field} deve ser uma data futura`, field);
    }
    return null;
  }

  static validateNumberRange(field: string, value: any, min: number, max: number): ValidationError | null {
    const num = Number(value);
    if (isNaN(num)) {
      return new ValidationError(`${field} deve ser um número`, field);
    }
    if (num < min || num > max) {
      return new ValidationError(`${field} deve estar entre ${min} e ${max}`, field);
    }
    return null;
  }

  // Sanitization methods
  static sanitizeString(input: string): string {
    if (!input) return '';
    
    return input
      .trim()
      .replace(/[<>]/g, '') // Basic XSS protection
      .replace(/['"]/g, '') // Remove quotes
      .slice(0, 1000); // Limit length
  }

  static sanitizeEmail(input: string): string {
    if (!input) return '';
    
    return input
      .toLowerCase()
      .trim()
      .replace(/[^\w@.-]/g, '') // Keep only valid email characters
      .slice(0, 254); // RFC 5321 limit
  }

  static sanitizePhone(input: string): string {
    if (!input) return '';
    
    return input
      .replace(/\D/g, '') // Remove non-digits
      .slice(0, 15); // International format limit
  }

  static sanitizeHtml(input: string): string {
    if (!input) return '';
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Validation schemas for common use cases
  static userRegistrationSchema(data: any): ValidationResult {
    return this.validateInput([
      {
        field: 'name',
        value: data.name,
        rules: [
          { type: 'required', message: 'Nome é obrigatório' },
          { type: 'minLength', value: 2, message: 'Nome deve ter pelo menos 2 caracteres' },
          { type: 'maxLength', value: 100, message: 'Nome deve ter no máximo 100 caracteres' },
        ],
      },
      {
        field: 'email',
        value: data.email,
        rules: [
          { type: 'required', message: 'Email é obrigatório' },
          { type: 'email', message: 'Email deve ser válido' },
        ],
      },
      {
        field: 'phone',
        value: data.phone,
        rules: [
          { type: 'required', message: 'Telefone é obrigatório' },
          { type: 'phone', message: 'Telefone deve ser válido' },
        ],
      },
      {
        field: 'password',
        value: data.password,
        rules: [
          { type: 'required', message: 'Senha é obrigatória' },
          { type: 'pattern', value: this.strongPasswordRegex, message: 'Senha deve ter pelo menos 8 caracteres, incluindo maiúscula, minúscula, número e símbolo' },
        ],
      },
    ]);
  }

  static propertySearchSchema(data: any): ValidationResult {
    return this.validateInput([
      {
        field: 'checkIn',
        value: data.checkIn,
        rules: [
          { type: 'required', message: 'Data de check-in é obrigatória' },
          { type: 'custom', message: 'Data de check-in deve ser válida', validator: (value) => !isNaN(new Date(value).getTime()) },
          { type: 'custom', message: 'Data de check-in deve ser futura', validator: (value) => new Date(value) > new Date() },
        ],
      },
      {
        field: 'checkOut',
        value: data.checkOut,
        rules: [
          { type: 'required', message: 'Data de check-out é obrigatória' },
          { type: 'custom', message: 'Data de check-out deve ser válida', validator: (value) => !isNaN(new Date(value).getTime()) },
          { type: 'custom', message: 'Data de check-out deve ser após check-in', validator: (value) => new Date(value) > new Date(data.checkIn) },
        ],
      },
      {
        field: 'guests',
        value: data.guests,
        rules: [
          { type: 'required', message: 'Número de hóspedes é obrigatório' },
          { type: 'custom', message: 'Número de hóspedes deve ser válido', validator: (value) => Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 20 },
        ],
      },
    ]);
  }

  static reservationSchema(data: any): ValidationResult {
    return this.validateInput([
      {
        field: 'propertyId',
        value: data.propertyId,
        rules: [
          { type: 'required', message: 'ID da propriedade é obrigatório' },
          { type: 'minLength', value: 1, message: 'ID da propriedade deve ser válido' },
        ],
      },
      {
        field: 'clientId',
        value: data.clientId,
        rules: [
          { type: 'required', message: 'ID do cliente é obrigatório' },
          { type: 'minLength', value: 1, message: 'ID do cliente deve ser válido' },
        ],
      },
      {
        field: 'checkIn',
        value: data.checkIn,
        rules: [
          { type: 'required', message: 'Data de check-in é obrigatória' },
          { type: 'custom', message: 'Data de check-in deve ser válida', validator: (value) => !isNaN(new Date(value).getTime()) },
        ],
      },
      {
        field: 'checkOut',
        value: data.checkOut,
        rules: [
          { type: 'required', message: 'Data de check-out é obrigatória' },
          { type: 'custom', message: 'Data de check-out deve ser válida', validator: (value) => !isNaN(new Date(value).getTime()) },
          { type: 'custom', message: 'Data de check-out deve ser após check-in', validator: (value) => new Date(value) > new Date(data.checkIn) },
        ],
      },
      {
        field: 'guests',
        value: data.guests,
        rules: [
          { type: 'required', message: 'Número de hóspedes é obrigatório' },
          { type: 'custom', message: 'Número de hóspedes deve ser válido', validator: (value) => Number.isInteger(Number(value)) && Number(value) > 0 && Number(value) <= 20 },
        ],
      },
      {
        field: 'paymentMethod',
        value: data.paymentMethod,
        rules: [
          { type: 'required', message: 'Método de pagamento é obrigatório' },
          { type: 'custom', message: 'Método de pagamento deve ser válido', validator: (value) => ['credit_card', 'bank_transfer', 'pix'].includes(value) },
        ],
      },
    ]);
  }

  // Bulk sanitization
  static sanitizeObject(obj: any, schema: Record<string, 'string' | 'email' | 'phone' | 'html'>): any {
    const sanitized: any = {};
    
    for (const [key, type] of Object.entries(schema)) {
      if (obj[key] !== undefined) {
        switch (type) {
          case 'string':
            sanitized[key] = this.sanitizeString(obj[key]);
            break;
          case 'email':
            sanitized[key] = this.sanitizeEmail(obj[key]);
            break;
          case 'phone':
            sanitized[key] = this.sanitizePhone(obj[key]);
            break;
          case 'html':
            sanitized[key] = this.sanitizeHtml(obj[key]);
            break;
          default:
            sanitized[key] = obj[key];
        }
      }
    }
    
    return sanitized;
  }
}

// Export instance for backward compatibility
export const inputValidation = {
  validateInput: async (data: any, schema: any) => {
    try {
      return await schema.validate(data, { abortEarly: false });
    } catch (error: any) {
      throw error;
    }
  },
};