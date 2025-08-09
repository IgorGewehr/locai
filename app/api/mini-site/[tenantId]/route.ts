/**
 * Mini-Site API Routes
 * Public API endpoints for mini-site functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { z } from 'zod';
import { getCacheManager, cacheKeys, cacheTTL } from '@/lib/utils/cache-manager';
import { checkRateLimit, rateLimitConfigs } from '@/lib/utils/rate-limiter';
import { logger } from '@/lib/utils/logger';

const inquirySchema = z.object({
  propertyId: z.string().min(1),
  clientInfo: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    phone: z.string().min(1),
    preferredContact: z.enum(['whatsapp', 'email', 'phone']).default('whatsapp')
  }),
  inquiryDetails: z.object({
    checkIn: z.string().transform(str => new Date(str)),
    checkOut: z.string().transform(str => new Date(str)),
    guests: z.number().min(1),
    message: z.string().optional(),
    priceEstimate: z.number().optional()
  }),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
): Promise<NextResponse> {
  try {
    // Check rate limit
    const rateLimitResult = checkRateLimit(request, rateLimitConfigs.miniSite);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitConfigs.miniSite.message },
        { 
          status: 429,
          headers: rateLimitResult.headers
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const { tenantId } = await params;

    // Validate tenant ID format
    if (!tenantId || tenantId.length < 3) {
      return NextResponse.json(
        { error: 'Invalid tenant ID' },
        { status: 400 }
      );
    }

    // Record page view
    const utmParams = {
      utm_source: searchParams.get('utm_source') || undefined,
      utm_medium: searchParams.get('utm_medium') || undefined,
      utm_campaign: searchParams.get('utm_campaign') || undefined
    };

    const filteredUtmParams = Object.fromEntries(
      Object.entries(utmParams).filter(([_, value]) => value !== undefined)
    ) as Record<string, string>;

    const cache = getCacheManager();
    const services = new TenantServiceFactory(tenantId);
    
    // Record page view (don't cache this)
    await services.miniSite.recordPageView(tenantId, undefined, filteredUtmParams);

    // Try to get config from cache
    const configCacheKey = cacheKeys.miniSiteConfig(tenantId);
    let config = cache.get(configCacheKey);
    
    if (!config) {
      // Get from database and cache it
      config = await services.miniSite.getConfig(tenantId);
      if (config) {
        cache.set(configCacheKey, config, cacheTTL.config);
      }
    }
    if (!config) {
      return NextResponse.json(
        { error: 'Mini-site not found or inactive' },
        { status: 404 }
      );
    }

    // Check if mini-site is active (production check)
    const isProduction = process.env.NODE_ENV === 'production';
    const isConfigActive = config.isActive === true;
    
    if (isProduction && !isConfigActive) {
      logger.warn('🚫 [MiniSite] Access denied - not active', { 
        tenantId,
        isActive: isConfigActive 
      });
      return NextResponse.json(
        { error: 'Mini-site não está ativo' },
        { status: 403, headers: rateLimitResult.headers }
      );
    } else if (!isConfigActive) {
      logger.info('🔧 [MiniSite] Dev mode - allowing inactive site', { tenantId });
    }

    // Try to get properties from cache
    const propertiesCacheKey = cacheKeys.miniSiteProperties(tenantId);
    let properties = cache.get(propertiesCacheKey);
    
    if (!properties) {
      // Get from database and cache it
      properties = await services.miniSite.getPublicProperties(tenantId);
      cache.set(propertiesCacheKey, properties, cacheTTL.properties);
    }
    
    logger.info('✅ [MiniSite] Data loaded', {
      tenantId,
      isActive: isConfigActive,
      propertyCount: properties?.length || 0,
      cached: !!cache.get(propertiesCacheKey)
    });

    return NextResponse.json({
      success: true,
      data: {
        config,
        properties
      }
    }, {
      headers: {
        ...rateLimitResult.headers,
        'Cache-Control': 'public, max-age=60, s-maxage=300',
        'X-Cache-Status': cache.get(configCacheKey) ? 'HIT' : 'MISS'
      }
    });

  } catch (error) {
    logger.error('❌ [MiniSite] API error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
): Promise<NextResponse> {
  try {
    // Check rate limit for inquiry
    const rateLimitResult = checkRateLimit(request, rateLimitConfigs.miniSiteInquiry);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: rateLimitConfigs.miniSiteInquiry.message },
        { 
          status: 429,
          headers: rateLimitResult.headers
        }
      );
    }
    const { tenantId } = await params;
    const body = await request.json();

    // Validate tenant ID
    if (!tenantId || tenantId.length < 3) {
      return NextResponse.json(
        { error: 'Invalid tenant ID' },
        { status: 400 }
      );
    }

    // Validate inquiry data
    const validatedData = inquirySchema.parse(body);

    // Create inquiry
    const inquiryData: any = {
      tenantId,
      status: 'new',
      source: 'mini-site',
      ...validatedData
    };
    
    const services = new TenantServiceFactory(tenantId);
    const inquiryId = await services.miniSite.createInquiry(inquiryData);

    // Generate WhatsApp booking URL
    const config = await services.miniSite.getConfig(tenantId);
    if (!config) {
      return NextResponse.json(
        { error: 'Mini-site configuration not found' },
        { status: 404 }
      );
    }

    const property = await services.miniSite.getPublicProperty(tenantId, validatedData.propertyId);
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const whatsappUrl = services.miniSite.generateWhatsAppBookingUrl(
      config.contactInfo.whatsappNumber,
      property.name,
      validatedData.inquiryDetails.checkIn.toLocaleDateString('pt-BR'),
      validatedData.inquiryDetails.checkOut.toLocaleDateString('pt-BR'),
      validatedData.inquiryDetails.guests
    );

    return NextResponse.json({
      success: true,
      data: {
        inquiryId,
        whatsappUrl,
        message: 'Inquiry created successfully'
      }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      );
    }

    console.error('Error creating inquiry:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}