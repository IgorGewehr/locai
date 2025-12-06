import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { createSettingsService } from '@/lib/services/settings-service';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import {
    GRAPH_API_VERSION,
    GRAPH_API_BASE_URL,
    TOKEN_REFRESH_THRESHOLD_DAYS
} from '@/lib/facebook/constants';

/**
 * POST /api/facebook/token/refresh
 *
 * Refreshes Facebook Page Access Tokens that are about to expire.
 * Should be called by a cron job regularly (e.g., weekly).
 *
 * Facebook Page Access Tokens obtained via OAuth are long-lived (60 days),
 * but can be refreshed before they expire.
 */
export async function POST(request: NextRequest) {
    try {
        // Verify cron secret for security
        const cronSecret = request.headers.get('x-cron-secret');
        const expectedSecret = process.env.CRON_SECRET;

        if (!cronSecret || cronSecret !== expectedSecret) {
            logger.warn('[Facebook Token Refresh] Unauthorized request');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;

        if (!appId || !appSecret) {
            logger.error('[Facebook Token Refresh] Missing app configuration');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        logger.info('[Facebook Token Refresh] Starting token refresh job');

        // Get all tenants with Facebook connected
        const tenantsRef = collection(db, 'tenants');
        const tenantsSnapshot = await getDocs(tenantsRef);

        const results: {
            tenantId: string;
            success: boolean;
            error?: string;
        }[] = [];

        for (const tenantDoc of tenantsSnapshot.docs) {
            const tenantId = tenantDoc.id;

            try {
                const settingsService = createSettingsService(tenantId);
                const settings = await settingsService.getSettings(tenantId);

                // Skip if Facebook not connected
                if (!settings?.facebook?.connected || !settings.facebook.pageAccessToken) {
                    continue;
                }

                const currentToken = settings.facebook.pageAccessToken;

                // Try to refresh the token
                const refreshResult = await refreshPageAccessToken(
                    currentToken,
                    appId,
                    appSecret
                );

                if (refreshResult.success && refreshResult.newToken) {
                    // Update settings with new token
                    await settingsService.updateFacebookSettings(tenantId, {
                        pageAccessToken: refreshResult.newToken,
                        updatedAt: new Date(),
                    });

                    results.push({
                        tenantId: tenantId.substring(0, 8) + '***',
                        success: true
                    });

                    logger.info('[Facebook Token Refresh] Token refreshed successfully', {
                        tenantId: tenantId.substring(0, 8) + '***'
                    });
                } else {
                    results.push({
                        tenantId: tenantId.substring(0, 8) + '***',
                        success: false,
                        error: refreshResult.error
                    });

                    logger.warn('[Facebook Token Refresh] Failed to refresh token', {
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

        logger.info('[Facebook Token Refresh] Job completed', {
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
        logger.error('[Facebook Token Refresh] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

/**
 * Refresh a Facebook Page Access Token
 *
 * Page access tokens obtained through OAuth can be refreshed
 * by exchanging them for new long-lived tokens.
 */
async function refreshPageAccessToken(
    currentToken: string,
    appId: string,
    appSecret: string
): Promise<{ success: boolean; newToken?: string; error?: string }> {
    try {
        // First, check if the token is still valid and get its info
        const debugUrl = `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/debug_token?input_token=${currentToken}&access_token=${appId}|${appSecret}`;

        const debugResponse = await fetch(debugUrl);
        const debugData = await debugResponse.json();

        if (debugData.error) {
            return {
                success: false,
                error: debugData.error.message || 'Failed to debug token'
            };
        }

        const tokenData = debugData.data;

        // Check if token is still valid
        if (!tokenData.is_valid) {
            return {
                success: false,
                error: 'Token is no longer valid'
            };
        }

        // Check expiry - if it expires in more than threshold days, no need to refresh
        const expiresAt = tokenData.expires_at ? tokenData.expires_at * 1000 : 0;
        const thresholdFromNow = Date.now() + (TOKEN_REFRESH_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);

        if (expiresAt > thresholdFromNow) {
            // Token is still good for more than threshold days
            return {
                success: true,
                newToken: currentToken // Return same token, no refresh needed
            };
        }

        // Token needs refresh - exchange it for a new long-lived token
        // For page access tokens, we need to exchange via the page endpoint
        const refreshUrl = `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${currentToken}`;

        const refreshResponse = await fetch(refreshUrl);
        const refreshData = await refreshResponse.json();

        if (refreshData.error) {
            return {
                success: false,
                error: refreshData.error.message || 'Failed to refresh token'
            };
        }

        if (refreshData.access_token) {
            return {
                success: true,
                newToken: refreshData.access_token
            };
        }

        return {
            success: false,
            error: 'No access token in refresh response'
        };

    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * GET /api/facebook/token/refresh
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

        const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;

        if (!appId || !appSecret) {
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        // Debug the token
        const debugUrl = `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/debug_token?input_token=${token}&access_token=${appId}|${appSecret}`;

        const response = await fetch(debugUrl);
        const data = await response.json();

        if (data.error) {
            return NextResponse.json({
                valid: false,
                error: data.error.message
            });
        }

        const tokenData = data.data;
        const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at * 1000) : null;

        return NextResponse.json({
            valid: tokenData.is_valid,
            type: tokenData.type,
            appId: tokenData.app_id,
            expiresAt: expiresAt?.toISOString(),
            expiresIn: expiresAt ? Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) + ' days' : 'never',
            scopes: tokenData.scopes
        });

    } catch (error) {
        logger.error('[Facebook Token Debug] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
