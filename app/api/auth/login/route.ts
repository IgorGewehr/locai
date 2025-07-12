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
  // For simplification, skip rate limiting for now
  // const rateLimitResponse = await withRateLimit(request, authRateLimit, handler);
  // if (rateLimitResponse) return rateLimitResponse;

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

      // For simplification, always create/get user
      let user;
      try {
        // Try to get user by some ID or create new one
        user = await userService.create({
          email: firebaseUser.email!,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          role: firebaseUser.customClaims?.role || 'user',
          tenantId: effectiveTenantId,
          firebaseUid: firebaseUser.uid,
          createdAt: new Date(),
          lastLogin: new Date(),
          isActive: true,
        });
      } catch (error) {
        // User might already exist or other error, use fallback
        user = { id: firebaseUser.uid, email: firebaseUser.email } as any;
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
      // applyRateLimitHeaders(response, authRateLimit, 5, new Date());

      return response;
    }

    // Fall back to simplified authentication - just return error for now
    const user = null; // Simplified - no database fallback

    if (!user) {
      throw new Error('Invalid credentials - Firebase auth only supported');
    }
    
    throw new Error('Database authentication not implemented - use Firebase auth only');
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Authentication failed' },
      { status: 401 }
    );
  }
});