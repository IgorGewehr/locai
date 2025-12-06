import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { createSettingsService } from '@/lib/services/settings-service';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

/**
 * POST /api/instagram/token/refresh
 *
 * Refreshes Instagram Long-Lived Access Tokens that are about to expire.
 * Should be called by a cron job regularly (e.g., weekly).
 *
 * Instagram Long-Lived Tokens are valid for 60 days and can be refreshed
 * as long as the token is still valid (not expired).
 *
 * Note: Only tokens obtained via Instagram Direct Login need to be refreshed here.
 * Tokens obtained via Facebook Page method are managed by the Facebook token refresh.
 */
export async function POST(request: NextRequest) {
    try {
        // Verify cron secret for security
        const cronSecret = request.headers.get('x-cron-secret');
        const expectedSecret = process.env.CRON_SECRET;

        if (!cronSecret || cronSecret !== expectedSecret) {
            logger.warn('[Instagram Token Refresh] Unauthorized request');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const appSecret = process.env.FACEBOOK_APP_SECRET;

        if (!appSecret) {
            logger.error('[Instagram Token Refresh] Missing FACEBOOK_APP_SECRET');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        logger.info('[Instagram Token Refresh] Starting token refresh job');

        // Get all tenants with Instagram connected via Direct Login
        const tenantsRef = collection(db, 'tenants');
        const tenantsSnapshot = await getDocs(tenantsRef);

        const results: {
            tenantId: string;
            success: boolean;
            error?: string;
            daysUntilExpiry?: number;
        }[] = [];

        for (const tenantDoc of tenantsSnapshot.docs) {
            const tenantId = tenantDoc.id;

            try {
                const settingsService = createSettingsService(tenantId);
                const settings = await settingsService.getSettings(tenantId);

                // Skip if Instagram not connected or not using Direct Login
                if (!settings?.instagram?.connected) {
                    continue;
                }

                // Only refresh tokens from Instagram Direct Login method
                if (settings.instagram.authMethod !== 'instagram_login') {
                    continue;
                }

                if (!settings.instagram.accessToken) {
                    continue;
                }

                const currentToken = settings.instagram.accessToken;
                const tokenExpiresAt = settings.instagram.tokenExpiresAt;

                // Check if we need to refresh
                const shouldRefresh = shouldRefreshToken(tokenExpiresAt);

                if (!shouldRefresh.needsRefresh) {
                    results.push({
                        tenantId: tenantId.substring(0, 8) + '***',
                        success: true,
                        daysUntilExpiry: shouldRefresh.daysUntilExpiry
                    });
                    continue;
                }

                // Try to refresh the token
                const refreshResult = await refreshInstagramToken(currentToken, appSecret);

                if (refreshResult.success && refreshResult.newToken) {
                    // Calculate new expiration date (60 days from now)
                    const newExpiresAt = new Date(Date.now() + refreshResult.expiresIn * 1000);

                    // Update settings with new token
                    await settingsService.updateInstagramSettings(tenantId, {
                        accessToken: refreshResult.newToken,
                        tokenExpiresAt: newExpiresAt,
                        updatedAt: new Date(),
                    });

                    results.push({
                        tenantId: tenantId.substring(0, 8) + '***',
                        success: true,
                        daysUntilExpiry: 60
                    });

                    logger.info('[Instagram Token Refresh] Token refreshed successfully', {
                        tenantId: tenantId.substring(0, 8) + '***',
                        newExpiresAt: newExpiresAt.toISOString()
                    });
                } else {
                    results.push({
                        tenantId: tenantId.substring(0, 8) + '***',
                        success: false,
                        error: refreshResult.error
                    });

                    logger.warn('[Instagram Token Refresh] Failed to refresh token', {
                        tenantId: tenantId.substring(0, 8) + '***',
                        error: refreshResult.error
                    });
                }
            } catch (error) {
                results.push({
                    tenantId: tenantId.substring(0, 8) + '***',
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }

        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        logger.info('[Instagram Token Refresh] Job completed', {
            total: results.length,
            success: successCount,
            failed: failCount
        });

        return NextResponse.json({
            success: true,
            summary: {
                total: results.length,
                success: successCount,
                failed: failCount
            },
            results
        });

    } catch (error) {
        logger.error('[Instagram Token Refresh] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Check if token needs refresh
 * We refresh if the token expires in less than 7 days
 */
function shouldRefreshToken(expiresAt: Date | string | undefined): { needsRefresh: boolean; daysUntilExpiry: number } {
    if (!expiresAt) {
        // If no expiration date, assume we need to refresh
        return { needsRefresh: true, daysUntilExpiry: 0 };
    }

    const expirationDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
    const now = Date.now();
    const msUntilExpiry = expirationDate.getTime() - now;
    const daysUntilExpiry = Math.floor(msUntilExpiry / (1000 * 60 * 60 * 24));

    // Refresh if expires in less than 7 days
    const needsRefresh = daysUntilExpiry < 7;

    return { needsRefresh, daysUntilExpiry };
}

/**
 * Refresh an Instagram Long-Lived Access Token
 *
 * Instagram tokens can be refreshed by calling the token refresh endpoint.
 * The token must still be valid (not expired) to be refreshed.
 *
 * API: GET https://graph.instagram.com/refresh_access_token
 *   ?grant_type=ig_refresh_token
 *   &access_token={long-lived-token}
 */
async function refreshInstagramToken(
    currentToken: string,
    appSecret: string
): Promise<{ success: boolean; newToken?: string; expiresIn: number; error?: string }> {
    try {
        // Use the Instagram token refresh endpoint
        const refreshUrl = new URL('https://graph.instagram.com/refresh_access_token');
        refreshUrl.searchParams.set('grant_type', 'ig_refresh_token');
        refreshUrl.searchParams.set('access_token', currentToken);

        const response = await fetch(refreshUrl.toString());
        const data = await response.json();

        if (data.error) {
            return {
                success: false,
                expiresIn: 0,
                error: data.error.message || 'Failed to refresh token'
            };
        }

        if (data.access_token) {
            return {
                success: true,
                newToken: data.access_token,
                expiresIn: data.expires_in || 5184000 // Default to 60 days in seconds
            };
        }

        return {
            success: false,
            expiresIn: 0,
            error: 'No access token in refresh response'
        };

    } catch (error) {
        return {
            success: false,
            expiresIn: 0,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * GET /api/instagram/token/refresh
 *
 * Check token status for debugging purposes
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json(
                { error: 'Token parameter required' },
                { status: 400 }
            );
        }

        // For Instagram tokens, we can try to get user info to verify validity
        const profileUrl = `https://graph.instagram.com/me?fields=id,username&access_token=${token}`;

        const response = await fetch(profileUrl);
        const data = await response.json();

        if (data.error) {
            return NextResponse.json({
                valid: false,
                error: data.error.message,
                errorCode: data.error.code
            });
        }

        return NextResponse.json({
            valid: true,
            userId: data.id,
            username: data.username,
            note: 'Instagram tokens are valid for 60 days from issuance. Refresh before expiry.'
        });

    } catch (error) {
        logger.error('[Instagram Token Debug] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
