import { NextRequest, NextResponse } from 'next/server';
import { billingService } from '@/lib/services/billing-service';
import { auth, adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    const decodedToken = await auth.verifyIdToken(token);
    const tenantId = decodedToken.tenantId || decodedToken.uid;

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
    console.error('Erro ao buscar campanhas:', error);
    return NextResponse.json(
      { error: 'Erro ao buscar campanhas' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
    }
    const decodedToken = await auth.verifyIdToken(token);
    const tenantId = decodedToken.tenantId || decodedToken.uid;
    const userId = decodedToken.uid;

    const body = await request.json();
    
    // Criar campanha
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
    console.error('Erro ao criar campanha:', error);
    return NextResponse.json(
      { error: 'Erro ao criar campanha' },
      { status: 500 }
    );
  }
}