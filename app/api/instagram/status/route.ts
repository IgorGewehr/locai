import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { createSettingsService } from '@/lib/services/settings-service';
import { logger } from '@/lib/utils/logger';

/**
 * GET /api/instagram/status
 * Returns the current Instagram connection status
 */
export async function GET(request: NextRequest) {
    try {
        const authContext = await validateFirebaseAuth(request);
        if (!authContext.authenticated || !authContext.tenantId) {
            return NextResponse.json(
                { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
                { status: 401 }
            );
        }

        const tenantId = authContext.tenantId;
        const settingsService = createSettingsService(tenantId);
        const settings = await settingsService.getSettings(tenantId);

        const instagramSettings = settings?.instagram;
        const facebookConnected = settings?.facebook?.connected || false;

        return NextResponse.json({
            success: true,
            data: {
                connected: instagramSettings?.connected || false,
                username: instagramSettings?.username || '',
                businessAccountId: instagramSettings?.businessAccountId || '',
                name: instagramSettings?.name || '',
                profilePictureUrl: instagramSettings?.profilePictureUrl || '',
                accountType: instagramSettings?.accountType || '',
                authMethod: instagramSettings?.authMethod || 'facebook_page',
                tokenExpiresAt: instagramSettings?.tokenExpiresAt || null,
                // Instagram can now be connected directly via OAuth or via Facebook Page
                facebookConnected,
                canConnect: !instagramSettings?.connected,
            },
        });
    } catch (error) {
        logger.error('Error getting Instagram status:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
