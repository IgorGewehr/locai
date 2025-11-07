/**
 * Auth verification utility
 * Wrapper around Firebase Auth for consistent authentication
 */

import { NextRequest } from 'next/server';
import { validateFirebaseAuth, FirebaseAuthContext } from '@/lib/middleware/firebase-auth';

export interface AuthResult {
  authenticated: boolean;
  user?: {
    uid: string;
    email?: string;
    tenantId?: string;
    role?: string;
  };
}

/**
 * Verify authentication for API routes
 */
export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  const authContext: FirebaseAuthContext = await validateFirebaseAuth(request);

  if (!authContext.authenticated || !authContext.userId) {
    return {
      authenticated: false,
    };
  }

  return {
    authenticated: true,
    user: {
      uid: authContext.userId,
      email: authContext.email,
      tenantId: authContext.tenantId,
      role: authContext.role,
    },
  };
}
