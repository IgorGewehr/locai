import { NextRequest } from 'next/server';
import { authService } from '@/lib/auth/auth-service';
import { logger } from '@/lib/utils/logger';

export interface AuthInfo {
  userId: string;
  email: string;
  tenantId?: string;
}

export async function getAuthFromCookie(request: NextRequest): Promise<AuthInfo | null> {
  try {
    const authToken = request.cookies.get('auth-token')?.value;
    
    if (!authToken) {
      logger.warn('No auth token found in cookies');
      return null;
    }

    // Try to verify as JWT first
    try {
      const payload = await authService.verifyToken(authToken);
      if (payload) {
        // Log reduzido - apenas em debug
        if (process.env.LOG_LEVEL === 'debug') {
          logger.info('✅ JWT verified', {
            userId: payload.sub?.substring(0, 8) + '***'
          });
        }
        
        return {
          userId: payload.sub,
          email: payload.email,
          tenantId: payload.tenantId,
        };
      }
    } catch (jwtError) {
      // If JWT fails, try base64 for backward compatibility
      try {
        const decoded = Buffer.from(authToken, 'base64').toString('utf-8');
        const [userId, email, timestamp] = decoded.split(':');

        if (userId && email) {
          // Check if token is not too old (7 days)
          const tokenAge = Date.now() - parseInt(timestamp);
          if (tokenAge <= 7 * 24 * 60 * 60 * 1000) {
            logger.warn('Using legacy base64 token - should migrate to JWT', {
              userId,
              tenantId: userId
            });
            
            return {
              userId,
              email,
              tenantId: userId, // Use userId as tenantId for legacy tokens
            };
          }
        }
      } catch (base64Error) {
        // Both JWT and base64 failed
      }
    }

    logger.warn('Failed to parse auth token');
    return null;
  } catch (error) {
    logger.error('Error parsing auth cookie:', error);
    return null;
  }
}

export function setAuthCookie(userId: string, email: string): string {
  const token = Buffer.from(`${userId}:${email}:${Date.now()}`).toString('base64');
  return `auth-token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; samesite=lax`;
}