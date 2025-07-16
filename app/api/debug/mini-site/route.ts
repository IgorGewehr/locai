/**
 * Debug API to check and activate mini-site
 * GET /api/debug/mini-site - Check current status
 * POST /api/debug/mini-site - Activate mini-site for first tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { settingsService } from '@/lib/services/settings-service';
import { adminDb } from '@/lib/firebase/admin';

export async function GET() {
  try {
    console.log('🔍 Checking mini-site configuration...');

    // Get all settings documents to find tenant IDs
    const settingsSnapshot = await adminDb.collection('settings').get();
    
    if (settingsSnapshot.empty) {
      return NextResponse.json({
        status: 'error',
        message: 'No tenants found in the database',
        tenants: []
      });
    }

    const tenants: any[] = [];
    const inactiveTenants: any[] = [];

    settingsSnapshot.forEach((doc) => {
      const tenantId = doc.id;
      const data = doc.data();
      
      const tenantInfo = {
        id: tenantId,
        company: data.company?.name || 'Not set',
        miniSiteActive: data.miniSite?.active || false,
        miniSiteTitle: data.miniSite?.title || 'Not set',
        miniSiteUrl: `http://localhost:3002/site/${tenantId}`
      };
      
      tenants.push(tenantInfo);
      
      if (!data.miniSite?.active) {
        inactiveTenants.push(tenantInfo);
      }
    });

    return NextResponse.json({
      status: 'success',
      message: `Found ${tenants.length} tenant(s)`,
      tenants,
      inactiveTenants,
      suggestion: inactiveTenants.length > 0 
        ? `POST to this endpoint to activate mini-site for tenant: ${inactiveTenants[0].id}`
        : 'All tenants have mini-site activated'
    });

  } catch (error) {
    console.error('Error checking mini-site config:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to check mini-site configuration',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log('🚀 Activating mini-site...');

    // Get all settings documents
    const settingsSnapshot = await adminDb.collection('settings').get();
    
    if (settingsSnapshot.empty) {
      return NextResponse.json({
        status: 'error',
        message: 'No tenants found in the database'
      }, { status: 404 });
    }

    // Find first inactive tenant
    let targetTenant = null;
    settingsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.miniSite?.active && !targetTenant) {
        targetTenant = {
          id: doc.id,
          data: data
        };
      }
    });

    if (!targetTenant) {
      // If no inactive tenants, use the first one
      const firstDoc = settingsSnapshot.docs[0];
      targetTenant = {
        id: firstDoc.id,
        data: firstDoc.data()
      };
    }

    // Activate mini-site for the target tenant
    await settingsService.updateMiniSiteSettings(targetTenant.id, {
      active: true,
      title: 'Propriedades para Aluguel',
      description: 'Encontre a propriedade perfeita para suas férias',
      whatsappNumber: '5511999999999',
      companyEmail: 'contato@minhaempresa.com',
      primaryColor: '#1976d2',
      secondaryColor: '#dc004e',
      accentColor: '#ed6c02',
      fontFamily: 'modern',
      borderRadius: 'rounded',
      showPrices: true,
      showAvailability: true,
      showReviews: true,
      seoKeywords: 'imóveis, aluguel, temporada, férias, propriedades'
    });

    const miniSiteUrl = `http://localhost:3002/site/${targetTenant.id}`;

    return NextResponse.json({
      status: 'success',
      message: `Mini-site activated successfully for tenant: ${targetTenant.id}`,
      tenantId: targetTenant.id,
      miniSiteUrl,
      dashboardUrl: 'http://localhost:3002/dashboard/settings'
    });

  } catch (error) {
    console.error('Error activating mini-site:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to activate mini-site',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}