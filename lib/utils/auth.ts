import { NextRequest } from 'next/server';
import { User } from 'firebase/auth';
import { logger } from '@/lib/utils/logger';
import { getAuth } from 'firebase-admin/auth';
import { getApps } from 'firebase-admin/app';

// Get admin auth dynamically to avoid null issues
function getAdminAuth() {
  const apps = getApps();
  if (apps.length === 0) {
    throw new Error('Firebase Admin not initialized');
  }
  return getAuth(apps[0]);
}

export async function verifyAuth(request: NextRequest): Promise<User | null> {
  try {
    // Check for authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return null;
    }

    // Enhanced token verification for Railway production
    const isRailway = !!process.env.RAILWAY_PROJECT_ID;
    
    // Railway optimization: Use checkRevoked only in production for performance
    const verifyOptions = {
      checkRevoked: isRailway && process.env.NODE_ENV === 'production'
    };

    // Verify the token with Firebase Admin - remove timeout that causes issues
    const adminAuth = getAdminAuth();
    
    const decodedToken = await adminAuth.verifyIdToken(token, verifyOptions);
    
    // Enhanced user data for Railway
    return {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      displayName: decodedToken.name || null,
      photoURL: decodedToken.picture || null,
      tenantId: decodedToken.uid, // Use UID as tenantId
      // Railway metadata
      _railwayAuth: {
        verified: true,
        timestamp: Date.now(),
        issuedAt: decodedToken.iat,
        expiresAt: decodedToken.exp
      }
    } as User & { tenantId: string };
  } catch (error) {
    // Enhanced error logging for Railway debugging
    logger.error('❌ [Auth] Token verification error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: error?.code,
      isRailway: !!process.env.RAILWAY_PROJECT_ID,
      hasToken: !!(request.headers.get('authorization')?.split(' ')[1]),
      tokenLength: request.headers.get('authorization')?.split(' ')[1]?.length,
      userAgent: request.headers.get('user-agent')?.substring(0, 100),
      adminAuthInitialized: getApps().length > 0
    });
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