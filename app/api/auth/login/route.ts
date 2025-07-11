import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/middleware/error-handler';
import { applySecurityMeasures } from '@/lib/middleware/security';
import { authRateLimit, applyRateLimitHeaders } from '@/lib/middleware/rate-limit';
import { loginSchema } from '@/lib/validation/schemas';
import { auth } from '@/lib/firebase/admin';
import { generateJWT } from '@/lib/middleware/auth';
import { FirestoreService } from '@/lib/firebase/firestore';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// User interface
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'user';
  tenantId: string;
  passwordHash?: string;
  firebaseUid?: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

// Initialize Firestore service for users
const userService = new FirestoreService<User>('users');

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Apply rate limiting
  const rateLimitResponse = await authRateLimit(request);
  if (rateLimitResponse) return rateLimitResponse;

  // Parse and validate body
  const body = await request.json();
  const validatedData = loginSchema.parse(body);
  const { email, password, tenantId } = validatedData;

  // Determine tenant
  const effectiveTenantId = tenantId || process.env.NEXT_PUBLIC_TENANT_ID || 'default';

  try {
    // Try Firebase authentication first
    const firebaseUser = await auth.getUserByEmail(email).catch(() => null);
    
    if (firebaseUser) {
      // Generate custom token for Firebase user
      const customToken = await auth.createCustomToken(firebaseUser.uid, {
        email: firebaseUser.email,
        role: firebaseUser.customClaims?.role || 'user',
        tenantId: effectiveTenantId,
      });

      // Get or create user document
      let user = await userService.findOne([
        ['firebaseUid', '==', firebaseUser.uid],
        ['tenantId', '==', effectiveTenantId]
      ]);

      if (!user) {
        // Create user document
        user = await userService.create({
          email: firebaseUser.email!,
          name: firebaseUser.displayName || firebaseUser.email!.split('@')[0],
          role: firebaseUser.customClaims?.role || 'user',
          tenantId: effectiveTenantId,
          firebaseUid: firebaseUser.uid,
          createdAt: new Date(),
          lastLogin: new Date(),
          isActive: true,
        });
      } else {
        // Update last login
        await userService.update(user.id, { lastLogin: new Date() });
      }

      // Generate JWT
      const jwt = generateJWT({
        uid: user.id,
        email: user.email,
        tenantId: user.tenantId,
        role: user.role,
      });

      const response = successResponse({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          tenantId: user.tenantId,
        },
        token: jwt,
        firebaseToken: customToken,
      });

      // Set auth cookie
      response.cookies.set('auth-token', jwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/',
      });

      // Apply security headers
      applySecurityMeasures(request, response);
      applyRateLimitHeaders(request, response);

      return response;
    }

    // Fall back to database authentication
    const user = await userService.findOne([
      ['email', '==', email.toLowerCase()],
      ['tenantId', '==', effectiveTenantId],
      ['isActive', '==', true]
    ]);

    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    await userService.update(user.id, { lastLogin: new Date() });

    // Generate JWT
    const jwt = generateJWT({
      uid: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    const response = successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
      token: jwt,
    });

    // Set auth cookie
    response.cookies.set('auth-token', jwt, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    // Apply security headers
    applySecurityMeasures(request, response);
    applyRateLimitHeaders(request, response);

    return response;

  } catch (error: any) {
    // Generic error message to prevent user enumeration
    throw new Error('Invalid credentials');
  }
});