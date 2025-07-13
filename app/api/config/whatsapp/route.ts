import { NextRequest, NextResponse } from 'next/server';
import { WhatsAppClient } from '@/lib/whatsapp/client';
import { settingsService } from '@/lib/services/settings-service';
import { getAuthFromCookie } from '@/lib/utils/auth-cookie';

interface WhatsAppConfig {
  phoneNumberId: string;
  accessToken: string;
  verifyToken: string;
  webhookUrl: string;
  businessName?: string;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastSync?: Date;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.tenantId || 'default-tenant';
    
    // Fetch WhatsApp credentials from Firebase
    const whatsappSettings = await settingsService.getWhatsAppCredentials(tenantId);
    
    const config: WhatsAppConfig = {
      phoneNumberId: whatsappSettings?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID || '',
      accessToken: whatsappSettings?.accessToken || process.env.WHATSAPP_ACCESS_TOKEN || '',
      verifyToken: whatsappSettings?.verifyToken || process.env.WHATSAPP_VERIFY_TOKEN || '',
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/whatsapp`,
      status: 'disconnected',
    };

    // Test connection if credentials are available
    if (config.phoneNumberId && config.accessToken) {
      try {
        const client = new WhatsAppClient(config.phoneNumberId, config.accessToken);
        const phoneInfo = await client.getPhoneNumberInfo();

        config.status = 'connected';
        config.businessName = phoneInfo.display_phone_number;
        config.lastSync = new Date();
      } catch (error) {
        console.error('WhatsApp connection test failed:', error);
        config.status = 'error';
      }
    }

    // Don't send the actual access token to the client
    return NextResponse.json({
      ...config,
      accessToken: config.accessToken ? '***' : '',
    });

  } catch (error) {
    console.error('WhatsApp config error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch WhatsApp configuration' },
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
    const { phoneNumberId, accessToken, verifyToken, action } = body;

    if (action === 'test') {
      return await testConnection(phoneNumberId, accessToken);
    }

    if (action === 'save') {
      return await saveConfiguration(body, auth.tenantId || 'default-tenant');
    }

    if (action === 'setup-webhook') {
      return await setupWebhook(phoneNumberId, accessToken, verifyToken);
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('WhatsApp config POST error:', error);
    return NextResponse.json(
      { error: 'Failed to process WhatsApp configuration' },
      { status: 500 }
    );
  }
}

async function testConnection(phoneNumberId: string, accessToken: string) {
  try {
    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Phone Number ID and Access Token are required' 
        },
        { status: 400 }
      );
    }

    const client = new WhatsAppClient(phoneNumberId, accessToken);

    // Test basic connection
    const phoneInfo = await client.getPhoneNumberInfo();

    // Test business profile
    const businessProfile = await client.getBusinessProfile();

    return NextResponse.json({
      success: true,
      status: 'connected',
      phoneInfo: {
        phoneNumber: phoneInfo.display_phone_number,
        verifiedName: phoneInfo.verified_name,
        qualityRating: phoneInfo.quality_rating,
      },
      businessProfile: {
        name: businessProfile.data?.[0]?.about,
        description: businessProfile.data?.[0]?.description,
        website: businessProfile.data?.[0]?.websites?.[0],
      },
      message: 'Connection successful! WhatsApp Business API is working correctly.',
    });

  } catch (error) {

    let errorMessage = 'Connection failed';
    if ((error as any).message?.includes('Invalid access token')) {
      errorMessage = 'Invalid Access Token. Please check your credentials.';
    } else if ((error as any).message?.includes('Phone number not found')) {
      errorMessage = 'Phone Number ID not found. Please verify the ID.';
    } else if ((error as any).message?.includes('Rate limit')) {
      errorMessage = 'Rate limit exceeded. Please try again later.';
    }

    return NextResponse.json({
      success: false,
      status: 'error',
      error: errorMessage,
      details: (error as any).message,
    });
  }
}

async function saveConfiguration(config: any, tenantId: string) {
  try {
    const requiredFields = ['phoneNumberId', 'accessToken', 'verifyToken'];
    for (const field of requiredFields) {
      if (!config[field]) {
        return NextResponse.json(
          { 
            success: false, 
            error: `${field} is required` 
          },
          { status: 400 }
        );
      }
    }

    // Test the configuration before saving
    const testResult = await testConnection(config.phoneNumberId, config.accessToken);
    const testData = await testResult.json();

    if (!testData.success) {
      return NextResponse.json({
        success: false,
        error: 'Configuration test failed',
        details: testData.error,
      });
    }

    // Save WhatsApp settings to Firebase
    await settingsService.updateWhatsAppSettings(tenantId, {
      phoneNumberId: config.phoneNumberId,
      accessToken: config.accessToken,
      verifyToken: config.verifyToken,
      connected: true,
      businessName: testData.phoneInfo?.phoneNumber,
      lastSync: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'WhatsApp configuration saved successfully',
      config: {
        phoneNumberId: config.phoneNumberId,
        verifyToken: config.verifyToken,
        webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/whatsapp`,
        status: 'connected',
        lastSync: new Date(),
        businessInfo: testData.phoneInfo,
      },
    });

  } catch (error) {
    console.error('Save configuration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save configuration',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

async function setupWebhook(phoneNumberId: string, accessToken: string, verifyToken: string) {
  try {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhook/whatsapp`;

    // Note: Webhook setup is typically done via Facebook Developer Console
    // This endpoint provides the information needed for manual setup

    return NextResponse.json({
      success: true,
      webhookSetup: {
        url: webhookUrl,
        verifyToken: verifyToken,
        events: ['messages', 'message_status'],
        instructions: [
          '1. Go to Facebook Developer Console',
          '2. Select your WhatsApp Business app',
          '3. Go to WhatsApp > Configuration',
          '4. Add the webhook URL and verify token',
          '5. Subscribe to "messages" and "message_status" events',
          '6. Test the webhook connection',
        ],
      },
      testEndpoint: {
        url: `${webhookUrl}?hub.verify_token=${verifyToken}&hub.challenge=test&hub.mode=subscribe`,
        method: 'GET',
        expectedResponse: 'test',
      },
    });

  } catch (error) {

    return NextResponse.json({
      success: false,
      error: 'Failed to setup webhook',
      details: (error as any).message,
    });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const tenantId = auth.tenantId || 'default-tenant';

    // Update configuration
    const result = await saveConfiguration(body, tenantId);
    return result;

  } catch (error) {
    console.error('WhatsApp config PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update WhatsApp configuration' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.tenantId || 'default-tenant';

    // Remove WhatsApp configuration from Firebase
    await settingsService.updateWhatsAppSettings(tenantId, {
      phoneNumberId: '',
      accessToken: '',
      verifyToken: '',
      connected: false,
      businessName: undefined,
      lastSync: undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'WhatsApp configuration removed successfully',
    });

  } catch (error) {
    console.error('WhatsApp config DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to remove WhatsApp configuration' },
      { status: 500 }
    );
  }
}