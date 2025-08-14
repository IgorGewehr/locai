// RAILWAY PRODUCTION AUTH WITH HARDCODED VALUES FOR TESTING
// This file uses hardcoded values to bypass Railway environment variable issues

import { NextRequest } from 'next/server';
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';
import { User } from 'firebase/auth';
import { logger } from '@/lib/utils/logger';

// HARDCODED FIREBASE ADMIN CONFIG (SAME AS IN admin.ts)
const FIREBASE_PROJECT_ID = 'locai-76dcf';
const FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@locai-76dcf.iam.gserviceaccount.com';
const FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDASTbJp3VRgZpl\ntr2uvLkwpcR5sVmIQA33ziSCktN1tjTAfjLROFvoh4LfJs3Vv6h4qgXvpXpCW8vH\nyCJlDIkzKlPkm/3RuDshdnzHRKpNDRmee3VCcyS3KNJCO2Jwjcl6bSA0IJis6nJa\nLArB/rgh1KclZcHZtN5wur9GDzHiXGdaaSOSO2Jnl8UPTb0Hrbf0ZVXGX2mWRwOx\nTnJGnmNXzmrDHgWmEZlqu8PYmOTSNJZO6Ra+wCXqX25QjR9Do1ICdymBnSl7i/Hw\nxgL+I0kovYkrN+qm2BbQRsy4eaTxn+K+6DOhlbBTEhuZr/uaUUpEHDCorXg+btnk\nW7l476WpAgMBAAECggEAGrDO+xTUkxjDXsUL9Vpa9ma8LAwzGleR2MjzhnBtC9Tb\n47Bgy2vgThmpT+JqBfaRoxYutsIog1eMpNGh/JbN4J1KgdwpUlgZVR7GWT6tyP49\nhSMr9qpW+VmgPfNSSb9UrTrCkpnHt5DfiKa+Y4lA8+k5vlYun1Kc4db6P/ZR/VKK\nqJY0J4C2+2j8nW1GrOxkSaP0HGkaS35LCsFLPGYWcrC6egeh7sO8GfO7VrlRW0Wp\nnT8QTVf64dR0894Lm7Re2CeOTeFZ7nS786rbSg7wLHrVnkabZyS8UKSvflYkJJmC\nDWjGjZSvPQefrrGCqzYZ+j3RzBR5qkPn1IzyNW8uJQKBgQDgyQZWF1UTLBL6Vx8C\n8Z/dWt2rcP4OlOSTBbGMYfg3x4BZEXUjBXcxnPdbKMPFpd5KrlrjHe7nNtrwR8uo\niwwsDPc1A14adh/VFp7oBi509eTandhQ0iGyAZrvPEf+M+tkAHjrornBGNP0l/6A\nlrQei+5+jy7apfA9QwnrqSNuiwKBgQDa/NxhM4Jd3MSzICOUgxlixhlGT0SE5At/\nPwG6XhGsdNWQZGjArY6z2ZdYxjbhwKsk6FMPywVpiZPkQwk9Ces/KJ77WOmn1UEL\nlyA9eNYe0TJHzknpwj98Co5BwFyxnF4cj89FkLxzGt6Jb3dqRyi+3B7WCeWQJsnN\nYsvUqt2XGwKBgAe7IjqnxsdIBscRZAGn6cWlMGaLFlHOESZ1VavsWqsgc2uczBiO\nQZE1QtShzEnp8IFFCd8x0lulaVZGQdzkG2EQeRgbq4rhcSrVAlYckFB5fIuATkZJ\nU9tZbsi3nApEIt5nncEM8bKQdgm9iIVHqZ47VdKIfiYK+v5AZgDy6kMNAoGALiKd\nj0DZ00qCijZYKJ6iB4QyqPRkPBcLMQimJYxR7uJCaAQvaYBnEw7hast/nnoH1GO5\ntBcSkdRxOuLAnIJtdEXrkIp/12L/LCDvouPFQILUM/qK6duJomla5RFQtf56eUv2\n3/IJMbrUbWH1Z4eMVwFq4a7+FSuG0mVhCfHhc0cCgYBjMbgal53mlfOFZmgMB14r\nj1K0R1oo+daZhYWSPQXLS3hfTXgSxPoz8YG9H9O1uOOHII2wRIJE7Gm4jFq7DhIr\n1mK13TR6WLNH1gJeIp/eH781RiCbBTzMikjGEu4bAunGu8rS0czTQreDI62VHfS/\n/suP25cNFjVc1+xWcoL7Ig==\n-----END PRIVATE KEY-----\n";

// Initialize Firebase Admin locally
let adminApp: App | null = null;
let adminAuth: any = null;

function initializeFirebaseAdmin() {
  if (getApps().length === 0) {
    try {
      logger.info('🔧 [Auth Railway] Initializing Firebase Admin with hardcoded values');
      
      // Parse the private key (handle escaped newlines)
      const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');

      adminApp = initializeApp({
        credential: cert({
          projectId: FIREBASE_PROJECT_ID,
          clientEmail: FIREBASE_CLIENT_EMAIL,
          privateKey,
        }),
        projectId: FIREBASE_PROJECT_ID,
      });
      
      adminAuth = getAdminAuth(adminApp);
      
      logger.info('✅ [Auth Railway] Firebase Admin initialized successfully');
    } catch (error) {
      logger.error('❌ [Auth Railway] Firebase Admin initialization error:', error);
      throw new Error(`Firebase Admin initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  } else {
    adminApp = getApps()[0];
    adminAuth = getAdminAuth(adminApp);
  }
}

// Initialize on module load
initializeFirebaseAdmin();

export async function verifyAuthRailway(request: NextRequest): Promise<User | null> {
  try {
    logger.info('🔐 [Auth Railway] Starting auth verification with hardcoded Firebase Admin');
    
    // Check for authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.warn('⚠️ [Auth Railway] No valid authorization header');
      return null;
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      logger.warn('⚠️ [Auth Railway] No token found in authorization header');
      return null;
    }

    logger.info('🔍 [Auth Railway] Token received, length:', token.length);

    // Ensure Firebase Admin is initialized
    if (!adminAuth) {
      logger.error('❌ [Auth Railway] Firebase Admin Auth not initialized, attempting to initialize...');
      initializeFirebaseAdmin();
      
      if (!adminAuth) {
        throw new Error('Firebase Admin Auth could not be initialized');
      }
    }
    
    // Verify the token with Firebase Admin
    logger.info('🔒 [Auth Railway] Verifying token with Firebase Admin...');
    const decodedToken = await adminAuth.verifyIdToken(token, false); // Don't check revoked for performance
    
    logger.info('✅ [Auth Railway] Token verified successfully:', {
      uid: decodedToken.uid,
      email: decodedToken.email,
      projectId: decodedToken.aud // This should match FIREBASE_PROJECT_ID
    });
    
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
    logger.error('❌ [Auth Railway] Token verification error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCode: error?.code,
      errorDetails: error?.details,
      isRailway: true,
      hasToken: !!(request.headers.get('authorization')?.split(' ')[1]),
      tokenLength: request.headers.get('authorization')?.split(' ')[1]?.length,
      userAgent: request.headers.get('user-agent')?.substring(0, 100),
      adminAuthInitialized: !!adminAuth,
      firebaseProjectId: FIREBASE_PROJECT_ID
    });
    return null;
  }
}

export function requireAuthRailway(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    const user = await verifyAuthRailway(request);
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