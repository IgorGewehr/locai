import { NextRequest, NextResponse } from 'next/server';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { getAuthFromCookie } from '@/lib/utils/auth-cookie';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const services = new TenantServiceFactory(auth.tenantId);
    const settings = await services.settings.getSettings(auth.tenantId);
    
    // Get user profile for company info integration
    const { adminDb } = await import('@/lib/firebase/admin');
    const userDoc = await adminDb.collection('users').doc(auth.userId).get();
    const userData = userDoc.exists ? userDoc.data() : {};
    
    // Merge user profile data with company settings if needed
    if (settings?.company && userData) {
      settings.company = {
        ...settings.company,
        // Use profile data as fallback if company data is empty
        name: settings.company.name || userData.company || 'LocAI Imobiliária',
        email: settings.company.email || userData.email || auth.email,
        phone: settings.company.phone || userData.phone || '',
      };
    }
    
    // Remove sensitive data before sending to client
    if (settings?.whatsapp) {
      settings.whatsapp = {
        ...settings.whatsapp,
        accessToken: settings.whatsapp.accessToken ? '***' : '', // Mask token
        phoneNumberId: settings.whatsapp.phoneNumberId,
        verifyToken: settings.whatsapp.verifyToken ? '***' : '', // Mask token
        connected: settings.whatsapp.connected,
        businessName: settings.whatsapp.businessName || '',
        lastSync: settings.whatsapp.lastSync || new Date(),
      };
    }

    return NextResponse.json(settings);

  } catch (error) {
    console.error('Settings fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { section, data } = body;

    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const tenantId = auth.tenantId;

    switch (section) {
      case 'company':
        const services = new TenantServiceFactory(tenantId);
        await services.settings.updateCompanySettings(tenantId, data);
        break;
      case 'ai':
        await services.settings.updateAISettings(tenantId, data);
        break;
      case 'billing':
        await services.settings.updateBillingSettings(tenantId, data);
        break;
      case 'miniSite':
        await services.settings.updateMiniSiteSettings(tenantId, data);
        break;
      case 'whatsapp':
        // WhatsApp settings should be updated through the dedicated endpoint
        return NextResponse.json(
          { error: 'Use /api/config/whatsapp for WhatsApp settings' },
          { status: 400 }
        );
      case 'all':
        await services.settings.saveSettings(tenantId, data);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid section' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
    });

  } catch (error) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    
    if (!auth.tenantId) {
      return NextResponse.json({ error: 'Tenant ID required' }, { status: 400 });
    }

    const tenantId = auth.tenantId;

    const services = new TenantServiceFactory(tenantId);
    await services.settings.saveSettings(tenantId, body);

    return NextResponse.json({
      success: true,
      message: 'Settings created successfully',
    });

  } catch (error) {
    console.error('Settings create error:', error);
    return NextResponse.json(
      { error: 'Failed to create settings' },
      { status: 500 }
    );
  }
}