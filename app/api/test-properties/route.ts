import { NextResponse } from 'next/server';
import { propertyService } from '@/lib/services/property-service';

export async function GET() {
  try {
    // Buscar todas as propriedades
    const allProperties = await propertyService.getActiveProperties('default');
    
    // Testar busca com filtros
    const searchResult = await propertyService.searchProperties({
      tenantId: 'default',
      guests: 2
    });
    
    return NextResponse.json({
      success: true,
      total: allProperties.length,
      active: allProperties.filter(p => p.isActive).length,
      searchResult: searchResult.length,
      properties: allProperties.slice(0, 3).map(p => ({
        id: p.id,
        name: p.name,
        city: p.city,
        basePrice: p.basePrice,
        isActive: p.isActive
      })),
      searchSample: searchResult.slice(0, 3).map(p => ({
        id: p.id,
        name: p.name,
        city: p.city,
        basePrice: p.basePrice
      }))
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    }, { status: 500 });
  }
}