// lib/middleware/auth.ts
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'

export interface AuthContext {
  authenticated: boolean
  userId?: string
  tenantId?: string
  role?: string
  isWhatsApp?: boolean
}

export async function validateAuth(req: NextRequest): Promise<AuthContext> {
  // Check if it's a WhatsApp webhook request
  const isWhatsApp = req.headers.get('x-whatsapp-signature') !== null ||
                     req.url.includes('/api/webhook/whatsapp')

  if (isWhatsApp) {
    // WhatsApp webhooks don't need session auth but should be verified separately
    return {
      authenticated: true,
      isWhatsApp: true
    }
  }

  // Check for API key authentication
  const apiKey = req.headers.get('x-api-key')
  if (apiKey && process.env.API_KEY) {
    if (apiKey === process.env.API_KEY) {
      // Extract tenant from API key or header
      const tenantId = req.headers.get('x-tenant-id') || process.env.TENANT_ID || 'default'
      return {
        authenticated: true,
        tenantId,
        role: 'api'
      }
    }
  }

  // Check for Bearer token
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any
      return {
        authenticated: true,
        userId: decoded.userId,
        tenantId: decoded.tenantId,
        role: decoded.role
      }
    } catch (error) {
      // Invalid token
    }
  }

  // Check for session authentication
  try {
    const session = await getServerSession(authOptions)
    if (session?.user) {
      return {
        authenticated: true,
        userId: session.user.id,
        tenantId: session.user.tenantId,
        role: session.user.role
      }
    }
  } catch (error) {
    // Session check failed
  }

  return {
    authenticated: false
  }
}

export function requireAuth(authContext: AuthContext): void {
  if (!authContext.authenticated) {
    throw new Error('Authentication required')
  }
}

export function requireTenant(authContext: AuthContext): string {
  if (!authContext.tenantId) {
    throw new Error('Tenant ID required')
  }
  return authContext.tenantId
}

export function requireRole(authContext: AuthContext, allowedRoles: string[]): void {
  requireAuth(authContext)
  
  if (!authContext.role || !allowedRoles.includes(authContext.role)) {
    throw new Error('Insufficient permissions')
  }
}

// Auth middleware function
export async function authMiddleware(req: NextRequest): Promise<AuthContext> {
  return validateAuth(req)
}