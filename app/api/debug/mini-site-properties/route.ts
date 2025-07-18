import { NextRequest, NextResponse } from 'next/server';
import { miniSiteService } from '@/lib/services/mini-site-service';
import { propertyService } from '@/lib/firebase/firestore';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || 'default';
    
    console.log('=== DEBUG: Mini-site properties ===');
    console.log('TenantId:', tenantId);
    
    // Get all properties from database
    const allProperties = await propertyService.getAll();
    console.log('Total properties in database:', allProperties.length);
    
    // Log details of each property
    allProperties.forEach(p => {
      console.log(`Property ${p.id}: tenant=${p.tenantId}, active=${p.isActive}, title=${p.title}`);
    });
    
    // Get properties for the specific tenant
    const tenantProperties = allProperties.filter(p => p.tenantId === tenantId);
    console.log('Properties for tenant:', tenantProperties.length);
    
    // Get public properties via mini-site service
    const publicProperties = await miniSiteService.getPublicProperties(tenantId);
    console.log('Public properties:', publicProperties.length);
    
    // Get mini-site config
    const config = await miniSiteService.getConfig(tenantId);
    console.log('Mini-site config:', {
      isActive: config?.isActive,
      businessName: config?.contactInfo?.businessName
    });
    
    return NextResponse.json({
      success: true,
      data: {
        tenantId,
        totalProperties: allProperties.length,
        tenantProperties: tenantProperties.length,
        publicProperties: publicProperties.length,
        config: config,
        allProperties: allProperties.map(p => ({
          id: p.id,
          tenantId: p.tenantId,
          title: p.title,
          isActive: p.isActive,
          status: p.status
        })),
        tenantPropertiesDetails: tenantProperties.map(p => ({
          id: p.id,
          tenantId: p.tenantId,
          title: p.title,
          isActive: p.isActive,
          status: p.status
        })),
        publicPropertiesDetails: publicProperties.map(p => ({
          id: p.id,
          tenantId: p.tenantId,
          name: p.name,
          isActive: p.isActive
        }))
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 });
  }
}