import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { createSettingsService } from '@/lib/services/settings-service';
import { logger } from '@/lib/utils/logger';
import {
    GRAPH_API_VERSION,
    GRAPH_API_BASE_URL,
    WEBHOOK_SUBSCRIPTION_FIELDS
} from '@/lib/facebook/constants';

interface FacebookPage {
    id: string;
    name: string;
    access_token: string;
    category?: string;
}

interface PagesTokenData {
    tenantId: string;
    userAccessToken: string;
    expiresIn?: number;
    pages: FacebookPage[];
    ts: number;
}

/**
 * POST /api/facebook/auth
 *
 * Handles Facebook Page connection. Supports multiple scenarios:
 *
 * 1. Connect page from OAuth flow (pagesToken from callback)
 * 2. Connect page directly (pageId + pageAccessToken)
 * 3. Legacy: Exchange user token for pages (for Facebook SDK flow)
 */
export async function POST(request: NextRequest) {
    try {
        // Authenticate request
        const authContext = await validateFirebaseAuth(request);
        if (!authContext.authenticated || !authContext.tenantId) {
            return NextResponse.json(
                { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            pagesToken,      // From OAuth callback
            selectedPageId,  // Which page to connect
            pageId,          // Direct connection
            pageAccessToken, // Direct connection
            pageName,        // Direct connection
            userAccessToken, // Legacy SDK flow
        } = body;

        const tenantId = authContext.tenantId;

        // Scenario 1: Process OAuth callback token and select a page
        if (pagesToken && selectedPageId) {
            return await handleOAuthPageSelection(tenantId, pagesToken, selectedPageId);
        }

        // Scenario 2: Get pages list from OAuth token (without selecting)
        if (pagesToken && !selectedPageId) {
            return await handleGetPagesFromToken(pagesToken);
        }

        // Scenario 3: Direct page connection (used by frontend after selection)
        if (pageId && pageAccessToken) {
            return await handleDirectPageConnection(tenantId, pageId, pageAccessToken, pageName);
        }

        // Scenario 4: Legacy - Exchange User Token and List Pages (Facebook SDK flow)
        if (userAccessToken) {
            return await handleLegacyTokenExchange(userAccessToken);
        }

        return NextResponse.json(
            { error: 'Missing required fields' },
            { status: 400 }
        );

    } catch (error) {
        logger.error('[Facebook Auth] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Handle page selection from OAuth flow
 */
async function handleOAuthPageSelection(
    tenantId: string,
    pagesToken: string,
    selectedPageId: string
): Promise<NextResponse> {
    try {
        // Decode pages token
        const tokenData: PagesTokenData = JSON.parse(
            Buffer.from(pagesToken, 'base64url').toString()
        );

        // Validate token age (expire after 10 minutes)
        const tokenAge = Date.now() - tokenData.ts;
        if (tokenAge > 10 * 60 * 1000) {
            return NextResponse.json(
                { error: 'Authorization expired. Please reconnect Facebook.' },
                { status: 400 }
            );
        }

        // Find selected page
        const selectedPage = tokenData.pages.find(p => p.id === selectedPageId);
        if (!selectedPage) {
            return NextResponse.json(
                { error: 'Selected page not found' },
                { status: 400 }
            );
        }

        // Subscribe page to webhook before saving
        const subscribeResult = await subscribePageToWebhook(
            selectedPageId,
            selectedPage.access_token
        );

        if (!subscribeResult.success) {
            logger.warn('[Facebook Auth] Webhook subscription failed, but continuing', {
                pageId: selectedPageId,
                error: subscribeResult.error
            });
            // Continue anyway - webhook might already be subscribed
        }

        // Save page settings to Firebase
        const settingsService = createSettingsService(tenantId);
        await settingsService.updateFacebookSettings(tenantId, {
            pageId: selectedPage.id,
            pageAccessToken: selectedPage.access_token,
            pageName: selectedPage.name,
            connected: true,
            updatedAt: new Date(),
        });

        logger.info('[Facebook Auth] Page connected successfully', {
            tenantId: tenantId.substring(0, 8) + '***',
            pageId: selectedPage.id,
            pageName: selectedPage.name
        });

        return NextResponse.json({
            success: true,
            page: {
                id: selectedPage.id,
                name: selectedPage.name
            },
            webhookSubscribed: subscribeResult.success
        });

    } catch (error) {
        logger.error('[Facebook Auth] Error processing OAuth token:', error);
        return NextResponse.json(
            { error: 'Invalid authorization token' },
            { status: 400 }
        );
    }
}

/**
 * Get pages list from OAuth token (without selecting)
 */
async function handleGetPagesFromToken(pagesToken: string): Promise<NextResponse> {
    try {
        const tokenData: PagesTokenData = JSON.parse(
            Buffer.from(pagesToken, 'base64url').toString()
        );

        // Validate token age
        const tokenAge = Date.now() - tokenData.ts;
        if (tokenAge > 10 * 60 * 1000) {
            return NextResponse.json(
                { error: 'Authorization expired. Please reconnect Facebook.' },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            pages: tokenData.pages.map(p => ({
                id: p.id,
                name: p.name,
                category: p.category
            }))
        });

    } catch (error) {
        logger.error('[Facebook Auth] Error decoding pages token:', error);
        return NextResponse.json(
            { error: 'Invalid authorization token' },
            { status: 400 }
        );
    }
}

/**
 * Handle direct page connection
 */
async function handleDirectPageConnection(
    tenantId: string,
    pageId: string,
    pageAccessToken: string,
    pageName?: string
): Promise<NextResponse> {
    // Subscribe to webhook first
    const subscribeResult = await subscribePageToWebhook(pageId, pageAccessToken);

    if (!subscribeResult.success) {
        logger.warn('[Facebook Auth] Webhook subscription failed', {
            pageId,
            error: subscribeResult.error
        });
    }

    // Save settings to Firebase
    const settingsService = createSettingsService(tenantId);
    await settingsService.updateFacebookSettings(tenantId, {
        pageId,
        pageAccessToken,
        pageName: pageName || 'Facebook Page',
        connected: true,
        updatedAt: new Date(),
    });

    logger.info('[Facebook Auth] Page connected directly', {
        tenantId: tenantId.substring(0, 8) + '***',
        pageId
    });

    return NextResponse.json({
        success: true,
        webhookSubscribed: subscribeResult.success
    });
}

/**
 * Legacy: Exchange user token for pages (Facebook SDK flow)
 */
async function handleLegacyTokenExchange(userAccessToken: string): Promise<NextResponse> {
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;

    if (!appId || !appSecret) {
        return NextResponse.json(
            { error: 'Server configuration error: Missing App ID/Secret' },
            { status: 500 }
        );
    }

    // Exchange short-lived user token for long-lived user token
    const exchangeUrl = `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${userAccessToken}`;
    const exchangeResponse = await fetch(exchangeUrl);
    const exchangeData = await exchangeResponse.json();

    if (exchangeData.error) {
        logger.error('[Facebook Auth] Token exchange error:', exchangeData.error);
        return NextResponse.json(
            { error: 'Failed to exchange token' },
            { status: 400 }
        );
    }

    const longLivedUserToken = exchangeData.access_token;

    // Fetch Pages with their access tokens
    const pagesUrl = `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/me/accounts?fields=id,name,access_token,category&access_token=${longLivedUserToken}`;
    const pagesResponse = await fetch(pagesUrl);
    const pagesData = await pagesResponse.json();

    if (pagesData.error) {
        logger.error('[Facebook Auth] Pages fetch error:', pagesData.error);
        return NextResponse.json(
            { error: 'Failed to fetch pages' },
            { status: 400 }
        );
    }

    return NextResponse.json({
        success: true,
        pages: pagesData.data,
        userToken: longLivedUserToken
    });
}

/**
 * Subscribe a Facebook Page to receive webhook events
 */
async function subscribePageToWebhook(
    pageId: string,
    pageAccessToken: string
): Promise<{ success: boolean; error?: string }> {
    try {
        // Subscribe to messaging webhook events
        const subscribeUrl = `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/${pageId}/subscribed_apps`;

        const response = await fetch(subscribeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                access_token: pageAccessToken,
                subscribed_fields: WEBHOOK_SUBSCRIPTION_FIELDS.join(',')
            })
        });

        const data = await response.json();

        if (data.error) {
            logger.error('[Facebook Auth] Webhook subscription error:', data.error);
            return { success: false, error: data.error.message };
        }

        if (data.success) {
            logger.info('[Facebook Auth] Webhook subscription successful', { pageId });
            return { success: true };
        }

        return { success: false, error: 'Unknown subscription error' };

    } catch (error) {
        logger.error('[Facebook Auth] Webhook subscription exception:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * DELETE /api/facebook/auth
 * Disconnect Facebook Page
 */
export async function DELETE(request: NextRequest) {
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

        // Get current settings to unsubscribe from webhook
        const settings = await settingsService.getSettings(tenantId);
        if (settings?.facebook?.pageId && settings?.facebook?.pageAccessToken) {
            // Try to unsubscribe from webhook (best effort)
            try {
                await fetch(
                    `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/${settings.facebook.pageId}/subscribed_apps?access_token=${settings.facebook.pageAccessToken}`,
                    { method: 'DELETE' }
                );
            } catch (error) {
                logger.warn('[Facebook Auth] Failed to unsubscribe from webhook:', error);
            }
        }

        // Clear Facebook settings
        await settingsService.updateFacebookSettings(tenantId, {
            pageId: '',
            pageAccessToken: '',
            connected: false,
            pageName: '',
            updatedAt: new Date(),
        });

        logger.info('[Facebook Auth] Disconnected', {
            tenantId: tenantId.substring(0, 8) + '***'
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        logger.error('[Facebook Auth] Disconnect error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
