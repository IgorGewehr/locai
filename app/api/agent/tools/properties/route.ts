import { NextRequest } from 'next/server';
import { handleAgentRequest } from '@/lib/agent/dispatch';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { extractPhotoUrls } from '@/lib/types/property';

/**
 * Agent tool: properties.
 *
 * Read-only. The agent uses this to answer "what do you have?" / "tell me
 * about X" / "send me photos". It does NOT create, update or delete
 * properties — those flows belong in the dashboard UI for humans.
 */

function summarize(p: any) {
  const photos = extractPhotoUrls(p.photos || p.photos_legacy);
  return {
    id: p.id,
    title: p.title,
    neighborhood: p.neighborhood,
    city: p.city,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    maxGuests: p.maxGuests,
    basePrice: p.basePrice,
    cleaningFee: p.cleaningFee,
    minimumNights: p.minimumNights,
    isActive: p.isActive,
    coverPhoto: photos[0] || null,
    airbnbUrl: p.airbnbUrl || null,
    amenities: p.amenities || [],
    category: p.category,
  };
}

export async function POST(req: NextRequest) {
  return handleAgentRequest(req, {
    list: async (params, { tenantId }) => {
      const services = new TenantServiceFactory(tenantId);
      let all = await services.properties.getAll(200);
      let filtered = all.filter((p: any) => p.isActive !== false);

      if (params.neighborhood) {
        const target = String(params.neighborhood).toLowerCase();
        filtered = filtered.filter((p: any) =>
          (p.neighborhood || '').toLowerCase().includes(target)
        );
      }
      if (params.city) {
        const target = String(params.city).toLowerCase();
        filtered = filtered.filter((p: any) => (p.city || '').toLowerCase().includes(target));
      }
      if (params.category) {
        filtered = filtered.filter((p: any) => p.category === params.category);
      }
      if (typeof params.minBedrooms === 'number') {
        filtered = filtered.filter((p: any) => (p.bedrooms || 0) >= params.minBedrooms);
      }
      if (typeof params.minBathrooms === 'number') {
        filtered = filtered.filter((p: any) => (p.bathrooms || 0) >= params.minBathrooms);
      }
      if (typeof params.minGuests === 'number') {
        filtered = filtered.filter((p: any) => (p.maxGuests || 0) >= params.minGuests);
      }
      if (typeof params.maxPricePerNight === 'number') {
        filtered = filtered.filter((p: any) => (p.basePrice || 0) <= params.maxPricePerNight);
      }
      if (Array.isArray(params.amenities) && params.amenities.length > 0) {
        const wanted: string[] = params.amenities.map((a: string) => a.toLowerCase());
        filtered = filtered.filter((p: any) => {
          const have = (p.amenities || []).map((a: string) => a.toLowerCase());
          return wanted.every((w) => have.includes(w));
        });
      }

      const limit = Math.max(1, Math.min(30, params.limit ?? 10));
      return {
        total: filtered.length,
        items: filtered.slice(0, limit).map(summarize),
      };
    },

    get_details: async (params, { tenantId }) => {
      if (!params.id) throw new Error('id required');
      const services = new TenantServiceFactory(tenantId);
      const p: any = await services.properties.get(params.id);
      if (!p) throw new Error('Property not found');
      const photos = extractPhotoUrls(p.photos || p.photos_legacy);
      return {
        ...summarize(p),
        description: p.description,
        address: p.address,
        photos,
        videos: p.videos || [],
        weekendSurcharge: p.weekendSurcharge,
        holidaySurcharge: p.holidaySurcharge,
        pricePerExtraGuest: p.pricePerExtraGuest,
        allowsPets: p.allowsPets,
      };
    },

    get_photos: async (params, { tenantId }) => {
      if (!params.id) throw new Error('id required');
      const services = new TenantServiceFactory(tenantId);
      const p: any = await services.properties.get(params.id);
      if (!p) throw new Error('Property not found');
      const photos = extractPhotoUrls(p.photos || p.photos_legacy);
      const limit = Math.max(1, Math.min(20, params.limit ?? 5));
      return {
        propertyId: p.id,
        title: p.title,
        photos: photos.slice(0, limit),
      };
    },

    search: async (params, { tenantId }) => {
      if (!params.query) throw new Error('query required');
      const services = new TenantServiceFactory(tenantId);
      const all = await services.properties.getAll(200);
      const q = String(params.query).toLowerCase();
      const matched = all
        .filter((p: any) => p.isActive !== false)
        .filter((p: any) => {
          const hay = `${p.title || ''} ${p.description || ''} ${p.neighborhood || ''} ${p.city || ''}`.toLowerCase();
          return hay.includes(q);
        });
      const limit = Math.max(1, Math.min(20, params.limit ?? 10));
      return {
        total: matched.length,
        items: matched.slice(0, limit).map(summarize),
      };
    },
  });
}
