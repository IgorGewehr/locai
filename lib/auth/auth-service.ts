import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  tenantId: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface AuthTokenPayload {
  sub: string; // user id
  email: string;
  name: string;
  role: string;
  tenantId: string;
  iat: number;
  exp: number;
}

class AuthService {
  private secret: Uint8Array | null = null;

  private getSecret(): Uint8Array {
    if (!this.secret) {
      if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is required');
      }
      this.secret = new TextEncoder().encode(process.env.JWT_SECRET);
    }
    return this.secret;
  }

  async generateToken(user: User): Promise<string> {
    const payload: Omit<AuthTokenPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      tenantId: user.tenantId,
    };

    const token = await new SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d') // 7 days
      .sign(this.getSecret());

    return token;
  }

  async verifyToken(token: string): Promise<AuthTokenPayload | null> {
    try {
      const { payload } = await jwtVerify(token, this.getSecret());
      return payload as AuthTokenPayload;
    } catch (error) {

      return null;
    }
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }

  async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async setAuthCookie(token: string): Promise<void> {
    const cookieStore = cookies();
    cookieStore.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });
  }

  async clearAuthCookie(): Promise<void> {
    const cookieStore = cookies();
    cookieStore.delete('auth-token');
  }

  async getAuthToken(): Promise<string | null> {
    const cookieStore = cookies();
    const authCookie = cookieStore.get('auth-token');
    return authCookie?.value || null;
  }

  async getCurrentUser(): Promise<User | null> {
    const token = await this.getAuthToken();

    if (!token) {
      return null;
    }

    const payload = await this.verifyToken(token);

    if (!payload) {
      return null;
    }

    // In a real app, you'd fetch user details from database
    // For now, return user info from token
    return {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role as 'admin' | 'user',
      tenantId: payload.tenantId,
      createdAt: new Date(payload.iat * 1000),
    };
  }

  async requireAuth(request: NextRequest): Promise<{ user: User; token: string } | NextResponse> {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Token de autenticação necessário',
          code: 'UNAUTHORIZED' 
        },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    
    try {
      // Verify directly as Firebase ID token (simplified approach)
      const admin = await import('firebase-admin');
      
      // Initialize Firebase Admin if not already done
      if (!admin.apps.length) {
        // Hardcoded Firebase Admin configuration to match frontend
        const FIREBASE_PROJECT_ID = 'locai-76dcf';
        const FIREBASE_CLIENT_EMAIL = 'firebase-adminsdk-fbsvc@locai-76dcf.iam.gserviceaccount.com';
        const FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDASTbJp3VRgZpl\ntr2uvLkwpcR5sVmIQA33ziSCktN1tjTAfjLROFvoh4LfJs3Vv6h4qgXvpXpCW8vH\nyCJlDIkzKlPkm/3RuDshdnzHRKpNDRmee3VCcyS3KNJCO2Jwjcl6bSA0IJis6nJa\nLArB/rgh1KclZcHZtN5wur9GDzHiXGdaaSOSO2Jnl8UPTb0Hrbf0ZVXGX2mWRwOx\nTnJGnmNXzmrDHgWmEZlqu8PYmOTSNJZO6Ra+wCXqX25QjR9Do1ICdymBnSl7i/Hw\nxgL+I0kovYkrN+qm2BbQRsy4eaTxn+K+6DOhlbBTEhuZr/uaUUpEHDCorXg+btnk\nW7l476WpAgMBAAECggEAGrDO+xTUkxjDXsUL9Vpa9ma8LAwzGleR2MjzhnBtC9Tb\n47Bgy2vgThmpT+JqBfaRoxYutsIog1eMpNGh/JbN4J1KgdwpUlgZVR7GWT6tyP49\nhSMr9qpW+VmgPfNSSb9UrTrCkpnHt5DfiKa+Y4lA8+k5vlYun1Kc4db6P/ZR/VKK\nqJY0J4C2+2j8nW1GrOxkSaP0HGkaS35LCsFLPGYWcrC6egeh7sO8GfO7VrlRW0Wp\nnT8QTVf64dR0894Lm7Re2CeOTeFZ7nS786rbSg7wLHrVnkabZyS8UKSvflYkJJmC\nDWjGjZSvPQefrrGCqzYZ+j3RzBR5qkPn1IzyNW8uJQKBgQDgyQZWF1UTLBL6Vx8C\n8Z/dWt2rcP4OlOSTBbGMYfg3x4BZEXUjBXcxnPdbKMPFpd5KrlrjHe7nNtrwR8uo\niwwsDPc1A14adh/VFp7oBi509eTandhQ0iGyAZrvPEf+M+tkAHjrornBGNP0l/6A\nlrQei+5+jy7apfA9QwnrqSNuiwKBgQDa/NxhM4Jd3MSzICOUgxlixhlGT0SE5At/\nPwG6XhGsdNWQZGjArY6z2ZdYxjbhwKsk6FMPywVpiZPkQwk9Ces/KJ77WOmn1UEL\nlyA9eNYe0TJHzknpwj98Co5BwFyxnF4cj89FkLxzGt6Jb3dqRyi+3B7WCeWQJsnN\nYsvUqt2XGwKBgAe7IjqnxsdIBscRZAGn6cWlMGaLFlHOESZ1VavsWqsgc2uczBiO\nQZE1QtShzEnp8IFFCd8x0lulaVZGQdzkG2EQeRgbq4rhcSrVAlYckFB5fIuATkZJ\nU9tZbsi3nApEIt5nncEM8bKQdgm9iIVHqZ47VdKIfiYK+v5AZgDy6kMNAoGALiKd\nj0DZ00qCijZYKJ6iB4QyqPRkPBcLMQimJYxR7uJCaAQvaYBnEw7hast/nnoH1GO5\ntBcSkdRxOuLAnIJtdEXrkIp/12L/LCDvouPFQILUM/qK6duJomla5RFQtf56eUv2\n3/IJMbrUbWH1Z4eMVwFq4a7+FSuG0mVhCfHhc0cCgYBjMbgal53mlfOFZmgMB14r\nj1K0R1oo+daZhYWSPQXLS3hfTXgSxPoz8YG9H9O1uOOHII2wRIJE7Gm4jFq7DhIr\n1mK13TR6WLNH1gJeIp/eH781RiCbBTzMikjGEu4bAunGu8rS0czTQreDI62VHfS/\n/suP25cNFjVc1+xWcoL7Ig==\n-----END PRIVATE KEY-----\n";
        
        // Parse the private key (handle escaped newlines)
        const privateKey = FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
          
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: FIREBASE_PROJECT_ID,
            clientEmail: FIREBASE_CLIENT_EMAIL,
            privateKey,
          }),
          projectId: FIREBASE_PROJECT_ID
        });
      }
      
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      if (decodedToken) {
        // Convert Firebase token to our user format
        const user: User = {
          id: decodedToken.uid,
          email: decodedToken.email || '',
          name: decodedToken.name || decodedToken.email?.split('@')[0] || '',
          role: 'user',
          tenantId: decodedToken.uid,
          createdAt: new Date(),
        };
        
        return { user, token };
      }
    } catch (firebaseError) {
      console.warn('⚠️ [AuthService] Firebase token verification failed:', firebaseError);
    }
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Token inválido ou expirado',
        code: 'INVALID_TOKEN' 
      },
      { status: 401 }
    );
  }

  async requireRole(user: User, requiredRole: 'admin' | 'user'): Promise<boolean> {
    if (requiredRole === 'admin' && user.role !== 'admin') {
      return false;
    }
    return true;
  }

  // Generate a secure random token for password reset, etc.
  generateSecureToken(): string {
    return crypto.randomUUID();
  }

  // Basic rate limiting for auth endpoints
  private loginAttempts = new Map<string, { count: number; lastAttempt: Date }>();

  async checkRateLimit(identifier: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): Promise<boolean> {
    const now = new Date();
    const attempts = this.loginAttempts.get(identifier);

    if (!attempts) {
      this.loginAttempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    const timeSinceLastAttempt = now.getTime() - attempts.lastAttempt.getTime();

    if (timeSinceLastAttempt > windowMs) {
      // Reset window
      this.loginAttempts.set(identifier, { count: 1, lastAttempt: now });
      return true;
    }

    if (attempts.count >= maxAttempts) {
      return false;
    }

    attempts.count++;
    attempts.lastAttempt = now;
    return true;
  }

  async clearRateLimit(identifier: string): Promise<void> {
    this.loginAttempts.delete(identifier);
  }
}

export const authService = new AuthService();