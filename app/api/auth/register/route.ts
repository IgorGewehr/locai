import { NextRequest } from 'next/server';
import { withErrorHandler, successResponse } from '@/lib/middleware/error-handler';
import { applySecurityMeasures } from '@/lib/middleware/security';
import { authRateLimit, applyRateLimitHeaders } from '@/lib/middleware/rate-limit';
import { registerSchema } from '@/lib/validation/schemas';
import { auth } from '@/lib/firebase/admin';
import { generateJWT } from '@/lib/middleware/auth';
import { FirestoreService } from '@/lib/firebase/firestore';
import bcrypt from 'bcryptjs';
import { AuthenticationError, ConflictError } from '@/lib/utils/errors';

// User interface
interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'agent' | 'user';
  tenantId: string;
  passwordHash?: string;
  firebaseUid?: string;
  phoneNumber?: string;
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
  const validatedData = registerSchema.parse(body);
  const { email, password, name, phoneNumber, tenantId, role } = validatedData;

  // Determine tenant
  const effectiveTenantId = tenantId || process.env.NEXT_PUBLIC_TENANT_ID || 'default';

  try {
    // Check if user already exists
    const existingUser = await userService.findOne([
      ['email', '==', email.toLowerCase()],
      ['tenantId', '==', effectiveTenantId]
    ]);

    if (existingUser) {
      throw new ConflictError('User already exists');
    }

    // Create Firebase user
    let firebaseUid: string | undefined;
    try {
      const firebaseUser = await auth.createUser({
        email,
        password,
        displayName: name,
        phoneNumber,
      });

      // Set custom claims
      await auth.setCustomUserClaims(firebaseUser.uid, {
        role,
        tenantId: effectiveTenantId,
      });

      firebaseUid = firebaseUser.uid;
    } catch (error: any) {
      // If Firebase fails, we can still create a local user

    }

    // Hash password for local storage
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user document
    const user = await userService.create({
      email: email.toLowerCase(),
      name,
      role,
      tenantId: effectiveTenantId,
      passwordHash,
      firebaseUid,
      phoneNumber,
      createdAt: new Date(),
      lastLogin: new Date(),
      isActive: true,
    });

    // Generate JWT
    const jwt = generateJWT({
      uid: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role,
    });

    // Generate Firebase custom token if user was created
    let firebaseToken: string | undefined;
    if (firebaseUid) {
      firebaseToken = await auth.createCustomToken(firebaseUid, {
        email: user.email,
        role: user.role,
        tenantId: user.tenantId,
      });
    }

    const response = successResponse({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
      },
      token: jwt,
      firebaseToken,
    }, 201);

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
    if (error instanceof ConflictError) {
      throw error;
    }

    // Check for Firebase-specific errors
    if (error.code === 'auth/email-already-exists') {
      throw new ConflictError('Email already in use');
    }

    if (error.code === 'auth/invalid-password') {
      throw new AuthenticationError('Password does not meet requirements');
    }

    throw new Error('Registration failed');
  }
});