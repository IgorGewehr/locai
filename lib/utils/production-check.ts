/**
 * Production readiness checks
 * Validates that all required environment variables and configurations are set
 */

interface ProductionCheck {
  name: string;
  required: boolean;
  envVar?: string;
  check: () => boolean;
  message: string;
}

export const PRODUCTION_CHECKS: ProductionCheck[] = [
  {
    name: 'Database Configuration',
    required: true,
    envVar: 'FIREBASE_PROJECT_ID',
    check: () => !!process.env.FIREBASE_PROJECT_ID && !!process.env.FIREBASE_PRIVATE_KEY,
    message: 'Firebase project ID and private key must be configured'
  },
  {
    name: 'OpenAI API Key',
    required: true,
    envVar: 'OPENAI_API_KEY',
    check: () => !!process.env.OPENAI_API_KEY,
    message: 'OpenAI API key is required for AI functionality'
  },
  {
    name: 'WhatsApp Configuration',
    required: false,
    envVar: 'WHATSAPP_ACCESS_TOKEN',
    check: () => !!process.env.WHATSAPP_ACCESS_TOKEN && !!process.env.WHATSAPP_PHONE_NUMBER_ID,
    message: 'WhatsApp access token and phone number ID (optional but recommended)'
  },
  {
    name: 'Application URL',
    required: true,
    envVar: 'NEXT_PUBLIC_APP_URL',
    check: () => {
      const url = process.env.NEXT_PUBLIC_APP_URL;
      return !!url && !url.includes('localhost') && !url.includes('127.0.0.1');
    },
    message: 'Production app URL must be configured (not localhost)'
  },
  {
    name: 'Tenant ID',
    required: true,
    envVar: 'TENANT_ID',
    check: () => !!process.env.TENANT_ID || !!process.env.NEXT_PUBLIC_TENANT_ID,
    message: 'Tenant ID must be configured for multi-tenant support'
  },
  {
    name: 'Node Environment',
    required: true,
    envVar: 'NODE_ENV',
    check: () => process.env.NODE_ENV === 'production',
    message: 'NODE_ENV must be set to "production"'
  },
  {
    name: 'Security Headers',
    required: true,
    envVar: 'NEXTAUTH_SECRET',
    check: () => !!process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length >= 32,
    message: 'NextAuth secret must be configured with at least 32 characters'
  }
];

export interface ProductionCheckResult {
  passed: boolean;
  failed: boolean;
  warnings: boolean;
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warn';
    message: string;
    required: boolean;
  }>;
}

export function runProductionChecks(): ProductionCheckResult {
  const results = PRODUCTION_CHECKS.map(check => {
    const passed = check.check();
    return {
      name: check.name,
      status: passed ? 'pass' : (check.required ? 'fail' : 'warn'),
      message: check.message,
      required: check.required
    };
  });

  const failed = results.some(r => r.status === 'fail');
  const warnings = results.some(r => r.status === 'warn');
  const passed = !failed;

  return {
    passed,
    failed,
    warnings,
    checks: results
  };
}

export function logProductionChecks(): void {
  const result = runProductionChecks();
  
  console.log('🔍 Production Readiness Check');
  console.log('=============================');
  
  result.checks.forEach(check => {
    const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️';
    const requiredText = check.required ? '[REQUIRED]' : '[OPTIONAL]';
    console.log(`${icon} ${check.name} ${requiredText}`);
    if (check.status !== 'pass') {
      console.log(`   ${check.message}`);
    }
  });
  
  console.log('=============================');
  console.log(`Overall Status: ${result.passed ? '✅ READY' : '❌ NOT READY'}`);
  
  if (result.failed) {
    console.error('❌ CRITICAL: Fix required issues before deploying to production!');
  } else if (result.warnings) {
    console.warn('⚠️  WARNING: Some optional features may not work properly.');
  } else {
    console.log('🚀 All checks passed! Ready for production deployment.');
  }
}

/**
 * Middleware to check production readiness on startup
 */
export function checkProductionReadiness(): void {
  if (process.env.NODE_ENV === 'production') {
    const result = runProductionChecks();
    
    if (result.failed) {
      logProductionChecks();
      throw new Error('Production readiness checks failed. See logs for details.');
    }
    
    if (result.warnings) {
      logProductionChecks();
    }
  }
}