import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { createSettingsService } from '@/lib/services/settings-service';
import { INSTAGRAM_OAUTH_BASE_URL, INSTAGRAM_API_BASE_URL } from '@/lib/facebook/constants';

interface OAuthState {
    tenantId: string;
    token: string;
    ts: number;
}

interface InstagramTokenResponse {
    access_token: string;
    user_id: number;
}

interface InstagramLongLivedTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
}

interface InstagramUserProfile {
    id: string;
    username: string;
    name?: string;
    account_type?: string;
    profile_picture_url?: string;
    followers_count?: number;
}

/**
 * GET /api/instagram/oauth/callback
 *
 * Handles the OAuth callback from Instagram.
 * Exchanges the authorization code for access tokens and saves the connection.
 *
 * Flow:
 * 1. Validate state (CSRF protection)
 * 2. Exchange code for short-lived access token
 * 3. Exchange for long-lived token (60 days)
 * 4. Fetch Instagram user profile
 * 5. Save settings and redirect
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorReason = searchParams.get('error_reason');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors
        if (error) {
            logger.warn('[Instagram OAuth Callback] OAuth error:', { error, errorReason, errorDescription });
            return redirectToSettings({ error: errorDescription || errorReason || error });
        }

        // Validate required parameters
        if (!code || !state) {
            logger.warn('[Instagram OAuth Callback] Missing code or state');
            return redirectToSettings({ error: 'Missing authorization code' });
        }

        // Decode and validate state
        let stateData: OAuthState;
        try {
            stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
        } catch {
            logger.warn('[Instagram OAuth Callback] Invalid state format');
            return redirectToSettings({ error: 'Invalid state parameter' });
        }

        // Validate state timestamp (expire after 10 minutes)
        const stateAge = Date.now() - stateData.ts;
        if (stateAge > 10 * 60 * 1000) {
            logger.warn('[Instagram OAuth Callback] State expired');
            return redirectToSettings({ error: 'Authorization expired. Please try again.' });
        }

        const tenantId = stateData.tenantId;
        if (!tenantId) {
            logger.warn('[Instagram OAuth Callback] Missing tenantId in state');
            return redirectToSettings({ error: 'Invalid authorization state' });
        }

        // Get configuration
        const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;
        const redirectUri = process.env.INSTAGRAM_OAUTH_REDIRECT_URI ||
            `${process.env.NEXT_PUBLIC_APP_URL}/api/instagram/oauth/callback`;

        if (!appId || !appSecret) {
            logger.error('[Instagram OAuth Callback] Missing app configuration');
            return redirectToSettings({ error: 'Server configuration error' });
        }

        // Step 1: Exchange code for short-lived access token
        logger.info('[Instagram OAuth Callback] Exchanging code for token', {
            tenantId: tenantId.substring(0, 8) + '***'
        });

        const tokenFormData = new URLSearchParams();
        tokenFormData.append('client_id', appId);
        tokenFormData.append('client_secret', appSecret);
        tokenFormData.append('grant_type', 'authorization_code');
        tokenFormData.append('redirect_uri', redirectUri);
        tokenFormData.append('code', code);

        const tokenResponse = await fetch(`${INSTAGRAM_OAUTH_BASE_URL}/oauth/access_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: tokenFormData.toString(),
        });

        const tokenData: InstagramTokenResponse | { error_type?: string; error_message?: string } = await tokenResponse.json();

        if ('error_type' in tokenData || 'error_message' in tokenData) {
            const errorMessage = (tokenData as { error_message?: string }).error_message || 'Token exchange failed';
            logger.error('[Instagram OAuth Callback] Token exchange error', new Error(errorMessage), {
                errorType: (tokenData as { error_type?: string }).error_type
            });
            return redirectToSettings({
                error: errorMessage
            });
        }

        const shortLivedToken = (tokenData as InstagramTokenResponse).access_token;
        const userId = (tokenData as InstagramTokenResponse).user_id;

        // Step 2: Exchange for long-lived token (60 days)
        logger.info('[Instagram OAuth Callback] Exchanging for long-lived token');

        const longLivedUrl = new URL(`${INSTAGRAM_API_BASE_URL}/access_token`);
        longLivedUrl.searchParams.set('grant_type', 'ig_exchange_token');
        longLivedUrl.searchParams.set('client_secret', appSecret);
        longLivedUrl.searchParams.set('access_token', shortLivedToken);

        const longLivedResponse = await fetch(longLivedUrl.toString());
        const longLivedData: InstagramLongLivedTokenResponse | { error?: { message: string } } = await longLivedResponse.json();

        if ('error' in longLivedData) {
            const errorMessage = longLivedData.error?.message || 'Long-lived token exchange failed';
            logger.error('[Instagram OAuth Callback] Long-lived token error', new Error(errorMessage));
            return redirectToSettings({ error: 'Failed to get long-lived token' });
        }

        const accessToken = (longLivedData as InstagramLongLivedTokenResponse).access_token;
        const expiresIn = (longLivedData as InstagramLongLivedTokenResponse).expires_in;

        // Step 3: Fetch Instagram user profile
        logger.info('[Instagram OAuth Callback] Fetching user profile');

        const profileUrl = `${INSTAGRAM_API_BASE_URL}/me?fields=id,username,name,account_type,profile_picture_url,followers_count&access_token=${accessToken}`;
        const profileResponse = await fetch(profileUrl);
        const profileData: InstagramUserProfile | { error?: { message: string } } = await profileResponse.json();

        if ('error' in profileData) {
            const errorMessage = profileData.error?.message || 'Profile fetch failed';
            logger.error('[Instagram OAuth Callback] Profile fetch error', new Error(errorMessage));
            return redirectToSettings({ error: 'Failed to get Instagram profile' });
        }

        const profile = profileData as InstagramUserProfile;

        // Step 4: Save Instagram settings
        const settingsService = createSettingsService(tenantId);

        // Calculate token expiration date
        const expiresAt = new Date(Date.now() + expiresIn * 1000);

        await settingsService.updateInstagramSettings(tenantId, {
            businessAccountId: profile.id,
            username: profile.username,
            name: profile.name || profile.username,
            profilePictureUrl: profile.profile_picture_url,
            accountType: profile.account_type,
            followersCount: profile.followers_count,
            connected: true,
            accessToken: accessToken,
            tokenExpiresAt: expiresAt,
            authMethod: 'instagram_login', // Direct Instagram login
            updatedAt: new Date(),
        });

        logger.info('[Instagram OAuth Callback] Instagram connected successfully', {
            tenantId: tenantId.substring(0, 8) + '***',
            username: profile.username,
            accountType: profile.account_type
        });

        // Redirect to settings with success
        return redirectToSettings({
            oauth: 'instagram',
            success: 'true',
            username: profile.username
        });

    } catch (error) {
        logger.error('[Instagram OAuth Callback] Unexpected error:', error);
        return redirectToSettings({ error: 'An unexpected error occurred' });
    }
}

/**
 * Helper function to redirect to settings page with query params
 */
function redirectToSettings(params: Record<string, string>): NextResponse {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const settingsUrl = new URL('/dashboard/settings/whatsapp', baseUrl);

    // Add oauth=instagram to indicate this is an Instagram OAuth callback
    if (!params.oauth) {
        settingsUrl.searchParams.set('oauth', 'instagram');
    }

    for (const [key, value] of Object.entries(params)) {
        settingsUrl.searchParams.set(key, value);
    }

    return NextResponse.redirect(settingsUrl.toString());
}
