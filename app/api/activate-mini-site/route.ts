/**
 * API para ativar o mini-site automaticamente para o usuário logado
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsService } from '@/lib/services/settings-service';
import { getAuthFromCookie } from '@/lib/utils/auth-cookie';

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthFromCookie(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tenantId = auth.tenantId || auth.userId; // Use tenantId or userId as fallback

    console.log(`🚀 Activating mini-site for user: ${tenantId}`);

    // Activate mini-site (this will create settings if not exists)
    await settingsService.updateMiniSiteSettings(tenantId, {
      active: true,
      title: 'Minha Imobiliária',
      description: 'Encontre o imóvel perfeito para suas férias',
      whatsappNumber: '5511999999999',
      companyEmail: auth.email,
      primaryColor: '#1976d2',
      secondaryColor: '#dc004e',
      accentColor: '#ed6c02',
      fontFamily: 'modern',
      borderRadius: 'rounded',
      showPrices: true,
      showAvailability: true,
      showReviews: true,
      seoKeywords: 'imóveis, aluguel, temporada, férias, propriedades',
    });

    // Generate mini-site URL based on environment
    const origin = new URL(request.url).origin;
    const miniSiteUrl = `${origin}/site/${tenantId}`;
    
    console.log(`✅ Mini-site URL generated: ${miniSiteUrl}`);

    return NextResponse.json({
      success: true,
      message: 'Mini-site ativado com sucesso!',
      tenantId,
      miniSiteUrl,
      instructions: [
        'Seu mini-site foi ativado com sucesso!',
        'Acesse as configurações em /dashboard/settings para personalizar',
        'Adicione propriedades em /dashboard/properties',
        `Compartilhe seu mini-site: ${miniSiteUrl}`
      ]
    });

  } catch (error) {
    console.error('Error activating mini-site:', error);
    return NextResponse.json({
      success: false,
      error: 'Falha ao ativar o mini-site',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}