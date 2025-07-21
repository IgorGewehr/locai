import { z } from 'zod';

// Define the schema for environment variables
const envSchema = z.object({
  // Application
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NEXT_PUBLIC_APP_URL: z.string().url().min(1),
  NEXT_PUBLIC_TENANT_ID: z.string().min(1).default('default'),

  // Authentication
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32).optional(),

  // Firebase Client
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: z.string().optional(),

  // Firebase Admin
  FIREBASE_PROJECT_ID: z.string().min(1),
  FIREBASE_CLIENT_EMAIL: z.string().email(),
  FIREBASE_PRIVATE_KEY: z.string().min(1),

  // OpenAI
  OPENAI_API_KEY: z.string().regex(/^sk-/, 'Invalid OpenAI API key format'),

  // WhatsApp Web (optional - uses QR code authentication)
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),

  // Optional services
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  REDIS_URL: z.string().url().optional(),
  SENTRY_DSN: z.string().url().optional(),

  // Security
  DATABASE_ENCRYPTION_KEY: z.string().min(32).optional(),
  API_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).pipe(z.number().positive()).default('60000'),
  API_RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).pipe(z.number().positive()).default('100'),

  // Feature flags
  ENABLE_WHATSAPP_INTEGRATION: z.string().transform(val => val === 'true').default('true'),
  ENABLE_AI_AGENT: z.string().transform(val => val === 'true').default('true'),
  ENABLE_PAYMENT_PROCESSING: z.string().transform(val => val === 'true').default('false'),
  ENABLE_ANALYTICS: z.string().transform(val => val === 'true').default('true'),

  // Performance
  CACHE_TTL_SECONDS: z.string().transform(Number).pipe(z.number().positive()).default('300'),
  MAX_CONCURRENT_AI_REQUESTS: z.string().transform(Number).pipe(z.number().positive()).default('10'),
  AI_REQUEST_TIMEOUT_MS: z.string().transform(Number).pipe(z.number().positive()).default('30000'),

  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  AUDIT_LOG_RETENTION_DAYS: z.string().transform(Number).pipe(z.number().positive()).default('90'),
});

type EnvVars = z.infer<typeof envSchema>;

// Validate environment variables
export function validateEnv(): EnvVars {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.issues.map(issue => {
        const path = issue.path.join('.');
        return `${path}: ${issue.message}`;
      });

      console.error('Environment validation failed:', missingVars);

      throw new Error('Environment validation failed. Please check your environment variables.');
    }
    throw error;
  }
}

// Export validated environment variables
export const env = validateEnv();

// Helper to check if in production
export const isProduction = env.NODE_ENV === 'production';

// Helper to check if in development
export const isDevelopment = env.NODE_ENV === 'development';

// Helper to check if feature is enabled
export const isFeatureEnabled = (feature: keyof Pick<EnvVars, 'ENABLE_WHATSAPP_INTEGRATION' | 'ENABLE_AI_AGENT' | 'ENABLE_PAYMENT_PROCESSING' | 'ENABLE_ANALYTICS'>) => {
  return env[feature];
};

// Production readiness check
export function checkProductionReadiness(): { ready: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check critical production variables
  if (!env.NEXT_PUBLIC_APP_URL.startsWith('https://') && isProduction) {
    issues.push('NEXT_PUBLIC_APP_URL must use HTTPS in production');
  }

  if (!env.DATABASE_ENCRYPTION_KEY && isProduction) {
    issues.push('DATABASE_ENCRYPTION_KEY is recommended for production');
  }

  if (!env.REDIS_URL && isProduction) {
    issues.push('REDIS_URL is recommended for production rate limiting');
  }

  if (!env.SENTRY_DSN && isProduction) {
    issues.push('SENTRY_DSN is recommended for production error tracking');
  }

  // WhatsApp Web uses QR code authentication - no API keys needed
  if (env.ENABLE_WHATSAPP_INTEGRATION) {
    console.log('✅ WhatsApp Web integration enabled (QR code authentication)');
  }

  // Check Stripe configuration if enabled
  if (env.ENABLE_PAYMENT_PROCESSING) {
    const stripeVars = ['STRIPE_SECRET_KEY', 'STRIPE_PUBLISHABLE_KEY'];
    stripeVars.forEach(varName => {
      if (!process.env[varName]) {
        issues.push(`${varName} is required when payment processing is enabled`);
      }
    });
  }

  return {
    ready: issues.length === 0,
    issues
  };
}

// Log environment status
export function logEnvironmentStatus(): void {
  const { ready, issues } = checkProductionReadiness();

  if (ready) {
    console.log('✅ Environment is ready for production');
  } else {
    console.warn('⚠️  Environment issues detected:');
    issues.forEach(issue => console.warn(`  - ${issue}`));
  }
}