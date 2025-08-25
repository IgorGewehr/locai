import { MetadataRoute } from 'next';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { logger } from '@/lib/utils/logger';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://localhost:8080';
  
  try {
    // Get all active tenants with mini-sites
    // For now, we'll use a default tenant - in production, 
    // you'd query all tenants with active mini-sites
    const defaultTenantId = process.env.DEFAULT_TENANT_ID || 'default';
    const services = new TenantServiceFactory(defaultTenantId);
    
    // Get mini-site config to check if active
    const config = await services.miniSite.getConfig(defaultTenantId);
    
    const sitemapEntries: MetadataRoute.Sitemap = [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
      {
        url: `${baseUrl}/login`,
        lastModified: new Date(),
        changeFrequency: 'monthly',
        priority: 0.5,
      },
    ];

    // Add mini-site URLs if active
    if (config?.isActive) {
      sitemapEntries.push({
        url: `${baseUrl}/site/${defaultTenantId}`,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 0.9,
      });

      // Get all properties for sitemap
      const properties = await services.miniSite.getPublicProperties(defaultTenantId);
      
      properties.forEach(property => {
        sitemapEntries.push({
          url: `${baseUrl}/site/${defaultTenantId}/property/${property.id}`,
          lastModified: property.updatedAt || new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
        });
      });
    }

    logger.info('📍 [Sitemap] Generated', { 
      entries: sitemapEntries.length,
      hasActiveMiniSite: config?.isActive 
    });

    return sitemapEntries;
  } catch (error) {
    logger.error('❌ [Sitemap] Generation error', { 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
    
    // Return basic sitemap on error
    return [
      {
        url: baseUrl,
        lastModified: new Date(),
        changeFrequency: 'daily',
        priority: 1,
      },
    ];
  }
}