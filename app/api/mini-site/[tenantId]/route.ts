/**
 * Mini-Site API Routes
 * Public API endpoints for mini-site functionality
 */

import { NextRequest, NextResponse } from 'next/server';
import { miniSiteService } from '@/lib/services/mini-site-service';
import { z } from 'zod';

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

    await miniSiteService.recordPageView(tenantId, undefined, filteredUtmParams);

    // Get mini-site configuration
    const config = await miniSiteService.getConfig(tenantId);
    if (!config) {
      return NextResponse.json(
        { error: 'Mini-site not found or inactive' },
        { status: 404 }
      );
    }

    // Get public properties
    const properties = await miniSiteService.getPublicProperties(tenantId);

    return NextResponse.json({
      success: true,
      data: {
        config,
        properties
      }
    });

  } catch (error) {
    console.error('Error in mini-site API:', error);
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
    
    const inquiryId = await miniSiteService.createInquiry(inquiryData);

    // Generate WhatsApp booking URL
    const config = await miniSiteService.getConfig(tenantId);
    if (!config) {
      return NextResponse.json(
        { error: 'Mini-site configuration not found' },
        { status: 404 }
      );
    }

    const property = await miniSiteService.getPublicProperty(tenantId, validatedData.propertyId);
    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      );
    }

    const whatsappUrl = miniSiteService.generateWhatsAppBookingUrl(
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