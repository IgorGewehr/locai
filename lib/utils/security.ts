import crypto from 'crypto';
import { NextRequest } from 'next/server';

export class SecurityUtils {
  // Generate cryptographically secure random string
  static generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  // Generate UUID v4
  static generateUUID(): string {
    return crypto.randomUUID();
  }

  // Hash data with salt
  static hashWithSalt(data: string, salt?: string): { hash: string; salt: string } {
    const actualSalt = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512').toString('hex');
    return { hash, salt: actualSalt };
  }

  // Verify hashed data
  static verifyHash(data: string, hash: string, salt: string): boolean {
    const computedHash = crypto.pbkdf2Sync(data, salt, 10000, 64, 'sha512').toString('hex');
    return computedHash === hash;
  }

  // Encrypt data using AES-256-GCM
  static encrypt(data: string, key?: string): { encrypted: string; iv: string; tag: string; key: string } {
    const actualKey = key || crypto.randomBytes(32).toString('hex');
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher('aes-256-gcm', actualKey);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      key: actualKey,
    };
  }

  // Decrypt data using AES-256-GCM
  static decrypt(encrypted: string, key: string, iv: string, tag: string): string {
    const decipher = crypto.createDecipher('aes-256-gcm', key);
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  // Sanitize input to prevent XSS
  static sanitizeInput(input: string): string {
    if (!input) return '';
    
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/\\/g, '&#x5C;')
      .replace(/`/g, '&#96;')
      .trim();
  }

  // Validate and sanitize email
  static sanitizeEmail(email: string): string {
    if (!email) return '';
    
    return email
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9@.-]/g, '')
      .slice(0, 254); // RFC 5321 limit
  }

  // Validate and sanitize phone number
  static sanitizePhone(phone: string): string {
    if (!phone) return '';
    
    return phone
      .replace(/\D/g, '') // Remove all non-digits
      .slice(0, 15); // International format limit
  }

  // Generate secure password
  static generateSecurePassword(length: number = 16): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    const allChars = lowercase + uppercase + numbers + symbols;
    
    let password = '';
    
    // Ensure at least one character from each type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];
    
    // Fill the rest randomly
    for (let i = 4; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  // Validate password strength
  static validatePasswordStrength(password: string): { isValid: boolean; score: number; feedback: string[] } {
    const feedback: string[] = [];
    let score = 0;
    
    if (password.length < 8) {
      feedback.push('Senha deve ter pelo menos 8 caracteres');
    } else {
      score += 1;
    }
    
    if (!/[a-z]/.test(password)) {
      feedback.push('Senha deve conter pelo menos uma letra minúscula');
    } else {
      score += 1;
    }
    
    if (!/[A-Z]/.test(password)) {
      feedback.push('Senha deve conter pelo menos uma letra maiúscula');
    } else {
      score += 1;
    }
    
    if (!/\d/.test(password)) {
      feedback.push('Senha deve conter pelo menos um número');
    } else {
      score += 1;
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
      feedback.push('Senha deve conter pelo menos um caractere especial');
    } else {
      score += 1;
    }
    
    if (password.length > 12) {
      score += 1;
    }
    
    return {
      isValid: score >= 4,
      score,
      feedback,
    };
  }

  // Check for common passwords
  static isCommonPassword(password: string): boolean {
    const commonPasswords = [
      'password', '123456', '123456789', 'qwerty', 'abc123',
      'password123', 'admin', 'letmein', 'welcome', 'monkey',
      'dragon', 'master', 'sunshine', 'princess', 'azerty',
      'trustno1', 'hello', 'welcome123', 'passw0rd', 'admin123'
    ];
    
    return commonPasswords.includes(password.toLowerCase());
  }

  // Generate CSRF token
  static generateCSRFToken(): string {
    return crypto.randomBytes(32).toString('base64');
  }

  // Validate CSRF token
  static validateCSRFToken(token: string, sessionToken: string): boolean {
    return token === sessionToken;
  }

  // Extract IP address from request
  static getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const real = request.headers.get('x-real-ip');
    // NextRequest doesn't have ip property directly, use forwarded headers
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return real || 'unknown';
  }

  // Generate secure session ID
  static generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  // Validate webhook signature (for WhatsApp, etc.)
  static validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): boolean {
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  // Rate limiting key generator
  static generateRateLimitKey(request: NextRequest, scope: string): string {
    const ip = this.getClientIP(request);
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const hash = crypto.createHash('sha256').update(ip + userAgent).digest('hex');
    
    return `${scope}:${hash}`;
  }

  // Validate file upload
  static validateFileUpload(file: File, options: {
    maxSize?: number;
    allowedTypes?: string[];
    allowedExtensions?: string[];
  }): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check file size
    if (options.maxSize && file.size > options.maxSize) {
      errors.push(`Arquivo muito grande. Tamanho máximo: ${options.maxSize / 1024 / 1024}MB`);
    }
    
    // Check file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      errors.push(`Tipo de arquivo não permitido. Tipos permitidos: ${options.allowedTypes.join(', ')}`);
    }
    
    // Check file extension
    if (options.allowedExtensions) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !options.allowedExtensions.includes(extension)) {
        errors.push(`Extensão de arquivo não permitida. Extensões permitidas: ${options.allowedExtensions.join(', ')}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  // Secure filename for uploads
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid characters
      .replace(/_{2,}/g, '_') // Replace multiple underscores
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .toLowerCase()
      .slice(0, 255); // Limit length
  }

  // Generate secure API key
  static generateAPIKey(): string {
    const prefix = 'sk_';
    const randomPart = crypto.randomBytes(24).toString('base64').replace(/[+/]/g, '');
    return prefix + randomPart;
  }

  // Validate API key format
  static validateAPIKeyFormat(apiKey: string): boolean {
    return /^sk_[A-Za-z0-9]{32}$/.test(apiKey);
  }

  // Content Security Policy header
  static generateCSPHeader(nonce?: string): string {
    const noncePart = nonce ? ` 'nonce-${nonce}'` : '';
    
    return [
      "default-src 'self'",
      `script-src 'self'${noncePart} 'unsafe-inline'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://api.openai.com https://graph.facebook.com",
      "media-src 'self' https://firebasestorage.googleapis.com",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join('; ');
  }

  // Security headers for responses
  static getSecurityHeaders(nonce?: string): Record<string, string> {
    return {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Content-Security-Policy': this.generateCSPHeader(nonce),
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };
  }

  // Mask sensitive data for logging
  static maskSensitiveData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }
    
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    const masked = { ...data };
    
    for (const key in masked) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        masked[key] = '***MASKED***';
      } else if (typeof masked[key] === 'object') {
        masked[key] = this.maskSensitiveData(masked[key]);
      }
    }
    
    return masked;
  }

  // Validate tenant isolation
  static validateTenantAccess(userTenantId: string, resourceTenantId: string): boolean {
    return userTenantId === resourceTenantId;
  }

  // Generate secure nonce for CSP
  static generateNonce(): string {
    return crypto.randomBytes(16).toString('base64');
  }
}

// Export configured security utilities
export const securityUtils = new SecurityUtils();