import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware para lidar com subdomínios de mini-sites
 */
export function miniSiteMiddleware(request: NextRequest) {
  const { pathname, hostname } = request.nextUrl;
  
  // Só processar se não for localhost
  if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
    return NextResponse.next();
  }

  const baseDomain = process.env.NEXT_PUBLIC_BASE_DOMAIN || 'locai.app';
  const miniSiteDomain = process.env.NEXT_PUBLIC_MINI_SITE_DOMAIN || 'sites.locai.app';

  // Se for um subdomínio de mini-site
  if (hostname.endsWith(`.${miniSiteDomain}`)) {
    const subdomain = hostname.replace(`.${miniSiteDomain}`, '');
    
    // Reescrever para a rota /site/[tenantId]
    const url = request.nextUrl.clone();
    url.pathname = `/site/${subdomain}${pathname}`;
    
    return NextResponse.rewrite(url);
  }

  // Se for domínio customizado, verificar no banco de dados
  if (!hostname.includes(baseDomain) && !hostname.includes('vercel.app')) {
    // Em produção, você pode fazer uma consulta ao banco para verificar
    // se é um domínio customizado configurado por algum usuário
    
    // Por enquanto, assumir que é um domínio customizado e redirecionar
    const url = request.nextUrl.clone();
    url.pathname = `/site/custom-domain${pathname}`;
    url.searchParams.set('domain', hostname);
    
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}