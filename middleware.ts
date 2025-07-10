import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define protected routes
const protectedRoutes = ['/dashboard', '/admin'];
const apiProtectedRoutes = ['/api/properties', '/api/reservations', '/api/clients', '/api/analytics'];
const publicRoutes = ['/login', '/signup', '/reset-password', '/'];
const publicApiRoutes = ['/api/auth'];
const webhookRoutes = ['/api/webhook'];

// Helper function to verify simple token
async function verifyToken(token: string): Promise<boolean> {
  try {
    // For now, just check if token is properly formatted
    // In production, you would verify the Firebase ID token
    const decoded = Buffer.from(token, 'base64').toString();
    const parts = decoded.split(':');
    
    // Simple validation: should have uid, email, and timestamp
    if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
      const timestamp = parseInt(parts[2]);
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      
      // Check if token is not older than 7 days
      return (now - timestamp) < sevenDays;
    }
    
    return false;
  } catch (error) {
    console.error('Token verification failed:', error);
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

// Helper function to check if API route is public
function isPublicApiRoute(pathname: string): boolean {
  return publicApiRoutes.some(route => pathname.startsWith(route));
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
    // Allow public API routes without authentication
    if (isPublicApiRoute(pathname)) {
      const response = NextResponse.next();
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      return response;
    }
    
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