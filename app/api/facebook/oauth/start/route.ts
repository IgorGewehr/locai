import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';
import crypto from 'crypto';
import {
    GRAPH_API_VERSION,
    FACEBOOK_OAUTH_BASE_URL,
    FACEBOOK_OAUTH_SCOPES
} from '@/lib/facebook/constants';

/**
 * GET /api/facebook/oauth/start
 *
 * Initiates the Facebook OAuth flow for connecting Facebook Pages.
 * Returns the authorization URL that the frontend should redirect to.
 *
 * Required permissions for Messenger + Instagram:
 * - pages_show_list: List user's Facebook Pages
 * - pages_messaging: Send/receive Messenger messages
 * - pages_manage_metadata: Subscribe pages to webhooks
 * - instagram_basic: Basic Instagram account info
 * - instagram_manage_messages: Send/receive Instagram DMs
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
        const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
        const redirectUri = process.env.FACEBOOK_OAUTH_REDIRECT_URI ||
            `${process.env.NEXT_PUBLIC_APP_URL}/api/facebook/oauth/callback`;

        if (!appId) {
            logger.error('[Facebook OAuth] Missing NEXT_PUBLIC_FACEBOOK_APP_ID');
            return NextResponse.json(
                { error: 'Facebook App ID not configured', code: 'CONFIG_ERROR' },
                { status: 500 }
            );
        }

        // Generate CSRF state token
        // Format: tenantId:randomToken:timestamp
        const randomToken = crypto.randomBytes(32).toString('hex');
        const timestamp = Date.now();
        const state = Buffer.from(
            JSON.stringify({ tenantId, token: randomToken, ts: timestamp })
        ).toString('base64url');

        // Facebook OAuth permissions from centralized config
        const scopes = FACEBOOK_OAUTH_SCOPES.join(',');

        // Build authorization URL using centralized API version
        const authUrl = new URL(`${FACEBOOK_OAUTH_BASE_URL}/${GRAPH_API_VERSION}/dialog/oauth`);
        authUrl.searchParams.set('client_id', appId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('scope', scopes);
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('response_type', 'code');

        // DEBUG: Log full URL for troubleshooting
        console.log('=== FACEBOOK OAUTH DEBUG ===');
        console.log('App ID:', appId);
        console.log('Redirect URI:', redirectUri);
        console.log('Full Auth URL:', authUrl.toString());
        console.log('============================');

        logger.info('[Facebook OAuth] Generated authorization URL', {
            tenantId: tenantId.substring(0, 8) + '***',
            redirectUri,
            scopes
        });

        return NextResponse.json({
            success: true,
            authUrl: authUrl.toString(),
            state, // Return state so frontend can verify on callback
        });

    } catch (error) {
        logger.error('[Facebook OAuth] Error generating auth URL:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
