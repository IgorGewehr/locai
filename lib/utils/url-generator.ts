/**
 * Utilities para geração de URLs do mini-site
 */

export interface MiniSiteUrlConfig {
  tenantId: string;
  subdomain?: string;
  customDomain?: string;
  isProduction?: boolean;
}

/**
 * Gera a URL do mini-site baseado na configuração
 */
export function generateMiniSiteUrl(config: MiniSiteUrlConfig): string {
  const { tenantId, subdomain, customDomain, isProduction = false } = config;

  // Se tem domínio customizado, usa ele
  if (customDomain) {
    return `https://${customDomain}`;
  }

  // Se tem subdomínio configurado, usa o formato subdomínio
  if (subdomain) {
    const baseDomain = isProduction 
      ? process.env.NEXT_PUBLIC_BASE_DOMAIN || 'locai.app' 
      : 'localhost:3001';
    
    return isProduction 
      ? `https://${subdomain}.${baseDomain}`
      : `http://${subdomain}.${baseDomain}`;
  }

  // Formato padrão: site/tenantId
  const baseUrl = isProduction
    ? process.env.NEXT_PUBLIC_APP_URL || 'https://app.locai.com'
    : 'http://localhost:3001';

  return `${baseUrl}/site/${tenantId}`;
}

/**
 * Gera URL para compartilhamento em redes sociais
 */
export function generateSocialShareUrl(
  platform: 'whatsapp' | 'facebook' | 'twitter' | 'linkedin',
  miniSiteUrl: string,
  message?: string
): string {
  const encodedUrl = encodeURIComponent(miniSiteUrl);
  const defaultMessage = 'Confira essas propriedades incríveis para aluguel por temporada!';
  const encodedMessage = encodeURIComponent(message || defaultMessage);

  switch (platform) {
    case 'whatsapp':
      return `https://wa.me/?text=${encodedMessage}%20${encodedUrl}`;
    
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    
    case 'twitter':
      return `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedMessage}`;
    
    case 'linkedin':
      return `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
    
    default:
      return miniSiteUrl;
  }
}

/**
 * Valida se uma URL de mini-site é válida
 */
export function validateMiniSiteUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    
    // Verifica se é HTTP ou HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return false;
    }

    // Verifica se tem um hostname válido
    if (!urlObj.hostname || urlObj.hostname.length < 3) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Extrai o tenant ID de uma URL de mini-site
 */
export function extractTenantIdFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    
    // Formato /site/tenantId
    const pathMatch = urlObj.pathname.match(/^\/site\/([^\/]+)$/);
    if (pathMatch) {
      return pathMatch[1];
    }

    // Formato subdomínio
    const subdomainMatch = urlObj.hostname.match(/^([^.]+)\./);
    if (subdomainMatch && subdomainMatch[1] !== 'www') {
      return subdomainMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Gera QR Code URL para o mini-site
 */
export function generateQRCodeUrl(miniSiteUrl: string, size: number = 200): string {
  const encodedUrl = encodeURIComponent(miniSiteUrl);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodedUrl}&format=png&bgcolor=ffffff&color=000000&margin=10&qzone=1&ecc=L`;
}

/**
 * Gera URL de preview do mini-site com parâmetros especiais
 */
export function generatePreviewUrl(tenantId: string, preview: boolean = true): string {
  const baseUrl = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'http://localhost:3001';
  
  const url = `${baseUrl}/site/${tenantId}`;
  
  if (preview) {
    return `${url}?preview=true&timestamp=${Date.now()}`;
  }
  
  return url;
}

/**
 * Formata URL para exibição amigável
 */
export function formatUrlForDisplay(url: string, maxLength: number = 50): string {
  try {
    const urlObj = new URL(url);
    let display = urlObj.hostname + urlObj.pathname;
    
    if (display.length > maxLength) {
      display = display.substring(0, maxLength - 3) + '...';
    }
    
    return display;
  } catch {
    return url.length > maxLength ? url.substring(0, maxLength - 3) + '...' : url;
  }
}