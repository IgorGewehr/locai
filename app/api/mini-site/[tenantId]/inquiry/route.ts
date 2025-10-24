import { NextRequest, NextResponse } from 'next/server';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  try {
    const { tenantId } = await params;
    
    if (!tenantId) {
      return NextResponse.json(
        { success: false, error: 'Tenant ID is required' },
        { status: 400 }
      );
    }

    const inquiryData = await request.json();

    // Validate required fields
    if (!inquiryData.clientName || !inquiryData.clientEmail || !inquiryData.clientPhone || !inquiryData.message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create inquiry using miniSiteService (server-side only)
    const services = new TenantServiceFactory(tenantId);
    const inquiryId = await services.miniSite.createInquiry({
      tenantId,
      status: 'new',
      source: 'mini-site',
      propertyId: inquiryData.propertyId,
      clientInfo: {
        name: inquiryData.clientName,
        email: inquiryData.clientEmail,
        phone: inquiryData.clientPhone,
        preferredContact: 'whatsapp' as const,
      },
      inquiryDetails: {
        checkIn: inquiryData.checkIn ? new Date(inquiryData.checkIn) : new Date(),
        checkOut: inquiryData.checkOut ? new Date(inquiryData.checkOut) : new Date(),
        guests: inquiryData.numberOfGuests || 1,
        message: inquiryData.message,
      },
    });

    return NextResponse.json({
      success: true,
      data: { id: inquiryId },
      tenantId,
    });

  } catch (error) {
    console.error('Error creating inquiry:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create inquiry' 
      },
      { status: 500 }
    );
  }
}