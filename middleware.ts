import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Define protected routes
const protectedRoutes = ['/dashboard', '/admin'];
const apiProtectedRoutes = ['/api/properties', '/api/reservations', '/api/clients', '/api/analytics'];
const publicRoutes = ['/login', '/register', '/'];
const webhookRoutes = ['/api/webhook'];

// Helper function to verify JWT token
async function verifyToken(token: string): Promise<boolean> {
  try {
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not set');
      return false;
    }
    
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);
    return true;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return false;
  }
}

// Helper function to check if route is protected
function isProtectedRoute(pathname: string): boolean {
  return protectedRoutes.some(route => pathname.startsWith(route));
}

// Helper function to check if API route is protected
function isProtectedApiRoute(pathname: string): boolean {
  return apiProtectedRoutes.some(route => pathname.startsWith(route));
}

// Helper function to check if route is webhook
function isWebhookRoute(pathname: string): boolean {
  return webhookRoutes.some(route => pathname.startsWith(route));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname.startsWith('/favicon')
  ) {
    return NextResponse.next();
  }

  // Allow webhook routes without authentication
  if (isWebhookRoute(pathname)) {
    return NextResponse.next();
  }

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    if (isProtectedApiRoute(pathname)) {
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
      const isValid = await verifyToken(token);
      
      if (!isValid) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Token inválido ou expirado',
            code: 'INVALID_TOKEN' 
          },
          { status: 401 }
        );
      }
    }
    
    // Add security headers to all API responses
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    return response;
  }

  // Handle protected page routes
  if (isProtectedRoute(pathname)) {
    // Check for authentication cookie/token
    const authCookie = request.cookies.get('auth-token');
    
    if (!authCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const isValid = await verifyToken(authCookie.value);
    
    if (!isValid) {
      // Clear invalid token
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth-token');
      return response;
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
};