import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { GRAPH_API_VERSION, GRAPH_API_BASE_URL } from '@/lib/facebook/constants';

interface FacebookPage {
    id: string;
    name: string;
    access_token: string;
    category?: string;
}

interface OAuthState {
    tenantId: string;
    token: string;
    ts: number;
}

/**
 * GET /api/facebook/oauth/callback
 *
 * Handles the OAuth callback from Facebook.
 * Exchanges the authorization code for access tokens and fetches available pages.
 *
 * Flow:
 * 1. Validate state (CSRF protection)
 * 2. Exchange code for User Access Token
 * 3. Exchange User Token for Long-Lived Token (60 days)
 * 4. Fetch user's pages with their access tokens
 * 5. Redirect to settings page with pages data
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors
        if (error) {
            logger.warn('[Facebook OAuth Callback] OAuth error:', { error, errorDescription });
            return redirectToSettings({ error: errorDescription || error });
        }

        // Validate required parameters
        if (!code || !state) {
            logger.warn('[Facebook OAuth Callback] Missing code or state');
            return redirectToSettings({ error: 'Missing authorization code' });
        }

        // Decode and validate state
        let stateData: OAuthState;
        try {
            stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
        } catch {
            logger.warn('[Facebook OAuth Callback] Invalid state format');
            return redirectToSettings({ error: 'Invalid state parameter' });
        }

        // Validate state timestamp (expire after 10 minutes)
        const stateAge = Date.now() - stateData.ts;
        if (stateAge > 10 * 60 * 1000) {
            logger.warn('[Facebook OAuth Callback] State expired');
            return redirectToSettings({ error: 'Authorization expired. Please try again.' });
        }

        const tenantId = stateData.tenantId;
        if (!tenantId) {
            logger.warn('[Facebook OAuth Callback] Missing tenantId in state');
            return redirectToSettings({ error: 'Invalid authorization state' });
        }

        // Get configuration
        const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;
        const redirectUri = process.env.FACEBOOK_OAUTH_REDIRECT_URI ||
            `${process.env.NEXT_PUBLIC_APP_URL}/api/facebook/oauth/callback`;

        if (!appId || !appSecret) {
            logger.error('[Facebook OAuth Callback] Missing app configuration');
            return redirectToSettings({ error: 'Server configuration error' });
        }

        // Step 1: Exchange code for User Access Token
        logger.info('[Facebook OAuth Callback] Exchanging code for token', {
            tenantId: tenantId.substring(0, 8) + '***'
        });

        const tokenUrl = new URL(`${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/oauth/access_token`);
        tokenUrl.searchParams.set('client_id', appId);
        tokenUrl.searchParams.set('client_secret', appSecret);
        tokenUrl.searchParams.set('redirect_uri', redirectUri);
        tokenUrl.searchParams.set('code', code);

        const tokenResponse = await fetch(tokenUrl.toString());
        const tokenData = await tokenResponse.json();

        if (tokenData.error) {
            logger.error('[Facebook OAuth Callback] Token exchange error:', tokenData.error);
            return redirectToSettings({ error: tokenData.error.message || 'Failed to get access token' });
        }

        const shortLivedToken = tokenData.access_token;

        // Step 2: Exchange for Long-Lived Token (60 days)
        logger.info('[Facebook OAuth Callback] Exchanging for long-lived token');

        const longLivedUrl = new URL(`${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/oauth/access_token`);
        longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token');
        longLivedUrl.searchParams.set('client_id', appId);
        longLivedUrl.searchParams.set('client_secret', appSecret);
        longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken);

        const longLivedResponse = await fetch(longLivedUrl.toString());
        const longLivedData = await longLivedResponse.json();

        if (longLivedData.error) {
            logger.error('[Facebook OAuth Callback] Long-lived token error:', longLivedData.error);
            return redirectToSettings({ error: 'Failed to get long-lived token' });
        }

        const userAccessToken = longLivedData.access_token;
        const expiresIn = longLivedData.expires_in; // Seconds until expiration

        // Step 3: Fetch user's pages with their access tokens
        logger.info('[Facebook OAuth Callback] Fetching user pages');

        const pagesUrl = `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/me/accounts?fields=id,name,access_token,category&access_token=${userAccessToken}`;
        const pagesResponse = await fetch(pagesUrl);
        const pagesData = await pagesResponse.json();

        if (pagesData.error) {
            logger.error('[Facebook OAuth Callback] Pages fetch error:', pagesData.error);
            return redirectToSettings({ error: 'Failed to fetch Facebook pages' });
        }

        const pages: FacebookPage[] = pagesData.data || [];

        if (pages.length === 0) {
            logger.warn('[Facebook OAuth Callback] No pages found');
            return redirectToSettings({
                error: 'No Facebook Pages found. Make sure you have admin access to at least one Page.'
            });
        }

        logger.info('[Facebook OAuth Callback] Successfully fetched pages', {
            tenantId: tenantId.substring(0, 8) + '***',
            pageCount: pages.length
        });

        // Create a secure token to store pages temporarily
        const pagesToken = Buffer.from(JSON.stringify({
            tenantId,
            userAccessToken,
            expiresIn,
            pages: pages.map(p => ({
                id: p.id,
                name: p.name,
                access_token: p.access_token,
                category: p.category
            })),
            ts: Date.now()
        })).toString('base64url');

        // Redirect to settings page with success status
        return redirectToSettings({
            oauth: 'facebook',
            success: 'true',
            pagesToken,
            pageCount: pages.length.toString()
        });

    } catch (error) {
        logger.error('[Facebook OAuth Callback] Unexpected error:', error);
        return redirectToSettings({ error: 'An unexpected error occurred' });
    }
}

/**
 * Helper function to redirect to settings page with query params
 */
function redirectToSettings(params: Record<string, string>): NextResponse {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const settingsUrl = new URL('/dashboard/settings/whatsapp', baseUrl);

    // Add oauth param if not present
    if (!params.oauth) {
        settingsUrl.searchParams.set('oauth', 'facebook');
    }

    for (const [key, value] of Object.entries(params)) {
        settingsUrl.searchParams.set(key, value);
    }

    return NextResponse.redirect(settingsUrl.toString());
}
