import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { settingsService } from '@/lib/services/settings-service';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const tenantId = session.user.id;
    console.log('Activating mini-site for tenant:', tenantId);

    // Get current settings
    const currentSettings = await settingsService.getSettings(tenantId);
    
    // Update mini-site settings to activate
    await settingsService.updateMiniSiteSettings(tenantId, {
      active: true,
      whatsappNumber: currentSettings?.whatsapp?.phoneNumberId || '',
      companyEmail: currentSettings?.company?.email || '',
    });

    // Return success with mini-site URL
    const miniSiteUrl = `${request.nextUrl.origin}/site/${tenantId}`;
    
    return NextResponse.json({
      success: true,
      miniSiteUrl,
      message: 'Mini-site ativado com sucesso!'
    });

  } catch (error) {
    console.error('Error activating mini-site:', error);
    return NextResponse.json(
      { error: 'Failed to activate mini-site' },
      { status: 500 }
    );
  }
}