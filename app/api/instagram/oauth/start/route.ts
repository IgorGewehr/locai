import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';
import crypto from 'crypto';
import { INSTAGRAM_OAUTH_BASE_URL, INSTAGRAM_OAUTH_SCOPES } from '@/lib/facebook/constants';

/**
 * GET /api/instagram/oauth/start
 *
 * Initiates the Instagram OAuth flow using Instagram Direct Login.
 * This allows users to connect their Instagram Business/Creator accounts
 * directly without needing a Facebook Page.
 *
 * Note: Instagram messaging still requires the account to be a Business or Creator account.
 *
 * Required permissions:
 * - instagram_business_basic: Basic profile info
 * - instagram_business_manage_messages: Send/receive DMs
 * - instagram_business_manage_comments: Manage comments (optional)
 */
export async function GET(request: NextRequest) {
    try {
        // Authenticate request
        const authContext = await validateFirebaseAuth(request);
        if (!authContext.authenticated || !authContext.tenantId) {
            return NextResponse.json(
                { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
                { status: 401 }
            );
        }

        const tenantId = authContext.tenantId;

        // Get configuration
        // Instagram uses the same App ID as Facebook (they're both Meta apps)
        const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
        const redirectUri = process.env.INSTAGRAM_OAUTH_REDIRECT_URI ||
            `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/oauth/callback`;

        if (!appId) {
            logger.error('[Instagram OAuth] Missing NEXT_PUBLIC_FACEBOOK_APP_ID');
            return NextResponse.json(
                { error: 'Instagram App ID not configured', code: 'CONFIG_ERROR' },
                { status: 500 }
            );
        }

        // Generate CSRF state token
        const randomToken = crypto.randomBytes(32).toString('hex');
        const timestamp = Date.now();
        const state = Buffer.from(
            JSON.stringify({ tenantId, token: randomToken, ts: timestamp })
        ).toString('base64url');

        // Instagram OAuth scopes from centralized config
        const scopes = INSTAGRAM_OAUTH_SCOPES.join(',');

        // Build Instagram authorization URL
        const authUrl = new URL(`${INSTAGRAM_OAUTH_BASE_URL}/oauth/authorize`);
        authUrl.searchParams.set('client_id', appId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('scope', scopes);
        authUrl.searchParams.set('response_type', 'code');
        authUrl.searchParams.set('state', state);

        logger.info('[Instagram OAuth] Generated authorization URL', {
            tenantId: tenantId.substring(0, 8) + '***',
            redirectUri,
            scopes
        });

        return NextResponse.json({
            success: true,
            authUrl: authUrl.toString(),
            state,
        });

    } catch (error) {
        logger.error('[Instagram OAuth] Error generating auth URL:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
