import { NextRequest, NextResponse } from 'next/server';
import { createBillingService } from '@/lib/services/billing-service';
import { validateFirebaseAuth } from '@/lib/middleware/firebase-auth';
import { handleApiError } from '@/lib/utils/api-errors';
import { adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const tenantId = authContext.tenantId

    // Buscar campanhas
    const campaignsRef = adminDb.collection('billing_campaigns');
    const snapshot = await campaignsRef
      .where('tenantId', '==', tenantId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const campaigns = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({ campaigns });
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication and get tenantId
    const authContext = await validateFirebaseAuth(request)
    if (!authContext.authenticated || !authContext.tenantId) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const tenantId = authContext.tenantId
    const userId = authContext.userId || 'system'

    const body = await request.json();
    
    // Criar campanha
    const billingService = createBillingService(tenantId);
    const campaignId = await billingService.createCampaign({
      ...body,
      tenantId,
      createdBy: userId,
      status: 'scheduled'
    });

    return NextResponse.json({ 
      success: true, 
      campaignId 
    });
  } catch (error) {
    return handleApiError(error)
  }
}