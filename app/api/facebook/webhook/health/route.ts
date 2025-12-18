import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { createSettingsService } from '@/lib/services/settings-service';
import {
    GRAPH_API_VERSION,
    GRAPH_API_BASE_URL,
    FACEBOOK_OAUTH_SCOPES,
    WEBHOOK_SUBSCRIPTION_FIELDS
} from '@/lib/facebook/constants';

interface WebhookHealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    apiVersion: string;
    configuredScopes: string[];
    webhookFields: string[];
    checks: {
        verifyToken: boolean;
        appConfigured: boolean;
        appSecretConfigured: boolean;
        facebookApiReachable: boolean;
        tenantConnection?: {
            facebook: {
                connected: boolean;
                pageName?: string;
                pageId?: string;
                webhookSubscribed?: boolean;
                tokenValid?: boolean;
                tokenExpiresIn?: string;
                grantedScopes?: string[];
            };
            instagram: {
                connected: boolean;
                username?: string;
                businessAccountId?: string;
                authMethod?: string;
                tokenValid?: boolean;
            };
        };
    };
    errors?: string[];
    warnings?: string[];
}

/**
 * GET /api/facebook/webhook/health
 *
 * Health check endpoint completo para a integração Facebook/Instagram.
 * Útil para monitoramento, debugging e demonstração no screencast da Meta.
 *
 * Este endpoint verifica:
 * - Configuração do App (App ID, App Secret, Verify Token)
 * - Conectividade com a Graph API
 * - Status da conexão Facebook do tenant
 * - Status da conexão Instagram do tenant
 * - Permissões concedidas (scopes)
 * - Status do webhook
 *
 * Query params:
 * - tenantId: Optional. Se fornecido, verifica status específico do tenant
 * - token: Optional. Token de autenticação para acesso detalhado
 *
 * Para o screencast da Meta, use com tenantId para mostrar que:
 * 1. A integração está corretamente configurada
 * 2. As permissões estão sendo usadas (pages_messaging, instagram_manage_messages, etc)
 * 3. O webhook está funcionando
 */
