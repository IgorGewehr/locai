#!/usr/bin/env node

/**
 * Production Readiness Check Script
 * Validates all critical configurations before deployment
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ANSI color codes
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m',
  bold: '\x1b[1m',
};

class ProductionChecker {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.success = [];
    this.rootDir = process.cwd();
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colorMap = {
      error: colors.red,
      warning: colors.yellow,
      success: colors.green,
      info: colors.blue,
    };
    
    console.log(`${colorMap[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async checkEnvironmentVariables() {
    this.log('🔍 Checking environment variables...', 'info');
    
    const requiredVars = [
      'NEXT_PUBLIC_APP_URL',
      'JWT_SECRET',
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'FIREBASE_PROJECT_ID',
      'FIREBASE_CLIENT_EMAIL',
      'FIREBASE_PRIVATE_KEY',
      'OPENAI_API_KEY',
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
      'WHATSAPP_VERIFY_TOKEN',
      'WHATSAPP_APP_SECRET',
    ];
    
    const recommendedVars = [
      'REDIS_URL',
      'SENTRY_DSN',
      'DATABASE_ENCRYPTION_KEY',
      'STRIPE_SECRET_KEY',
    ];
    
    let missingRequired = 0;
    let missingRecommended = 0;
    
    for (const varName of requiredVars) {
      if (!process.env[varName]) {
        this.errors.push(`Missing required environment variable: ${varName}`);
        missingRequired++;
      } else {
        // Validate format
        if (varName === 'NEXT_PUBLIC_APP_URL' && !process.env[varName].startsWith('https://')) {
          this.warnings.push('NEXT_PUBLIC_APP_URL should use HTTPS in production');
        }
        if (varName === 'JWT_SECRET' && process.env[varName].length < 32) {
          this.errors.push('JWT_SECRET must be at least 32 characters long');
        }
        if (varName === 'OPENAI_API_KEY' && !process.env[varName].startsWith('sk-')) {
          this.errors.push('OPENAI_API_KEY has invalid format');
        }
      }
    }
    
    for (const varName of recommendedVars) {
      if (!process.env[varName]) {
        this.warnings.push(`Recommended environment variable missing: ${varName}`);
        missingRecommended++;
      }
    }
    
    if (missingRequired === 0) {
      this.success.push(`All ${requiredVars.length} required environment variables are set`);
    }
    
    if (missingRecommended === 0) {
      this.success.push(`All ${recommendedVars.length} recommended environment variables are set`);
    }
  }

  async checkFileStructure() {
    this.log('📁 Checking file structure...', 'info');
    
    const requiredFiles = [
      'package.json',
      'next.config.js',
      'tsconfig.json',
      '.env.example',
      'lib/firebase/config.ts',
      'lib/firebase/admin.ts',
      'lib/middleware/auth.ts',
      'lib/middleware/rate-limit.ts',
      'lib/middleware/error-handler.ts',
      'lib/validation/schemas.ts',
      'lib/utils/env-validator.ts',
    ];
    
    const requiredDirs = [
      'app/api',
      'lib/firebase',
      'lib/middleware',
      'lib/services',
      'lib/utils',
      'lib/validation',
    ];
    
    for (const file of requiredFiles) {
      const filePath = join(this.rootDir, file);
      if (!existsSync(filePath)) {
        this.errors.push(`Missing required file: ${file}`);
      } else {
        this.success.push(`✓ ${file}`);
      }
    }
    
    for (const dir of requiredDirs) {
      const dirPath = join(this.rootDir, dir);
      if (!existsSync(dirPath)) {
        this.errors.push(`Missing required directory: ${dir}`);
      } else {
        this.success.push(`✓ ${dir}/`);
      }
    }
  }

  async checkPackageJson() {
    this.log('📦 Checking package.json...', 'info');
    
    try {
      const packageJsonPath = join(this.rootDir, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      // Check required scripts
      const requiredScripts = ['build', 'start', 'lint', 'type-check'];
      for (const script of requiredScripts) {
        if (!packageJson.scripts[script]) {
          this.errors.push(`Missing required script: ${script}`);
        } else {
          this.success.push(`✓ Script: ${script}`);
        }
      }
      
      // Check critical dependencies
      const criticalDeps = [
        'next',
        'react',
        'firebase',
        'firebase-admin',
        'openai',
        'zod',
        'bcryptjs',
        'jsonwebtoken',
      ];
      
      for (const dep of criticalDeps) {
        if (!packageJson.dependencies[dep]) {
          this.errors.push(`Missing critical dependency: ${dep}`);
        } else {
          this.success.push(`✓ Dependency: ${dep}`);
        }
      }
      
      // Check for development dependencies in production
      if (packageJson.dependencies['@types/node']) {
        this.warnings.push('@types/node should be in devDependencies');
      }
      
    } catch (error) {
      this.errors.push(`Failed to parse package.json: ${error.message}`);
    }
  }

  async checkNextConfig() {
    this.log('⚙️  Checking Next.js configuration...', 'info');
    
    try {
      const nextConfigPath = join(this.rootDir, 'next.config.js');
      const nextConfig = readFileSync(nextConfigPath, 'utf8');
      
      // Check for security headers
      if (nextConfig.includes('X-Frame-Options')) {
        this.success.push('✓ X-Frame-Options header configured');
      } else {
        this.warnings.push('X-Frame-Options header not configured');
      }
      
      if (nextConfig.includes('Content-Security-Policy')) {
        this.success.push('✓ Content-Security-Policy header configured');
      } else {
        this.warnings.push('Content-Security-Policy header not configured');
      }
      
      if (nextConfig.includes('poweredByHeader: false')) {
        this.success.push('✓ Powered-by header disabled');
      } else {
        this.warnings.push('Consider disabling powered-by header');
      }
      
    } catch (error) {
      this.errors.push(`Failed to check next.config.js: ${error.message}`);
    }
  }

  async checkBuildOutput() {
    this.log('🔨 Checking build output...', 'info');
    
    try {
      const { stdout, stderr } = await execAsync('npm run build', { cwd: this.rootDir });
      
      if (stderr && stderr.includes('Failed to compile')) {
        this.errors.push('Build failed with compilation errors');
      } else if (stdout.includes('Compiled successfully')) {
        this.success.push('✓ Build completed successfully');
      } else if (stdout.includes('Compiled with warnings')) {
        this.warnings.push('Build completed with warnings');
        this.success.push('✓ Build completed (with warnings)');
      }
      
    } catch (error) {
      this.errors.push(`Build failed: ${error.message}`);
    }
  }

  async checkTypeScript() {
    this.log('🔍 Checking TypeScript...', 'info');
    
    try {
      const { stdout, stderr } = await execAsync('npm run type-check', { cwd: this.rootDir });
      
      if (stderr && stderr.includes('error TS')) {
        this.warnings.push('TypeScript type checking found errors');
      } else {
        this.success.push('✓ TypeScript type checking passed');
      }
      
    } catch (error) {
      this.warnings.push(`TypeScript check failed: ${error.message}`);
    }
  }

  async checkLinting() {
    this.log('🔍 Checking linting...', 'info');
    
    try {
      const { stdout, stderr } = await execAsync('npm run lint', { cwd: this.rootDir });
      
      if (stderr && stderr.includes('error')) {
        this.warnings.push('ESLint found errors');
      } else {
        this.success.push('✓ ESLint passed');
      }
      
    } catch (error) {
      this.warnings.push(`Linting failed: ${error.message}`);
    }
  }

  async checkSecurityHeaders() {
    this.log('🔒 Checking security configuration...', 'info');
    
    // Check for security middleware
    const securityMiddlewarePath = join(this.rootDir, 'lib/middleware/security.ts');
    if (existsSync(securityMiddlewarePath)) {
      this.success.push('✓ Security middleware found');
    } else {
      this.errors.push('Security middleware not found');
    }
    
    // Check for rate limiting
    const rateLimitPath = join(this.rootDir, 'lib/middleware/rate-limit.ts');
    if (existsSync(rateLimitPath)) {
      this.success.push('✓ Rate limiting middleware found');
    } else {
      this.errors.push('Rate limiting middleware not found');
    }
    
    // Check for authentication
    const authPath = join(this.rootDir, 'lib/middleware/auth.ts');
    if (existsSync(authPath)) {
      this.success.push('✓ Authentication middleware found');
    } else {
      this.errors.push('Authentication middleware not found');
    }
  }

  async checkFirebaseConfig() {
    this.log('🔥 Checking Firebase configuration...', 'info');
    
    const firebaseConfigPath = join(this.rootDir, 'lib/firebase/config.ts');
    const firebaseAdminPath = join(this.rootDir, 'lib/firebase/admin.ts');
    
    if (existsSync(firebaseConfigPath)) {
      this.success.push('✓ Firebase client config found');
    } else {
      this.errors.push('Firebase client config not found');
    }
    
    if (existsSync(firebaseAdminPath)) {
      this.success.push('✓ Firebase admin config found');
    } else {
      this.errors.push('Firebase admin config not found');
    }
    
    // Check for proper environment validation
    const configContent = readFileSync(firebaseConfigPath, 'utf8');
    if (configContent.includes('requiredEnvVars')) {
      this.success.push('✓ Firebase environment validation implemented');
    } else {
      this.warnings.push('Firebase environment validation not found');
    }
  }

  async checkAPIRoutes() {
    this.log('🛣️  Checking API routes...', 'info');
    
    const apiDir = join(this.rootDir, 'app/api');
    if (!existsSync(apiDir)) {
      this.errors.push('API routes directory not found');
      return;
    }
    
    const criticalRoutes = [
      'auth/login',
      'auth/register',
      'agent',
      'webhook/whatsapp',
      'properties',
      'reservations',
      'analytics',
    ];
    
    for (const route of criticalRoutes) {
      const routePath = join(apiDir, route, 'route.ts');
      if (existsSync(routePath)) {
        this.success.push(`✓ API route: ${route}`);
      } else {
        this.warnings.push(`API route not found: ${route}`);
      }
    }
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log(`${colors.bold}${colors.cyan}PRODUCTION READINESS CHECK RESULTS${colors.reset}`);
    console.log('='.repeat(60));
    
    if (this.success.length > 0) {
      console.log(`\n${colors.green}${colors.bold}✅ SUCCESS (${this.success.length} items)${colors.reset}`);
      this.success.forEach(item => console.log(`${colors.green}  ${item}${colors.reset}`));
    }
    
    if (this.warnings.length > 0) {
      console.log(`\n${colors.yellow}${colors.bold}⚠️  WARNINGS (${this.warnings.length} items)${colors.reset}`);
      this.warnings.forEach(item => console.log(`${colors.yellow}  ${item}${colors.reset}`));
    }
    
    if (this.errors.length > 0) {
      console.log(`\n${colors.red}${colors.bold}❌ ERRORS (${this.errors.length} items)${colors.reset}`);
      this.errors.forEach(item => console.log(`${colors.red}  ${item}${colors.reset}`));
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (this.errors.length === 0) {
      console.log(`${colors.green}${colors.bold}🎉 PRODUCTION READY!${colors.reset}`);
      console.log(`${colors.green}The application is ready for production deployment.${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}${colors.bold}🚫 NOT PRODUCTION READY${colors.reset}`);
      console.log(`${colors.red}Please fix the ${this.errors.length} error(s) before deploying.${colors.reset}`);
      return false;
    }
  }

  async runAllChecks() {
    console.log(`${colors.bold}${colors.cyan}🔍 Starting Production Readiness Check...${colors.reset}\n`);
    
    await this.checkEnvironmentVariables();
    await this.checkFileStructure();
    await this.checkPackageJson();
    await this.checkNextConfig();
    await this.checkFirebaseConfig();
    await this.checkSecurityHeaders();
    await this.checkAPIRoutes();
    await this.checkTypeScript();
    await this.checkLinting();
    await this.checkBuildOutput();
    
    return this.printResults();
  }
}

// Run the checker
const checker = new ProductionChecker();
checker.runAllChecks()
  .then((isReady) => {
    process.exit(isReady ? 0 : 1);
  })
  .catch((error) => {
    console.error(`${colors.red}Fatal error: ${error.message}${colors.reset}`);
    process.exit(1);
  });