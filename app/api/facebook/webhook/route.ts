import { NextRequest, NextResponse } from 'next/server'
import { FacebookMessageHandler } from '@/lib/facebook/message-handler'
import { logger } from '@/lib/utils/logger'

// Verify Token should be in env
const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || 'locai_verify_token'

export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams
    const mode = searchParams.get('hub.mode')
    const token = searchParams.get('hub.verify_token')
    const challenge = searchParams.get('hub.challenge')

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            logger.info('WEBHOOK_VERIFIED')
            return new NextResponse(challenge, { status: 200 })
        } else {
            return new NextResponse('Forbidden', { status: 403 })
        }
    }

    return new NextResponse('Bad Request', { status: 400 })
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json()

        if (body.object === 'page' || body.object === 'instagram') {
            for (const entry of body.entry) {
                // Determine tenantId from Page ID or Instagram Business Account ID
                const pageId = entry.id; // This is the Page ID or IG Business ID

                // TODO: In a real production scenario, we would look up the tenantId 
                // from a database mapping (e.g., Settings collection) using this pageId.
                // For now, we will use a helper function or a direct lookup if possible.
                // Since we don't have a global "PageID -> TenantID" index yet, 
                // we might need to query the settings collection.

                // For this MVP/Phase 2, we will try to find the tenant by querying the Settings collection.
                // We need to import the SettingsService or Firestore helper.

                // Let's assume we have a helper function `findTenantByPageId(pageId)`.
                // Since we can't easily import that here without creating it, 
                // we will implement a basic query using MultiTenantFirestoreService's underlying db or a new service method.

                // However, `SettingsService` is tenant-scoped. We need a global lookup.
                // We'll use a direct Firestore query here for efficiency.

                const tenantId = await findTenantByPageId(pageId);

                if (tenantId) {
                    const handler = new FacebookMessageHandler(tenantId)
                    await handler.handleWebhook(body)
                } else {
                    logger.warn(`No tenant found for Page ID: ${pageId}`)
                }
            }
        }

        return new NextResponse('EVENT_RECEIVED', { status: 200 })
    } catch (error) {
        logger.error('Error in Facebook webhook:', error)
        return new NextResponse('Internal Server Error', { status: 500 })
    }
}

// Helper to find tenant by Page ID
// This requires a global query across all tenants' settings or a dedicated mapping collection.
// Since our data model is `tenants/{tenantId}/settings/settings`, we can't easily query across all tenants 
// unless we use a Collection Group Query or have a separate `page_mappings` collection.
//
// OPTION A: Collection Group Query on `settings` collection where `facebook.pageId` == pageId.
// OPTION B: A separate `integrations` or `mappings` collection at the root.
//
// We will use Option A (Collection Group Query) as it fits the current schema without new root collections.
import { collectionGroup, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

async function findTenantByPageId(pageId: string): Promise<string | null> {
    try {
        // Query 'settings' collection group
        const settingsQuery = query(
            collectionGroup(db, 'settings'),
            where('facebook.pageId', '==', pageId),
            limit(1)
        );

        const snapshot = await getDocs(settingsQuery);

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            // The document ID in 'settings' collection is usually the tenantId, 
            // or we can get it from the ref path or a field if we stored it.
            // In our `SettingsService`, we store `id: tenantId`.
            return doc.id;
        }

        return null;
    } catch (error) {
        logger.error('Error finding tenant by Page ID:', error);
        return null;
    }
}
