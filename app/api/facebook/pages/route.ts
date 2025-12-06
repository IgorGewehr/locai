import { NextRequest, NextResponse } from 'next/server';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { logger } from '@/lib/utils/logger';
import { GRAPH_API_VERSION, GRAPH_API_BASE_URL } from '@/lib/facebook/constants';

interface FacebookPage {
    id: string;
    name: string;
    access_token: string;
    category?: string;
    tasks?: string[];
    instagram_business_account?: {
        id: string;
        username?: string;
        name?: string;
    };
}

/**
 * GET /api/facebook/pages
 * Lists Facebook pages and connected Instagram accounts using the test token
 * Required permissions: pages_show_list, pages_messaging, pages_manage_metadata,
 *                       instagram_basic, instagram_manage_messages
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

        // Get the test token from environment
        const testToken = process.env.FACEBOOK_TEST_TOKEN;

        if (!testToken) {
            logger.error('[Facebook Pages] FACEBOOK_TEST_TOKEN not configured');
            return NextResponse.json(
                { error: 'Facebook test token not configured', code: 'CONFIG_ERROR' },
                { status: 500 }
            );
        }

        // Fetch pages with Instagram business account info
        // Using instagram_business_account field to get connected IG accounts
        const pagesUrl = `${GRAPH_API_BASE_URL}/${GRAPH_API_VERSION}/me/accounts?fields=id,name,access_token,category,tasks,instagram_business_account{id,username,name}&access_token=${testToken}`;

        logger.info('[Facebook Pages] Fetching pages and Instagram accounts with test token');

        const pagesResponse = await fetch(pagesUrl);
        const pagesData = await pagesResponse.json();

        if (pagesData.error) {
            logger.error('[Facebook Pages] Error from Graph API:', pagesData.error);
            return NextResponse.json(
                {
                    error: pagesData.error.message || 'Failed to fetch pages',
                    code: pagesData.error.code,
                    details: pagesData.error
                },
                { status: 400 }
            );
        }

        // Transform pages data for frontend
        const pages: FacebookPage[] = (pagesData.data || []).map((page: any) => ({
            id: page.id,
            name: page.name,
            access_token: page.access_token,
            category: page.category,
            tasks: page.tasks || [],
            instagram_business_account: page.instagram_business_account ? {
                id: page.instagram_business_account.id,
                username: page.instagram_business_account.username,
                name: page.instagram_business_account.name
            } : undefined
        }));

        // Count pages with Instagram connected
        const pagesWithInstagram = pages.filter(p => p.instagram_business_account).length;

        logger.info(`[Facebook Pages] Found ${pages.length} pages, ${pagesWithInstagram} with Instagram connected`);

        return NextResponse.json({
            success: true,
            pages,
            summary: {
                totalPages: pages.length,
                pagesWithInstagram
            },
            tokenType: 'test',
            permissions: ['pages_show_list', 'pages_messaging', 'pages_manage_metadata', 'instagram_basic', 'instagram_manage_messages']
        });

    } catch (error) {
        logger.error('[Facebook Pages] Error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
