import { NextRequest } from 'next/server';

export interface AuthInfo {
  userId: string;
  email: string;
  tenantId?: string;
}

export async function getAuthFromCookie(request: NextRequest): Promise<AuthInfo | null> {
  try {
    const authToken = request.cookies.get('auth-token')?.value;
    
    if (!authToken) {
      return null;
    }

    // Decode the simple base64 token
    const decoded = Buffer.from(authToken, 'base64').toString('utf-8');
    const [userId, email, timestamp] = decoded.split(':');

    if (!userId || !email) {
      return null;
    }

    // Check if token is not too old (7 days)
    const tokenAge = Date.now() - parseInt(timestamp);
    if (tokenAge > 7 * 24 * 60 * 60 * 1000) {
      return null;
    }

    // Use userId as tenantId (since each user is their own tenant)
    const tenantId = request.headers.get('x-tenant-id') || userId;

    return {
      userId,
      email,
      tenantId,
    };
  } catch (error) {
    console.error('Error parsing auth cookie:', error);
    return null;
  }
}

export function setAuthCookie(userId: string, email: string): string {
  const token = Buffer.from(`${userId}:${email}:${Date.now()}`).toString('base64');
  return `auth-token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
}