/**
 * Tenant utilities for multi-tenant support
 */

/**
 * Get the current tenant ID from environment or request context
 * This ensures we never use hardcoded 'default' values in production
 */
export function getCurrentTenantId(): string {
  // Priority order:
  // 1. Environment variable (for single-tenant deployments)
  // 2. Request header (for multi-tenant with subdomain/header routing)
  // 3. Throw error if not configured (no fallback to 'default')
  
  const tenantId = process.env.TENANT_ID || process.env.NEXT_PUBLIC_TENANT_ID;
  
  if (!tenantId) {
    throw new Error(
      'TENANT_ID not configured. Please set TENANT_ID environment variable.'
    );
  }
  
  return tenantId;
}

/**
 * Safe tenant ID getter with fallback for development only
 */
export function getTenantId(): string {
  try {
    return getCurrentTenantId();
  } catch (error) {
    // Only allow fallback in development
    if (process.env.NODE_ENV === 'development') {
      return 'development';
    }
    throw error;
  }
}

/**
 * Validate tenant ID format
 */
export function isValidTenantId(tenantId: string): boolean {
  // Tenant ID should be alphanumeric with hyphens, 3-50 characters
  const pattern = /^[a-zA-Z0-9-]{3,50}$/;
  return pattern.test(tenantId);
}

/**
 * Get tenant-specific configuration
 */
export function getTenantConfig(tenantId: string) {
  // This can be extended to load tenant-specific configurations
  // from database or configuration files
  return {
    id: tenantId,
    features: {
      payments: process.env.ENABLE_PAYMENTS === 'true',
      whatsapp: process.env.ENABLE_WHATSAPP === 'true',
      ai: process.env.ENABLE_AI === 'true',
    },
  };
}