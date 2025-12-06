import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { createSettingsService } from '@/lib/services/settings-service';
import { logger } from '@/lib/utils/logger';

interface InstagramAccount {
    id: string;
    username: string;
    name?: string;
    profilePictureUrl?: string;
    followersCount?: number;
    pageId?: string;
    pageName?: string;
    accessToken?: string;
    authMethod: 'instagram_login' | 'facebook_page';
}

/**
 * GET /api/instagram/accounts
 * Lists Instagram Business/Creator Accounts
 *
 * Supports two authentication methods:
 * 1. Instagram Login (direct) - Uses INSTAGRAM_TEST_TOKEN with graph.instagram.com
 * 2. Facebook Page connection - Uses FACEBOOK_TEST_TOKEN with graph.facebook.com
 *
 * Required permissions:
 * - instagram_basic (to get Instagram account info)
 * - instagram_manage_messages (to send/receive messages)
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
        const settingsService = createSettingsService(tenantId);
        const settings = await settingsService.getSettings(tenantId);

        const accounts: InstagramAccount[] = [];

        // Method 1: Try Instagram Login (direct) - IGAA tokens
        const instagramToken = process.env.INSTAGRAM_TEST_TOKEN;
        if (instagramToken) {
            logger.info('[Instagram Accounts] Trying Instagram Login method (direct token)');

            try {
                // Use graph.instagram.com for Instagram Login tokens
                const igMeUrl = `https://graph.instagram.com/me?fields=id,username,name,profile_picture_url,followers_count,account_type&access_token=${instagramToken}`;

                const igResponse = await fetch(igMeUrl);
                const igData = await igResponse.json();

                if (!igData.error && igData.id) {
                    logger.info(`[Instagram Accounts] Found Instagram account via direct login: @${igData.username}`);

                    accounts.push({
                        id: igData.id,
                        username: igData.username || 'Instagram Account',
                        name: igData.name,
                        profilePictureUrl: igData.profile_picture_url,
                        followersCount: igData.followers_count,
                        accessToken: instagramToken,
                        authMethod: 'instagram_login'
                    });
                } else if (igData.error) {
                    logger.warn('[Instagram Accounts] Instagram Login token error:', {
                        error: igData.error.message,
                        code: igData.error.code
                    });
                }
            } catch (error) {
                logger.warn('[Instagram Accounts] Failed to fetch via Instagram Login:', error);
            }
        }

        // Method 2: Try Facebook Page connection - EAAM tokens
        const facebookToken = process.env.FACEBOOK_TEST_TOKEN || settings?.facebook?.pageAccessToken;
        if (facebookToken && accounts.length === 0) {
            logger.info('[Instagram Accounts] Trying Facebook Page method');

            try {
                // Get pages with Instagram business accounts
                const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count}&access_token=${facebookToken}`;

                const pagesResponse = await fetch(pagesUrl);
                const pagesData = await pagesResponse.json();

                if (!pagesData.error && pagesData.data) {
                    const pagesWithInstagram = pagesData.data.filter(
                        (page: { instagram_business_account?: { id: string } }) => page.instagram_business_account
                    );

                    for (const page of pagesWithInstagram) {
                        const igAccount = page.instagram_business_account;
                        logger.info(`[Instagram Accounts] Found Instagram account via Facebook Page: @${igAccount.username}`);

                        accounts.push({
                            id: igAccount.id,
                            username: igAccount.username || 'Instagram Business',
                            name: igAccount.name || page.name,
                            profilePictureUrl: igAccount.profile_picture_url,
                            followersCount: igAccount.followers_count,
                            pageId: page.id,
                            pageName: page.name,
                            accessToken: page.access_token,
                            authMethod: 'facebook_page'
                        });
                    }
                } else if (pagesData.error) {
                    logger.warn('[Instagram Accounts] Facebook Page method error:', {
                        error: pagesData.error.message,
                        code: pagesData.error.code
                    });
                }
            } catch (error) {
                logger.warn('[Instagram Accounts] Failed to fetch via Facebook Page:', error);
            }
        }

        // Return results
        if (accounts.length === 0) {
            return NextResponse.json({
                success: true,
                hasInstagram: false,
                message: 'Nenhuma conta do Instagram encontrada.',
                accounts: [],
                hint: 'Configure INSTAGRAM_TEST_TOKEN (para Instagram Login direto) ou conecte uma página do Facebook com Instagram Business vinculado.'
            });
        }

        return NextResponse.json({
            success: true,
            hasInstagram: true,
            accounts: accounts.map(acc => ({
                id: acc.id,
                username: acc.username,
                name: acc.name,
                profilePictureUrl: acc.profilePictureUrl,
                followersCount: acc.followersCount,
                pageId: acc.pageId,
                pageName: acc.pageName,
                authMethod: acc.authMethod
            }))
        });

    } catch (error) {
        logger.error('[Instagram Accounts] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
