import { NextRequest } from 'next/server';
import { handleAgentRequest } from '@/lib/agent/dispatch';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

/**
 * Agent tool: clients (lookup + create + minimal updates + history).
 */

function _normalizePhone(p: string): string {
  return p.replace(/\D/g, '');
}

export async function POST(req: NextRequest) {
  return handleAgentRequest(req, {
    lookup_by_phone: async (params, { tenantId }) => {
      if (!params.phone) throw new Error('phone required');
      const services = new TenantServiceFactory(tenantId);
      const normalized = _normalizePhone(params.phone);
      // Try multiple field variations because clients_v1 has had several.
      const all: any[] = await services.clients.getAll(500);
      const match = all.find((c: any) => {
        const p1 = _normalizePhone(c.phone || '');
        const p2 = _normalizePhone(c.whatsapp || '');
        return p1 === normalized || p2 === normalized;
      });
      return match || null;
    },

    create: async (params, { tenantId }) => {
      if (!params.name) throw new Error('name required');
      const services = new TenantServiceFactory(tenantId);
      const id = await services.clients.create({
        name: params.name,
        phone: params.phone || '',
        whatsapp: params.whatsapp || params.phone || '',
        email: params.email || '',
        source: params.source || 'whatsapp',
        notes: params.notes || '',
      } as any);
      return { id };
    },

    update: async (params, { tenantId }) => {
      if (!params.id) throw new Error('id required');
      if (!params.patch) throw new Error('patch required');
      const services = new TenantServiceFactory(tenantId);
      await services.clients.update(params.id, params.patch);
      return { id: params.id, ok: true };
    },

    get_full_history: async (params, { tenantId }) => {
      if (!params.id) throw new Error('id required');
      const services = new TenantServiceFactory(tenantId);
      const profile: any = await services.clients.get(params.id);
      if (!profile) throw new Error('Client not found');
      const appointments = await services.visitAppointments.getWhere(
        'clientId',
        '==',
        params.id
      );
      return {
        profile,
        appointments: appointments.slice(0, 20),
      };
    },
  });
}
