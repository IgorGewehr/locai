import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { createSettingsService } from '@/lib/services/settings-service';
import { logger } from '@/lib/utils/logger';

/**
 * POST /api/instagram/auth
 *
 * Connects an Instagram Business/Creator Account.
 * Supports two authentication methods:
 *
 * 1. Via Facebook Page (legacy) - Instagram Business Account linked to a Facebook Page
 * 2. Via Instagram Direct Login - Direct OAuth with Instagram (no Facebook Page required)
 */
export async function POST(request: NextRequest) {
    try {
        const authContext = await validateFirebaseAuth(request);
        if (!authContext.authenticated || !authContext.tenantId) {
            return NextResponse.json(
                { error: 'Unauthorized', code: 'AUTH_REQUIRED' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const {
            // Common fields
            businessAccountId,
            username,
            // Facebook Page method
            pageId,
            pageAccessToken,
            // Instagram Direct Login method
            accessToken,
            authMethod, // 'facebook_page' | 'instagram_login'
            name,
            profilePictureUrl,
            accountType,
            followersCount,
            tokenExpiresAt,
        } = body;

        const tenantId = authContext.tenantId;

        if (!businessAccountId || !username) {
            return NextResponse.json(
                { error: 'Missing required fields: businessAccountId, username' },
                { status: 400 }
            );
        }

        const settingsService = createSettingsService(tenantId);

        // Determine auth method and validate accordingly
        if (authMethod === 'instagram_login') {
            // Instagram Direct Login - accessToken is required
            if (!accessToken) {
                return NextResponse.json(
                    { error: 'Missing access token for Instagram Direct Login' },
                    { status: 400 }
                );
            }

            await settingsService.updateInstagramSettings(tenantId, {
                businessAccountId,
                username,
                name: name || username,
                profilePictureUrl,
                accountType,
                followersCount,
                connected: true,
                accessToken,
                authMethod: 'instagram_login',
                tokenExpiresAt: tokenExpiresAt ? new Date(tokenExpiresAt) : undefined,
                updatedAt: new Date(),
            });

            logger.info('[Instagram Auth] Connected via Instagram Direct Login', {
                tenantId: tenantId.substring(0, 8) + '***',
                username,
                accountType
            });
        } else {
            // Facebook Page method - need to get token from Facebook settings or use provided one
            const settings = await settingsService.getSettings(tenantId);

            // If connecting via Facebook Page, Facebook must be connected
            if (!pageAccessToken && !settings?.facebook?.connected) {
                return NextResponse.json(
                    { error: 'Facebook não está conectado', code: 'FACEBOOK_NOT_CONNECTED' },
                    { status: 400 }
                );
            }

            const token = pageAccessToken ||
                process.env.INSTAGRAM_TEST_TOKEN ||
                settings?.facebook?.pageAccessToken;

            await settingsService.updateInstagramSettings(tenantId, {
                businessAccountId,
                username,
                name: name || username,
                connected: true,
                pageAccessToken: token || '',
                pageId: pageId || settings?.facebook?.pageId,
                authMethod: 'facebook_page',
                updatedAt: new Date(),
            });

            logger.info('[Instagram Auth] Connected via Facebook Page', {
                tenantId: tenantId.substring(0, 8) + '***',
                username,
                pageId: pageId || settings?.facebook?.pageId
            });
        }

        return NextResponse.json({
            success: true,
            message: `Instagram @${username} conectado com sucesso!`,
            authMethod: authMethod || 'facebook_page'
        });

    } catch (error) {
        logger.error('[Instagram Auth] Error connecting Instagram:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/instagram/auth
 * Disconnects Instagram
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

        await settingsService.updateInstagramSettings(tenantId, {
            businessAccountId: '',
            username: '',
            name: '',
            connected: false,
            accessToken: '',
            pageAccessToken: '',
            pageId: '',
            authMethod: undefined,
            tokenExpiresAt: undefined,
            updatedAt: new Date(),
        });

        logger.info('[Instagram Auth] Disconnected', {
            tenantId: tenantId.substring(0, 8) + '***'
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error('[Instagram Auth] Error disconnecting:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
