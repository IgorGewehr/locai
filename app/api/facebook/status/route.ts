import { NextResponse } from 'next/server';
import { createSettingsService } from '@/lib/services/settings-service';
import { logger } from '@/lib/utils/logger';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');

        if (!tenantId) {
            return NextResponse.json(
                { error: 'Missing tenantId' },
                { status: 400 }
            );
        }

        const settingsService = createSettingsService(tenantId);
        const settings = await settingsService.getSettings(tenantId);
        const facebookSettings = settings?.facebook;

        return NextResponse.json({
            success: true,
            data: {
                connected: facebookSettings?.connected || false,
                pageName: facebookSettings?.pageName || '',
                pageId: facebookSettings?.pageId || '',
            },
        });
    } catch (error) {
        logger.error('Error getting Facebook status:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
