import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { miniSiteMiddleware } from '@/middleware/mini-site'

// Use a default JWT secret in development/build time
const JWT_SECRET_STRING = process.env.JWT_SECRET || 'default-development-secret-min-32-characters-long'
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING)

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check for mini-site subdomain/custom domain first
  const miniSiteResponse = miniSiteMiddleware(request);
  if (miniSiteResponse) {
    return miniSiteResponse;
  }

  // Mini-site routes - public access allowed
  if (pathname.startsWith('/mini-site/')) {
    return NextResponse.next()
  }

  // Legacy site routes - redirect to mini-site
  if (pathname.startsWith('/site/')) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.replace('/site/', '/mini-site/');
    return NextResponse.redirect(url, 301);
  }

  // API routes for mini-site - public access
  if (pathname.startsWith('/api/mini-site/')) {
    return NextResponse.next()
  }

  // Public routes - no authentication required
  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/reset-password',
    '/api/webhook/whatsapp',
    '/api/webhook/whatsapp-web',
    '/api/auth',
    '/api/agent',
    '/api/whatsapp/session',
    '/api/config/whatsapp'
  ]

  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Protected routes require authentication
  const authToken = request.cookies.get('auth-token')?.value

  if (!authToken) {
    // Redirect to login for protected routes
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  try {
    // Verify the token using jose directly (Edge Runtime compatible)
    const { payload } = await jwtVerify(authToken, JWT_SECRET)
    
    if (!payload || !payload.sub) {
      // Invalid token - redirect to login
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    // Add user info to headers for downstream use
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', payload.sub as string)
    requestHeaders.set('x-tenant-id', (payload.tenantId as string) || (payload.sub as string)) // Use userId as tenantId if no specific tenantId
    requestHeaders.set('x-user-role', payload.role as string)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  } catch (error) {
    // Invalid token - redirect to login
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}