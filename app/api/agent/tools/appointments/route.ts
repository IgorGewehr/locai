import { NextRequest } from 'next/server';
import { handleAgentRequest } from '@/lib/agent/dispatch';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';
import { VisitStatus } from '@/lib/types/visit-appointment';

/**
 * Agent tool: appointments — visits, key pickups, support.
 *
 * IMPORTANT INVARIANT: appointmentType is ALWAYS one of {visit, key_pickup,
 * support}. The agent MUST NEVER schedule property reservations through this
 * endpoint — bookings happen on Airbnb. The Python guardrail rejects other
 * types; this route enforces the same as defense in depth.
 *
 * Underlying collection: `tenants/{tenantId}/visit_appointments` (the same
 * collection the existing visits UI uses). We add `appointmentType` to
 * existing docs at write time — for legacy docs without the field we
 * default to 'visit' on read (keeps backward compatibility).
 */

const ALLOWED_TYPES = new Set(['visit', 'key_pickup', 'support']);

function _toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function _addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

function _hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
}

function _minutesToHHMM(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

interface WorkingDay {
  isWorkingDay: boolean;
  startTime?: string;
  endTime?: string;
  lunchBreak?: { startTime: string; endTime: string };
  maxVisits?: number;
}

async function _getWorkingDay(
  tenantId: string,
  isoDate: string
): Promise<{ day: WorkingDay; bufferMinutes: number; defaultDuration: number }> {
  // Pull the first TenantVisitSchedule (most tenants have exactly one).
  const services = new TenantServiceFactory(tenantId);
  const schedules: any[] = await services.visitSchedules.getAll(5);
  const sched = schedules?.[0];
  if (!sched?.workingHours) {
    // Sensible default: weekdays 09–18, no working day on weekends.
    const dow = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
    const weekday = dow >= 1 && dow <= 5;
    return {
      day: { isWorkingDay: weekday, startTime: '09:00', endTime: '18:00' },
      bufferMinutes: 15,
      defaultDuration: 60,
    };
  }
  const weekdayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dow = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  const dayCfg: any = sched.workingHours[weekdayKeys[dow]] || {};
  const blocked = (sched.blockedDates || []).map((d: any) => {
    const dt = typeof d === 'string' ? d.slice(0, 10) : (d?.toDate?.() ?? d).toISOString().slice(0, 10);
    return dt;
  });
  if (blocked.includes(isoDate)) {
    return {
      day: { isWorkingDay: false },
      bufferMinutes: sched.visitBufferTime ?? 15,
      defaultDuration: sched.visitDurationDefault ?? 60,
    };
  }
  return {
    day: dayCfg,
    bufferMinutes: sched.visitBufferTime ?? 15,
    defaultDuration: sched.visitDurationDefault ?? 60,
  };
}

async function _existingSlotsForDate(tenantId: string, isoDate: string) {
  const services = new TenantServiceFactory(tenantId);
  const all: any[] = await services.visitAppointments.getWhere(
    'scheduledDate',
    '==',
    isoDate
  );
  return all.filter(
    (a: any) =>
      a.status !== VisitStatus.CANCELLED_BY_CLIENT &&
      a.status !== VisitStatus.CANCELLED_BY_AGENT &&
      a.status !== VisitStatus.NO_SHOW
  );
}

export async function POST(req: NextRequest) {
  return handleAgentRequest(req, {
    check_slots: async (params, { tenantId }) => {
      if (!params.date) throw new Error('date required');
      const dur = params.durationMinutes ?? 60;
      const { day, bufferMinutes } = await _getWorkingDay(tenantId, params.date);
      if (!day.isWorkingDay) {
        return { date: params.date, slots: [], reason: 'not_working_day' };
      }
      const start = _hhmmToMinutes(day.startTime || '09:00');
      const end = _hhmmToMinutes(day.endTime || '18:00');
      const lunch = day.lunchBreak
        ? [_hhmmToMinutes(day.lunchBreak.startTime), _hhmmToMinutes(day.lunchBreak.endTime)]
        : null;

      const existing = await _existingSlotsForDate(tenantId, params.date);
      const taken = existing.map((a: any) => {
        const s = _hhmmToMinutes(a.scheduledTime);
        return [s - bufferMinutes, s + (a.duration || dur) + bufferMinutes];
      });

      const slots: string[] = [];
      const step = 30; // suggest 30-minute granularity
      for (let t = start; t + dur <= end; t += step) {
        if (lunch && t < lunch[1] && t + dur > lunch[0]) continue;
        const collides = taken.some(([from, to]: [number, number]) => t < to && t + dur > from);
        if (!collides) slots.push(_minutesToHHMM(t));
      }
      return { date: params.date, slots };
    },

    get_next_available: async (params, { tenantId }) => {
      const dur = params.durationMinutes ?? 60;
      const days = Math.max(1, Math.min(30, params.daysAhead ?? 7));
      const startDate = params.fromDate ? new Date(`${params.fromDate}T00:00:00Z`) : new Date();
      for (let i = 0; i < days; i++) {
        const iso = _toIsoDate(_addDays(startDate, i));
        const { day, bufferMinutes } = await _getWorkingDay(tenantId, iso);
        if (!day.isWorkingDay) continue;
        const start = _hhmmToMinutes(day.startTime || '09:00');
        const end = _hhmmToMinutes(day.endTime || '18:00');
        const existing = await _existingSlotsForDate(tenantId, iso);
        const taken = existing.map((a: any) => {
          const s = _hhmmToMinutes(a.scheduledTime);
          return [s - bufferMinutes, s + (a.duration || dur) + bufferMinutes];
        });
        for (let t = start; t + dur <= end; t += 30) {
          const collides = taken.some(([from, to]: [number, number]) => t < to && t + dur > from);
          if (!collides) {
            return { date: iso, time: _minutesToHHMM(t) };
          }
        }
      }
      return { date: null, time: null };
    },

    create: async (params, { tenantId }) => {
      const apt = params.appointmentType;
      if (!ALLOWED_TYPES.has(apt)) {
        throw new Error(
          `appointmentType inválido: ${apt}. Apenas visit/key_pickup/support são permitidos.`
        );
      }
      if (!params.clientName) throw new Error('clientName required');
      if (!params.propertyId) throw new Error('propertyId required');
      if (!params.scheduledDate) throw new Error('scheduledDate required');
      if (!params.scheduledTime) throw new Error('scheduledTime required');

      const services = new TenantServiceFactory(tenantId);
      const property: any = await services.properties.get(params.propertyId);
      if (!property) throw new Error('Property not found');

      const id = await services.visitAppointments.create({
        clientId: params.clientId || '',
        clientName: params.clientName,
        clientPhone: params.clientPhone || '',
        propertyId: property.id,
        propertyName: property.title,
        propertyAddress: property.address,
        scheduledDate: params.scheduledDate,
        scheduledTime: params.scheduledTime,
        duration: params.duration || 60,
        status: VisitStatus.SCHEDULED,
        appointmentType: apt,
        notes: params.notes || '',
        agentId: params.agentId || undefined,
        source: 'whatsapp',
      } as any);
      return { id, appointmentType: apt };
    },

    list_by_client: async (params, { tenantId }) => {
      const services = new TenantServiceFactory(tenantId);
      let items: any[] = [];
      if (params.clientId) {
        items = await services.visitAppointments.getWhere('clientId', '==', params.clientId);
      } else if (params.phone) {
        items = await services.visitAppointments.getWhere('clientPhone', '==', params.phone);
      } else {
        throw new Error('Provide clientId or phone');
      }
      const limit = Math.max(1, Math.min(50, params.limit ?? 5));
      return { items: items.slice(0, limit) };
    },

    list_today: async (params, { tenantId }) => {
      const services = new TenantServiceFactory(tenantId);
      const today = _toIsoDate(new Date());
      let items: any[] = await services.visitAppointments.getWhere('scheduledDate', '==', today);
      if (params.agentId) items = items.filter((a) => a.agentId === params.agentId);
      items.sort((a, b) => (a.scheduledTime > b.scheduledTime ? 1 : -1));
      return { date: today, items };
    },

    list_upcoming: async (params, { tenantId }) => {
      const services = new TenantServiceFactory(tenantId);
      const today = _toIsoDate(new Date());
      const days = Math.max(1, Math.min(30, params.daysAhead ?? 7));
      const cutoff = _toIsoDate(_addDays(new Date(), days));
      let items: any[] = await services.visitAppointments.getAll(500);
      items = items.filter(
        (a) =>
          a.scheduledDate >= today &&
          a.scheduledDate <= cutoff &&
          a.status !== VisitStatus.CANCELLED_BY_CLIENT &&
          a.status !== VisitStatus.CANCELLED_BY_AGENT
      );
      if (params.agentId) items = items.filter((a) => a.agentId === params.agentId);
      if (params.appointmentType) {
        items = items.filter((a) => (a.appointmentType || 'visit') === params.appointmentType);
      }
      items.sort((a, b) =>
        a.scheduledDate === b.scheduledDate
          ? (a.scheduledTime > b.scheduledTime ? 1 : -1)
          : a.scheduledDate > b.scheduledDate
          ? 1
          : -1
      );
      const limit = Math.max(1, Math.min(50, params.limit ?? 20));
      return { items: items.slice(0, limit) };
    },

    update: async (params, { tenantId }) => {
      if (!params.id) throw new Error('id required');
      if (!params.patch) throw new Error('patch required');
      const services = new TenantServiceFactory(tenantId);
      await services.visitAppointments.update(params.id, params.patch);
      return { id: params.id, ok: true };
    },

    cancel: async (params, { tenantId }) => {
      if (!params.id) throw new Error('id required');
      const services = new TenantServiceFactory(tenantId);
      const status =
        params.cancelledBy === 'agent'
          ? VisitStatus.CANCELLED_BY_AGENT
          : VisitStatus.CANCELLED_BY_CLIENT;
      await services.visitAppointments.update(params.id, {
        status,
        notes: params.reason || undefined,
      } as any);
      return { id: params.id, status };
    },
  });
}
