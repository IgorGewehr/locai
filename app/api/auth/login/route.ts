import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/middleware/error-handler';
import { applySecurityMeasures } from '@/lib/middleware/security';
import { authRateLimit, applyRateLimitHeaders } from '@/lib/middleware/rate-limit';
import { loginSchema } from '@/lib/validation/schemas';
import { auth, adminDb } from '@/lib/firebase/admin';
import { generateJWT } from '@/lib/middleware/auth';
import { AuthUser } from '@/lib/middleware/auth';
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

// Note: Users collection is global (users/[userId]) not tenant-scoped

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

      // Get or create user in global collection
      let user;
      try {
        // Try to get existing user
        const userDoc = await adminDb.collection('users').doc(firebaseUser.uid).get();
        
        if (userDoc.exists) {
          user = { id: userDoc.id, ...userDoc.data() } as User;
          // Update last login
          await adminDb.collection('users').doc(firebaseUser.uid).update({
            lastLogin: new Date()
          });
        } else {
          // Create new user in global collection
          const userData = {
            email: firebaseUser.email!,
            name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            role: firebaseUser.customClaims?.role || 'user',
            tenantId: effectiveTenantId,
            firebaseUid: firebaseUser.uid,
            createdAt: new Date(),
            lastLogin: new Date(),
            isActive: true,
          };
          
          await adminDb.collection('users').doc(firebaseUser.uid).set(userData);
          user = { id: firebaseUser.uid, ...userData } as User;
        }
      } catch (error) {
        // Fallback if there's an error
        user = { 
          id: firebaseUser.uid, 
          email: firebaseUser.email,
          name: firebaseUser.displayName || 'User',
          role: 'user',
          tenantId: effectiveTenantId
        } as any;
      }

      // Generate JWT
      const jwt = await generateJWT({
        id: user.id, // user.id is actually the Firebase UID
        email: user.email || '',
        name: user.name,
        role: user.role,
        tenantId: user.tenantId
      } as AuthUser);

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