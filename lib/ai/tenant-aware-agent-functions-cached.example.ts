// lib/ai/tenant-aware-agent-functions-cached.example.ts
// EXEMPLO: Como usar o cache nas funções de AI

import { propertyCacheService } from '@/lib/cache/property-cache-advanced';
import { logger } from '@/lib/utils/logger';
import { Property } from '@/lib/types/property';

interface SearchPropertiesArgs {
  location?: string;
  guests?: number;
  bedrooms?: number;
  checkIn?: string;
  checkOut?: string;
  maxPrice?: number;
  amenities?: string[];
  propertyType?: string;
}

/**
 * ✅ VERSÃO COM CACHE (OTIMIZADA)
 */
export async function searchPropertiesCached(
  args: SearchPropertiesArgs,
  tenantId: string
): Promise<{ properties: Property[]; fromCache: boolean }> {
  const startTime = Date.now();

  try {
    logger.info('[searchPropertiesCached] Starting search', {
      tenantId: tenantId.substring(0, 8) + '***',
      filters: args
    });

    // 1️⃣ BUSCAR COM CACHE (Base filtering no Firebase)
    const allProperties = await propertyCacheService.getCachedProperties(
      tenantId,
      {
        isActive: true,
        type: args.propertyType,
        maxPrice: args.maxPrice
      },
      300000 // TTL: 5 minutos
    );

    logger.info('[searchPropertiesCached] Properties fetched', {
      totalProperties: allProperties.length,
      processingTime: Date.now() - startTime,
      cacheStats: propertyCacheService.getStats()
    });

    // 2️⃣ FILTROS CLIENT-SIDE (Mais complexos)
    let filteredProperties = allProperties;

    // Filtrar por localização (case-insensitive, partial match)
    if (args.location) {
      const searchTerm = args.location.toLowerCase();
      filteredProperties = filteredProperties.filter(p =>
        p.address?.city?.toLowerCase().includes(searchTerm) ||
        p.address?.neighborhood?.toLowerCase().includes(searchTerm) ||
        p.title?.toLowerCase().includes(searchTerm) ||
        p.description?.toLowerCase().includes(searchTerm)
      );
    }

    // Filtrar por número de hóspedes
    if (args.guests) {
      filteredProperties = filteredProperties.filter(p =>
        (p.maxGuests || 0) >= args.guests!
      );
    }

    // Filtrar por quartos
    if (args.bedrooms) {
      filteredProperties = filteredProperties.filter(p =>
        (p.bedrooms || 0) >= args.bedrooms!
      );
    }

    // Filtrar por amenidades
    if (args.amenities && args.amenities.length > 0) {
      filteredProperties = filteredProperties.filter(p => {
        const propertyAmenities = p.amenities || [];
        return args.amenities!.some(amenity =>
          propertyAmenities.some(pa =>
            pa.toLowerCase().includes(amenity.toLowerCase())
          )
        );
      });
    }

    // 3️⃣ VERIFICAR DISPONIBILIDADE (se datas fornecidas)
    // TODO: Implementar verificação de disponibilidade no cache também
    if (args.checkIn && args.checkOut) {
      // Por enquanto, deixar passar (verificação acontece depois)
      logger.debug('[searchPropertiesCached] Dates provided, availability check needed', {
        checkIn: args.checkIn,
        checkOut: args.checkOut
      });
    }

    // 4️⃣ ORDENAR POR RELEVÂNCIA
    // Propriedades com mais comodidades primeiro
    filteredProperties.sort((a, b) => {
      const scoreA = (a.amenities?.length || 0) + (a.photos?.length || 0) / 10;
      const scoreB = (b.amenities?.length || 0) + (b.photos?.length || 0) / 10;
      return scoreB - scoreA;
    });

    const processingTime = Date.now() - startTime;

    logger.info('[searchPropertiesCached] Search completed', {
      tenantId: tenantId.substring(0, 8) + '***',
      totalProperties: allProperties.length,
      filteredProperties: filteredProperties.length,
      processingTime: `${processingTime}ms`,
      cacheStats: propertyCacheService.getStats()
    });

    return {
      properties: filteredProperties,
      fromCache: propertyCacheService.getStats().hitRate !== '0%'
    };

  } catch (error) {
    logger.error('[searchPropertiesCached] Search failed', {
      tenantId: tenantId.substring(0, 8) + '***',
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    throw error;
  }
}

/**
 * ✅ FUNÇÃO PARA OBTER DETALHES DE PROPRIEDADE (COM CACHE)
 */
export async function getPropertyDetailsCached(
  propertyId: string,
  tenantId: string
): Promise<Property | null> {
  const startTime = Date.now();

  try {
    // Buscar com cache individual (TTL mais longo para propriedades específicas)
    const property = await propertyCacheService.getCachedProperty(
      tenantId,
      propertyId,
      600000 // 10 minutos
    );

    logger.info('[getPropertyDetailsCached] Property fetched', {
      tenantId: tenantId.substring(0, 8) + '***',
      propertyId,
      found: !!property,
      processingTime: Date.now() - startTime,
      cacheStats: propertyCacheService.getStats()
    });

    return property;

  } catch (error) {
    logger.error('[getPropertyDetailsCached] Fetch failed', {
      tenantId: tenantId.substring(0, 8) + '***',
      propertyId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return null;
  }
}

/**
 * ✅ INVALIDAR CACHE QUANDO PROPRIEDADE É ATUALIZADA
 * (Chamar em update/create/delete de propriedades)
 */
export function invalidatePropertyCache(tenantId: string, propertyId?: string): void {
  if (propertyId) {
    propertyCacheService.invalidateProperty(tenantId, propertyId);
    logger.info('[invalidatePropertyCache] Property cache invalidated', {
      tenantId: tenantId.substring(0, 8) + '***',
      propertyId
    });
  } else {
    propertyCacheService.invalidateTenant(tenantId);
    logger.info('[invalidatePropertyCache] Tenant cache invalidated', {
      tenantId: tenantId.substring(0, 8) + '***'
    });
  }
}

/**
 * ✅ ENDPOINT PARA MONITORAR CACHE
 * Adicionar em: app/api/admin/cache/stats/route.ts
 */
export function getCacheStats() {
  return propertyCacheService.getStats();
}

/**
 * ✅ COMPARAÇÃO: ANTES vs DEPOIS
 */
export async function benchmarkCachePerformance(tenantId: string) {
  console.log('🔬 BENCHMARK: Cache Performance\n');

  // Limpar cache para teste limpo
  propertyCacheService.clearAll();
  propertyCacheService.resetStats();

  // Teste 1: Primeira busca (MISS)
  console.log('Test 1: First search (Cache MISS expected)');
  const start1 = Date.now();
  const result1 = await searchPropertiesCached({ location: 'praia' }, tenantId);
  const time1 = Date.now() - start1;
  console.log(`⏱️  Time: ${time1}ms`);
  console.log(`📦 Properties: ${result1.properties.length}`);
  console.log(`📊 Cache stats:`, propertyCacheService.getStats());
  console.log('');

  // Teste 2: Mesma busca (HIT)
  console.log('Test 2: Same search (Cache HIT expected)');
  const start2 = Date.now();
  const result2 = await searchPropertiesCached({ location: 'praia' }, tenantId);
  const time2 = Date.now() - start2;
  console.log(`⏱️  Time: ${time2}ms`);
  console.log(`📦 Properties: ${result2.properties.length}`);
  console.log(`🚀 Speedup: ${(time1 / time2).toFixed(2)}x faster`);
  console.log(`📊 Cache stats:`, propertyCacheService.getStats());
  console.log('');

  // Teste 3: 10 buscas paralelas (Stress test)
  console.log('Test 3: 10 parallel searches');
  const start3 = Date.now();
  await Promise.all(
    Array(10).fill(null).map(() =>
      searchPropertiesCached({ location: 'praia' }, tenantId)
    )
  );
  const time3 = Date.now() - start3;
  console.log(`⏱️  Total time: ${time3}ms`);
  console.log(`⏱️  Avg per search: ${(time3 / 10).toFixed(2)}ms`);
  console.log(`📊 Cache stats:`, propertyCacheService.getStats());

  return {
    firstSearchTime: time1,
    cachedSearchTime: time2,
    speedup: time1 / time2,
    parallelSearchAvg: time3 / 10,
    finalCacheStats: propertyCacheService.getStats()
  };
}
