import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export interface AuthUser {
  id: string
  email: string
  name: string
  tenantId: string
  role: string
}

export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    // Get session from NextAuth
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { 
          error: 'Não autorizado', 
          code: 'UNAUTHORIZED' 
        },
        { status: 401 }
      )
    }

    // Cast to our AuthUser type
    const user = session.user as AuthUser

    // Validate required fields
    if (!user.id || !user.tenantId) {
      return NextResponse.json(
        { 
          error: 'Sessão inválida', 
          code: 'INVALID_SESSION' 
        },
        { status: 401 }
      )
    }

    // Call the handler with authenticated user
    return handler(request, user)
  } catch (error) {
    console.error('Auth middleware error:', error)
    return NextResponse.json(
      { 
        error: 'Erro de autenticação', 
        code: 'AUTH_ERROR' 
      },
      { status: 500 }
    )
  }
}

// Role-based access control middleware
export async function withRole(
  request: NextRequest,
  allowedRoles: string[],
  handler: (request: NextRequest, user: AuthUser) => Promise<NextResponse>
): Promise<NextResponse> {
  return withAuth(request, async (req, user) => {
    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json(
        { 
          error: 'Acesso negado', 
          code: 'FORBIDDEN' 
        },
        { status: 403 }
      )
    }
    return handler(req, user)
  })
}