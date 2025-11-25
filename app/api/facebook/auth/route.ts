import { NextResponse } from 'next/server';
import { createSettingsService } from '@/lib/services/settings-service';
import { logger } from '@/lib/utils/logger';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { tenantId, pageId, pageAccessToken, pageName, userAccessToken } = body;

        // Scenario 1: Saving a specific page (Final step)
        if (tenantId && pageId && pageAccessToken) {
            const settingsService = createSettingsService(tenantId);

            await settingsService.updateFacebookSettings(tenantId, {
                pageId,
                pageAccessToken,
                pageName: pageName || 'Facebook Page',
                connected: true,
                updatedAt: new Date(),
            });

            logger.info(`Facebook settings updated for tenant ${tenantId}`);
            return NextResponse.json({ success: true });
        }

        // Scenario 2: Exchanging User Token and Listing Pages (First step)
        if (userAccessToken) {
            const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
            const appSecret = process.env.FACEBOOK_APP_SECRET;

            if (!appId || !appSecret) {
                return NextResponse.json({ error: 'Server configuration error: Missing App ID/Secret' }, { status: 500 });
            }

            // 1. Exchange short-lived user token for long-lived user token
            const exchangeUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userAccessToken}`;
            const exchangeResponse = await fetch(exchangeUrl);
            const exchangeData = await exchangeResponse.json();

            if (exchangeData.error) {
                logger.error('Error exchanging token:', exchangeData.error);
                return NextResponse.json({ error: 'Failed to exchange token' }, { status: 400 });
            }

            const longLivedUserToken = exchangeData.access_token;

            // 2. Fetch Pages with their access tokens
            const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?access_token=${longLivedUserToken}`;
            const pagesResponse = await fetch(pagesUrl);
            const pagesData = await pagesResponse.json();

            if (pagesData.error) {
                logger.error('Error fetching pages:', pagesData.error);
                return NextResponse.json({ error: 'Failed to fetch pages' }, { status: 400 });
            }

            return NextResponse.json({
                success: true,
                pages: pagesData.data, // List of pages with name, id, access_token
                userToken: longLivedUserToken // Optional: return if needed for client-side storage (not recommended)
            });
        }

        return NextResponse.json(
            { error: 'Missing required fields' },
            { status: 400 }
        );

    } catch (error) {
        logger.error('Error in Facebook auth:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function DELETE(request: Request) {
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

        await settingsService.updateFacebookSettings(tenantId, {
            pageId: '',
            pageAccessToken: '',
            connected: false,
            pageName: '',
            updatedAt: new Date(),
        });

        logger.info(`Facebook settings disconnected for tenant ${tenantId}`);

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('Error disconnecting Facebook:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
