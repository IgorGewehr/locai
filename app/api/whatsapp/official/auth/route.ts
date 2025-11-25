import { NextResponse } from 'next/server';
import { createSettingsService } from '@/lib/services/settings-service';
import { logger } from '@/lib/utils/logger';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { tenantId, userAccessToken, wabaId, phoneNumberId, accessToken, businessName } = body;

        if (!tenantId) {
            return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 });
        }

        // Scenario 1: Saving selected WABA and Phone Number (Final step)
        if (wabaId && phoneNumberId && accessToken) {
            const settingsService = createSettingsService(tenantId);

            // Get existing settings to preserve other fields
            const currentSettings = await settingsService.getSettings(tenantId);
            const currentWhatsApp = currentSettings?.whatsapp || {};

            await settingsService.updateWhatsAppSettings(tenantId, {
                wabaId,
                phoneNumberId,
                accessToken,
                businessName: businessName || 'WhatsApp Business',
                connected: true,
                mode: 'business_api',
                updatedAt: new Date(),
                // Preserve webhook URL and verify token if they exist, or set defaults
                webhookUrl: currentWhatsApp.webhookUrl || `${process.env.NEXT_PUBLIC_APP_URL}/api/facebook/webhook`,
                verifyToken: currentWhatsApp.verifyToken || process.env.FACEBOOK_VERIFY_TOKEN || 'locai_verify_token'
            });

            logger.info(`WhatsApp Official settings updated for tenant ${tenantId}`);
            return NextResponse.json({ success: true });
        }

        // Scenario 2: Exchanging User Token and Listing WABAs (First step)
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

            // 2. Fetch WABAs (WhatsApp Business Accounts)
            const wabaUrl = `https://graph.facebook.com/v18.0/me/businesses?access_token=${longLivedUserToken}`; // Or me/accounts depending on setup, usually businesses for WABA
            // Actually, a better way is to fetch granular scopes. 
            // Let's try fetching businesses that have client_whatsapp_business_management permission or similar.
            // A common pattern is: me/accounts -> get businesses -> get WABAs owned by business.
            // OR: me/whatsapp_business_accounts (if the user has direct access)

            // Let's try fetching WABAs directly associated with the user
            const wabaResponse = await fetch(`https://graph.facebook.com/v18.0/me/whatsapp_business_accounts?access_token=${longLivedUserToken}`);
            const wabaData = await wabaResponse.json();

            if (wabaData.error) {
                // Fallback: try fetching businesses then WABAs? 
                // For now, let's assume direct access or return error.
                logger.error('Error fetching WABAs:', wabaData.error);
                return NextResponse.json({ error: 'Failed to fetch WhatsApp Business Accounts' }, { status: 400 });
            }

            const wabas = wabaData.data || [];
            const accountsWithPhones = [];

            // 3. For each WABA, fetch phone numbers
            for (const waba of wabas) {
                const phoneResponse = await fetch(`https://graph.facebook.com/v18.0/${waba.id}/phone_numbers?access_token=${longLivedUserToken}`);
                const phoneData = await phoneResponse.json();

                if (!phoneData.error && phoneData.data) {
                    accountsWithPhones.push({
                        id: waba.id,
                        name: waba.name,
                        currency: waba.currency,
                        timezone_id: waba.timezone_id,
                        phone_numbers: phoneData.data.map((p: any) => ({
                            id: p.id,
                            display_phone_number: p.display_phone_number,
                            verified_name: p.verified_name,
                            quality_rating: p.quality_rating
                        }))
                    });
                }
            }

            return NextResponse.json({
                success: true,
                wabas: accountsWithPhones,
                userToken: longLivedUserToken
            });
        }

        return NextResponse.json(
            { error: 'Missing required fields' },
            { status: 400 }
        );

    } catch (error) {
        logger.error('Error in WhatsApp Official auth:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
