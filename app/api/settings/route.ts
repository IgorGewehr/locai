import { NextRequest, NextResponse } from 'next/server';
import { settingsService } from '@/lib/services/settings-service';
import { getAuthFromCookie } from '@/lib/utils/auth-cookie';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const settings = await settingsService.getSettings(auth.tenantId || 'default-tenant');
    
    // Remove sensitive data before sending to client
    if (settings?.whatsapp) {
      settings.whatsapp = {
        ...settings.whatsapp,
        accessToken: settings.whatsapp.accessToken ? '***' : '', // Mask token
        phoneNumberId: settings.whatsapp.phoneNumberId,
        verifyToken: settings.whatsapp.verifyToken ? '***' : '', // Mask token
        connected: settings.whatsapp.connected,
        businessName: settings.whatsapp.businessName,
        lastSync: settings.whatsapp.lastSync,
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

    const tenantId = auth.tenantId || 'default-tenant';

    switch (section) {
      case 'company':
        await settingsService.updateCompanySettings(tenantId, data);
        break;
      case 'ai':
        await settingsService.updateAISettings(tenantId, data);
        break;
      case 'billing':
        await settingsService.updateBillingSettings(tenantId, data);
        break;
      case 'whatsapp':
        // WhatsApp settings should be updated through the dedicated endpoint
        return NextResponse.json(
          { error: 'Use /api/config/whatsapp for WhatsApp settings' },
          { status: 400 }
        );
      case 'all':
        await settingsService.saveSettings(tenantId, data);
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
    const tenantId = auth.tenantId || 'default-tenant';

    await settingsService.saveSettings(tenantId, body);

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