import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { createSettingsService } from '@/lib/services/settings-service';
import { GRAPH_API_VERSION, GRAPH_API_BASE_URL } from '@/lib/facebook/constants';

interface WebhookHealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    checks: {
        verifyToken: boolean;
        appConfigured: boolean;
        facebookApiReachable: boolean;
        tenantConnection?: {
            connected: boolean;
            pageName?: string;
            webhookSubscribed?: boolean;
            tokenValid?: boolean;
            tokenExpiresIn?: string;
        };
    };
    errors?: string[];
}

/**
 * GET /api/facebook/webhook/health
 *
 * Health check endpoint for the Facebook/Instagram webhook integration.
 * Useful for monitoring and debugging webhook issues.
 *
 * Query params:
 * - tenantId: Optional. If provided, also checks tenant-specific connection status
 * - token: Optional auth token for secure access
 */
export async function GET(request: NextRequest) {
    const startTime = Date.now();
    const errors: string[] = [];

    try {
        const { searchParams } = new URL(request.url);
        const tenantId = searchParams.get('tenantId');
        const authToken = searchParams.get('token');

        // Optional: Add authentication for health check
        const expectedToken = process.env.HEALTH_CHECK_TOKEN;
        if (expectedToken && authToken !== expectedToken) {
            // Return basic health without sensitive details
            return NextResponse.json({
                status: 'healthy',
                timestamp: new Date().toISOString(),
                message: 'Webhook endpoint is running. Provide token for detailed status.'
            });
        }

        const checks: WebhookHealthStatus['checks'] = {
            verifyToken: false,
            appConfigured: false,
            facebookApiReachable: false,
        };

        // Check 1: Verify token is configured
        const verifyToken = process.env.FACEBOOK_VERIFY_TOKEN || process.env.N8N_WEBHOOK_SECRET;
        checks.verifyToken = !!verifyToken;
        if (!verifyToken) {
            errors.push('FACEBOOK_VERIFY_TOKEN not configured');
        }

        // Check 2: App credentials are configured
        const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;
        checks.appConfigured = !!(appId && appSecret);
        if (!appId) errors.push('NEXT_PUBLIC_FACEBOOK_APP_ID not configured');
        if (!appSecret) errors.push('FACEBOOK_APP_SECRET not configured');

        // Check 3: Facebook API is reachable
        try {
            const response = await fetch(`${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/me?access_token=test`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000), // 5 second timeout
            });
            // Even with invalid token, we should get a JSON response (error)
            // This proves the API is reachable
            checks.facebookApiReachable = response.status === 400 || response.status === 200;
        } catch (error) {
            checks.facebookApiReachable = false;
            errors.push('Cannot reach Facebook Graph API');
        }

        // Check 4: Tenant-specific checks (if tenantId provided)
        if (tenantId && appId && appSecret) {
            try {
                const settingsService = createSettingsService(tenantId);
                const settings = await settingsService.getSettings(tenantId);

                const tenantConnection: WebhookHealthStatus['checks']['tenantConnection'] = {
                    connected: false,
                };

                if (settings?.facebook?.connected && settings.facebook.pageAccessToken) {
                    tenantConnection.connected = true;
                    tenantConnection.pageName = settings.facebook.pageName;

                    // Check if token is valid and get expiry
                    try {
                        const debugUrl = `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/debug_token?input_token=${settings.facebook.pageAccessToken}&access_token=${appId}|${appSecret}`;
                        const debugResponse = await fetch(debugUrl, {
                            signal: AbortSignal.timeout(5000),
                        });
                        const debugData = await debugResponse.json();

                        if (debugData.data) {
                            tenantConnection.tokenValid = debugData.data.is_valid;

                            if (debugData.data.expires_at) {
                                const expiresAt = new Date(debugData.data.expires_at * 1000);
                                const daysUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                tenantConnection.tokenExpiresIn = `${daysUntilExpiry} days`;

                                if (daysUntilExpiry < 7) {
                                    errors.push(`Token expires in ${daysUntilExpiry} days - refresh needed`);
                                }
                            }

                            // Check webhook subscription
                            const subsUrl = `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/${settings.facebook.pageId}/subscribed_apps?access_token=${settings.facebook.pageAccessToken}`;
                            const subsResponse = await fetch(subsUrl, {
                                signal: AbortSignal.timeout(5000),
                            });
                            const subsData = await subsResponse.json();

                            tenantConnection.webhookSubscribed = !!(subsData.data && subsData.data.length > 0);
                            if (!tenantConnection.webhookSubscribed) {
                                errors.push('Webhook not subscribed for this page');
                            }
                        }
                    } catch (tokenError) {
                        tenantConnection.tokenValid = false;
                        errors.push('Could not verify token status');
                    }
                } else {
                    errors.push('Facebook not connected for this tenant');
                }

                checks.tenantConnection = tenantConnection;
            } catch (tenantError) {
                errors.push(`Error checking tenant: ${tenantError instanceof Error ? tenantError.message : 'Unknown'}`);
            }
        }

        // Determine overall status
        let status: WebhookHealthStatus['status'] = 'healthy';

        if (!checks.verifyToken || !checks.appConfigured || !checks.facebookApiReachable) {
            status = 'unhealthy';
        } else if (errors.length > 0) {
            status = 'degraded';
        }

        const processingTime = Date.now() - startTime;

        const response: WebhookHealthStatus = {
            status,
            timestamp: new Date().toISOString(),
            checks,
            ...(errors.length > 0 && { errors }),
        };

        logger.info('[Webhook Health] Health check completed', {
            status,
            processingTime,
            errorCount: errors.length
        });

        return NextResponse.json({
            ...response,
            processingTimeMs: processingTime,
        });

    } catch (error) {
        logger.error('[Webhook Health] Health check failed', error);

        return NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            checks: {
                verifyToken: false,
                appConfigured: false,
                facebookApiReachable: false,
            },
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            processingTimeMs: Date.now() - startTime,
        }, { status: 500 });
    }
}
