import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';
import crypto from 'crypto';
import {
    FACEBOOK_OAUTH_BASE_URL,
    GRAPH_API_VERSION,
    INSTAGRAM_OAUTH_SCOPES
} from '@/lib/facebook/constants';

/**
 * GET /api/instagram/oauth/start
 *
 * Inicia o fluxo OAuth para conectar Instagram Business.
 *
 * IMPORTANTE: O Instagram Business API (2024+) requer que a conta Instagram
 * Business/Creator esteja vinculada a uma Página do Facebook.
 *
 * Permissões Instagram Business API:
 * - instagram_business_basic: Informações básicas da conta Instagram Business
 * - instagram_business_manage_messages: Enviar/receber DMs do Instagram
 *
 * Nota: Este endpoint usa o fluxo OAuth do Facebook pois as permissões
 * de Instagram são concedidas através do login do Facebook quando a página
 * tem uma conta Instagram Business vinculada.
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
        const redirectUri = process.env.INSTAGRAM_OAUTH_REDIRECT_URI ||
            process.env.FACEBOOK_OAUTH_REDIRECT_URI ||
            `${process.env.NEXT_PUBLIC_APP_URL}/api/facebook/oauth/callback`;

        if (!appId) {
            logger.error('[Instagram OAuth] Missing NEXT_PUBLIC_FACEBOOK_APP_ID');
            return NextResponse.json(
                { error: 'Facebook/Instagram App ID not configured', code: 'CONFIG_ERROR' },
                { status: 500 }
            );
        }

        // Generate CSRF state token
        // Incluímos flag para indicar que o fluxo foi iniciado para Instagram
        const randomToken = crypto.randomBytes(32).toString('hex');
        const timestamp = Date.now();
        const state = Buffer.from(
            JSON.stringify({
                tenantId,
                token: randomToken,
                ts: timestamp,
                source: 'instagram' // Indica que o fluxo foi iniciado para Instagram
            })
        ).toString('base64url');

        // Usar as permissões do Instagram Business API
        const scopes = INSTAGRAM_OAUTH_SCOPES.join(',');

        // Build Facebook authorization URL (que inclui permissões de Instagram)
        // O Instagram Business Account vinculado à página será retornado automaticamente
        const authUrl = new URL(`${FACEBOOK_OAUTH_BASE_URL}/${GRAPH_API_VERSION}/dialog/oauth`);
        authUrl.searchParams.set('client_id', appId);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('scope', scopes);
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('response_type', 'code');

        logger.info('[Instagram OAuth] Generated authorization URL (via Facebook)', {
            tenantId: tenantId.substring(0, 8) + '***',
            redirectUri,
            scopes,
            note: 'Instagram connection requires Facebook Page with linked Instagram Business Account'
        });

        return NextResponse.json({
            success: true,
            authUrl: authUrl.toString(),
            state,
            message: 'Para conectar o Instagram, você precisa de uma Página do Facebook com uma conta Instagram Business vinculada.'
        });

    } catch (error) {
        logger.error('[Instagram OAuth] Error generating auth URL:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
