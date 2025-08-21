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
    
    // First try to verify as our custom JWT
    let payload = await this.verifyToken(token);
    
    // If custom JWT fails, try Firebase token verification
    if (!payload) {
      try {
        // Try to verify as Firebase ID token
        const admin = await import('firebase-admin');
        
        // Initialize Firebase Admin if not already done
        if (!admin.apps.length) {
          // Use service account from environment or default credentials
          const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY 
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
            : undefined;
            
          admin.initializeApp({
            credential: serviceAccount 
              ? admin.credential.cert(serviceAccount)
              : admin.credential.applicationDefault(),
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
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
        console.warn('⚠️ [AuthService] Firebase token verification also failed:', firebaseError);
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

    const user: User = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role as 'admin' | 'user',
      tenantId: payload.tenantId,
      createdAt: new Date(payload.iat * 1000),
    };

    return { user, token };
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