import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { miniSiteMiddleware } from '@/middleware/mini-site'
import { adminAuthMiddleware } from '@/lib/middleware/admin-auth'
import { logger } from '@/lib/utils/logger'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 🔒 ROTA ADMIN ULTRA SECRETA - Verificação de segurança máxima
  if (pathname.startsWith('/dashboard/lkjhg')) {
    return await adminAuthMiddleware(request);
  }
  
  // API Admin routes - também protegidas
  if (pathname.startsWith('/api/admin/')) {
    const { verifyAdminAccess } = await import('@/lib/middleware/admin-auth');
    const { isAdmin } = await verifyAdminAccess(request);
    
    if (!isAdmin) {
      logger.warn('🚫 [Middleware] Tentativa de acesso a API admin negada', {
        component: 'Security',
        path: pathname,
        ip: request.ip
      });
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
  }

  // Check for mini-site subdomain/custom domain first
  const miniSiteResponse = miniSiteMiddleware(request);
  if (miniSiteResponse) {
    // Add security headers to mini-site response
    addSecurityHeaders(miniSiteResponse, pathname);
    return miniSiteResponse;
  }

  // Mini-site routes - public access allowed
  if (pathname.startsWith('/mini-site/')) {
    const response = NextResponse.next()
    addSecurityHeaders(response, pathname);
    return response
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
    '/login',
    '/signup',
    '/reset-password',
    '/api/webhook/whatsapp',
    '/api/webhook/whatsapp-web',
    '/api/auth',
    '/api/agent',
    '/api/public/',
    '/api/auth-test',
    '/api/diagnostic/',
    '/api/test-whatsapp-noauth'
  ]

  // Special handling for WhatsApp and other auth-protected API routes
  const authProtectedApiRoutes = [
    '/api/whatsapp/',
    '/api/config/whatsapp'
  ]

  // Check if this is a public route
  if (publicRoutes.some(route => pathname === route || pathname.startsWith(route))) {
    const response = NextResponse.next();
    
    // Add CORS headers for public API routes
    if (pathname.startsWith('/api/')) {
      const isProduction = process.env.NODE_ENV === 'production';
      const allowedOrigin = isProduction ? 'https://www.alugazap.com' : '*';
      
      response.headers.set('Access-Control-Allow-Origin', allowedOrigin);
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Tenant-Id, Origin, Accept');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('X-Public-Route', 'true');
    }
    
    return response;
  }

  // For auth-protected API routes, let them handle their own authentication
  if (authProtectedApiRoutes.some(route => pathname.startsWith(route))) {
    const response = NextResponse.next();
    
    // Add production headers for debugging
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      response.headers.set('X-Production-Auth-Route', 'true');
      response.headers.set('Access-Control-Allow-Origin', 'https://www.alugazap.com');
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, X-Tenant-Id, Origin, Accept');
    }
    
    return response;
  }

  // For protected routes, just pass through
  // Authentication will be handled by AuthProvider on the client side
  const response = NextResponse.next()
  
  // Add security headers
  addSecurityHeaders(response, pathname);
  return response
}

/**
 * Add security headers to response
 */
function addSecurityHeaders(response: NextResponse, pathname: string): void {
  // Basic security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy for mini-site routes
  if (pathname.startsWith('/site/') || pathname.startsWith('/mini-site/')) {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' https://firebasestorage.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://www.google-analytics.com; " +
      "frame-ancestors 'none';"
    );
  }

  // Permissions Policy
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
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