export async function GET(request: NextRequest) {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

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
                apiVersion: GRAPH_API_VERSION,
                message: 'Webhook endpoint is running. Provide token for detailed status.'
            });
        }

        const checks: WebhookHealthStatus['checks'] = {
            verifyToken: false,
            appConfigured: false,
            appSecretConfigured: false,
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
        checks.appConfigured = !!appId;
        checks.appSecretConfigured = !!appSecret;
        if (!appId) errors.push('NEXT_PUBLIC_FACEBOOK_APP_ID not configured');
        if (!appSecret) errors.push('FACEBOOK_APP_SECRET not configured - webhook signature validation disabled');

        // Check 3: Facebook API is reachable
        try {
            const response = await fetch(`${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/me?access_token=test`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000),
            });
            checks.facebookApiReachable = response.status === 400 || response.status === 200;
        } catch {
            checks.facebookApiReachable = false;
            errors.push('Cannot reach Facebook Graph API');
        }

        // Check 4: Tenant-specific checks (if tenantId provided)
        if (tenantId && appId) {
            try {
                const settingsService = createSettingsService(tenantId);
                const settings = await settingsService.getSettings(tenantId);

                const tenantConnection: NonNullable<WebhookHealthStatus['checks']['tenantConnection']> = {
                    facebook: {
                        connected: false,
                    },
                    instagram: {
                        connected: false,
                    },
                };

                // === FACEBOOK CHECKS ===
                if (settings?.facebook?.connected && settings.facebook.pageAccessToken) {
                    tenantConnection.facebook.connected = true;
                    tenantConnection.facebook.pageName = settings.facebook.pageName;
                    tenantConnection.facebook.pageId = settings.facebook.pageId;

                    // Check token validity and scopes
                    if (appSecret) {
                        try {
                            const debugUrl = `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/debug_token?input_token=${settings.facebook.pageAccessToken}&access_token=${appId}|${appSecret}`;
                            const debugResponse = await fetch(debugUrl, {
                                signal: AbortSignal.timeout(5000),
                            });
                            const debugData = await debugResponse.json();

                            if (debugData.data) {
                                tenantConnection.facebook.tokenValid = debugData.data.is_valid;

                                // Get granted scopes
                                if (debugData.data.scopes) {
                                    tenantConnection.facebook.grantedScopes = debugData.data.scopes;

                                    // Verify required scopes are granted
                                    const requiredScopes = ['pages_messaging', 'pages_show_list'];
                                    const missingScopes = requiredScopes.filter(
                                        scope => !debugData.data.scopes.includes(scope)
                                    );
                                    if (missingScopes.length > 0) {
                                        warnings.push(`Missing Facebook scopes: ${missingScopes.join(', ')}`);
                                    }
                                }

                                // Check expiration
                                if (debugData.data.expires_at) {
                                    const expiresAt = new Date(debugData.data.expires_at * 1000);
                                    const daysUntilExpiry = Math.floor((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                                    tenantConnection.facebook.tokenExpiresIn = `${daysUntilExpiry} days`;

                                    if (daysUntilExpiry < 7) {
                                        warnings.push(`Facebook token expires in ${daysUntilExpiry} days - refresh recommended`);
                                    }
                                } else if (debugData.data.expires_at === 0) {
                                    tenantConnection.facebook.tokenExpiresIn = 'Never (Page token)';
                                }
                            }
                        } catch {
                            tenantConnection.facebook.tokenValid = false;
                            warnings.push('Could not verify Facebook token status');
                        }
                    }

                    // Check webhook subscription
                    try {
                        const subsUrl = `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/${settings.facebook.pageId}/subscribed_apps?access_token=${settings.facebook.pageAccessToken}`;
                        const subsResponse = await fetch(subsUrl, {
                            signal: AbortSignal.timeout(5000),
                        });
                        const subsData = await subsResponse.json();

                        tenantConnection.facebook.webhookSubscribed = !!(subsData.data && subsData.data.length > 0);
                        if (!tenantConnection.facebook.webhookSubscribed) {
                            warnings.push('Webhook not subscribed for Facebook page - messages won\'t be received');
                        }
                    } catch {
                        warnings.push('Could not verify webhook subscription status');
                    }
                } else {
                    warnings.push('Facebook not connected for this tenant');
                }

                // === INSTAGRAM CHECKS ===
                if (settings?.instagram?.connected) {
                    tenantConnection.instagram.connected = true;
                    tenantConnection.instagram.username = settings.instagram.username;
                    tenantConnection.instagram.businessAccountId = settings.instagram.businessAccountId;
                    tenantConnection.instagram.authMethod = settings.instagram.authMethod || 'facebook_page';

                    // Verify Instagram token
                    const instagramToken = settings.instagram.accessToken ||
                        settings.instagram.pageAccessToken ||
                        settings.facebook?.pageAccessToken;

                    if (instagramToken && appSecret) {
                        try {
                            const debugUrl = `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/debug_token?input_token=${instagramToken}&access_token=${appId}|${appSecret}`;
                            const debugResponse = await fetch(debugUrl, {
                                signal: AbortSignal.timeout(5000),
                            });
                            const debugData = await debugResponse.json();

                            tenantConnection.instagram.tokenValid = debugData.data?.is_valid || false;

                            // Check for Instagram scopes
                            if (debugData.data?.scopes) {
                                const hasInstagramMessaging = debugData.data.scopes.includes('instagram_manage_messages') ||
                                    debugData.data.scopes.includes('instagram_basic');
                                if (!hasInstagramMessaging) {
                                    warnings.push('Instagram messaging permissions not found in token');
                                }
                            }
                        } catch {
                            tenantConnection.instagram.tokenValid = false;
                            warnings.push('Could not verify Instagram token status');
                        }
                    } else {
                        warnings.push('No Instagram token available for validation');
                    }
                } else {
                    // Instagram not connected - just info, not an error
                    if (settings?.facebook?.connected) {
                        warnings.push('Instagram not connected (connect via Facebook Page settings)');
                    }
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
        } else if (warnings.length > 0) {
            status = 'degraded';
        }

        const processingTime = Date.now() - startTime;

        const response: WebhookHealthStatus = {
            status,
            timestamp: new Date().toISOString(),
            apiVersion: GRAPH_API_VERSION,
            configuredScopes: FACEBOOK_OAUTH_SCOPES,
            webhookFields: WEBHOOK_SUBSCRIPTION_FIELDS,
            checks,
            ...(errors.length > 0 && { errors }),
            ...(warnings.length > 0 && { warnings }),
        };

        logger.info('[Webhook Health] Health check completed', {
            status,
            processingTime,
            errorCount: errors.length,
            warningCount: warnings.length
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
            apiVersion: GRAPH_API_VERSION,
            configuredScopes: FACEBOOK_OAUTH_SCOPES,
            webhookFields: WEBHOOK_SUBSCRIPTION_FIELDS,
            checks: {
                verifyToken: false,
                appConfigured: false,
                appSecretConfigured: false,
                facebookApiReachable: false,
            },
            errors: [error instanceof Error ? error.message : 'Unknown error'],
            processingTimeMs: Date.now() - startTime,
        }, { status: 500 });
    }
}
