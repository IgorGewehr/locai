import { NextRequest } from 'next/server';
import { auth as adminAuth } from '@/lib/firebase/admin';
import { User } from 'firebase/auth';

export async function verifyAuth(request: NextRequest): Promise<User | null> {
  try {
    // Check for authorization header
    const authHeader = request.headers.get('authorization');
    console.log('🔍 [Auth] Authorization header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('⚠️ [Auth] Missing or invalid authorization header');
      return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      console.warn('⚠️ [Auth] Missing token in authorization header');
      return null;
    }

    console.log('🔑 [Auth] Verifying token:', token.substring(0, 20) + '...');

    // Verify the token with Firebase Admin
    const decodedToken = await adminAuth.verifyIdToken(token);
    console.log('✅ [Auth] Token verified for user:', decodedToken.uid);
    
    // Return user data with tenantId
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      displayName: decodedToken.name || null,
      photoURL: decodedToken.picture || null,
      tenantId: decodedToken.uid, // Use UID as tenantId
    } as User & { tenantId: string };
  } catch (error) {
    console.error('❌ [Auth] Token verification error:', error);
    return null;
  }
}

export function requireAuth(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const user = await verifyAuth(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    
    // Add user to request context
    (request as any).user = user;
    
    return handler(request, ...args);
  };
}