import { NextRequest } from 'next/server';
import { handleAgentRequest } from '@/lib/agent/dispatch';
import { TenantServiceFactory } from '@/lib/firebase/firestore-v2';

/**
 * Agent tool: ical_check_availability.
 *
 * Live-fetches the property's Airbnb iCal feed and tells the agent whether
 * [checkIn, checkOut) is free.
 *
 * IMPORTANT: this endpoint NEVER persists the calendar. It is a read-through
 * to Airbnb (or another configured iCal source) used purely to answer the
 * customer's "está livre nessas datas?" question. The system no longer
 * maintains an internal availability calendar — Airbnb is the source of truth.
 *
 * Source URL resolution priority:
 *   1. property.iCalImportUrl (legacy field — kept readable for transition)
 *   2. property.airbnbUrl     → derives the public iCal feed URL
 *      Airbnb feeds live at https://www.airbnb.com/calendar/ical/{listingId}.ics?s={token}
 *      Without the export token we can't access the feed, so when only
 *      airbnbUrl exists without a stored ical token we return
 *      { available: null, reason: 'no_calendar' }.
 */

interface ConflictBlock {
  start: string;
  end: string;
  summary?: string;
}

function _isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function _parseIcalDate(value: string): Date | null {
  // ICS dates: 20260615 or 20260615T140000Z. We only need the calendar date.
  const datePart = value.replace(/[-:]/g, '').slice(0, 8);
  if (datePart.length !== 8) return null;
  const y = Number(datePart.slice(0, 4));
  const m = Number(datePart.slice(4, 6));
  const d = Number(datePart.slice(6, 8));
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

function _rangesOverlap(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  // Half-open [start, end) — Airbnb checkout day is exclusive on both sides.
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Minimal ICS parser — enough for Airbnb/Booking VEVENT blocks. We avoid
 * pulling in a heavy dependency here; this runs in Edge-style serverless and
 * the format we need to handle is narrow.
 */
function parseIcsEvents(ics: string): ConflictBlock[] {
  const lines = ics.replace(/\r\n[ \t]/g, '').split(/\r?\n/);
  const out: ConflictBlock[] = [];
  let current: Partial<ConflictBlock> | null = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      current = {};
    } else if (line === 'END:VEVENT') {
      if (current?.start && current.end) {
        out.push(current as ConflictBlock);
      }
      current = null;
    } else if (current) {
      const [rawKey, ...rest] = line.split(':');
      if (!rawKey || rest.length === 0) continue;
      const value = rest.join(':');
      const key = rawKey.split(';')[0]; // drop params like ;VALUE=DATE
      if (key === 'DTSTART') {
        const d = _parseIcalDate(value);
        if (d) current.start = _isoDateOnly(d);
      } else if (key === 'DTEND') {
        const d = _parseIcalDate(value);
        if (d) current.end = _isoDateOnly(d);
      } else if (key === 'SUMMARY') {
        current.summary = value;
      }
    }
  }
  return out;
}

function deriveAirbnbIcalUrl(property: any): string | null {
  if (property.iCalImportUrl) return property.iCalImportUrl as string;
  // The agent doesn't try to reverse-engineer a feed URL without a token,
  // because Airbnb requires an export token only the host can grant.
  return null;
}

export async function POST(req: NextRequest) {
  return handleAgentRequest(req, {
    check_availability: async (params, { tenantId }) => {
      if (!params.propertyId) throw new Error('propertyId required');
      if (!params.checkIn) throw new Error('checkIn required');
      if (!params.checkOut) throw new Error('checkOut required');

      const checkIn = new Date(`${params.checkIn}T00:00:00Z`);
      const checkOut = new Date(`${params.checkOut}T00:00:00Z`);
      if (!(checkIn instanceof Date) || isNaN(+checkIn)) throw new Error('Invalid checkIn');
      if (!(checkOut instanceof Date) || isNaN(+checkOut)) throw new Error('Invalid checkOut');
      if (checkIn >= checkOut) throw new Error('checkOut must be after checkIn');

      const services = new TenantServiceFactory(tenantId);
      const property: any = await services.properties.get(params.propertyId);
      if (!property) throw new Error('Property not found');

      const icalUrl = deriveAirbnbIcalUrl(property);
      if (!icalUrl) {
        return {
          available: null,
          reason: 'no_calendar',
          source: 'none',
          message: 'Property has no Airbnb iCal feed configured.',
        };
      }

      let icsText: string;
      try {
        const resp = await fetch(icalUrl, {
          // Airbnb iCal feeds change frequently — never cache.
          cache: 'no-store',
          headers: { 'User-Agent': 'locai-agent/1.0' },
        });
        if (!resp.ok) {
          return {
            available: null,
            reason: 'fetch_failed',
            source: 'airbnb',
            status: resp.status,
          };
        }
        icsText = await resp.text();
      } catch (err: any) {
        return {
          available: null,
          reason: 'fetch_error',
          source: 'airbnb',
          error: err?.message || 'unknown',
        };
      }

      const events = parseIcsEvents(icsText);
      const conflicts: ConflictBlock[] = [];
      for (const ev of events) {
        const evStart = new Date(`${ev.start}T00:00:00Z`);
        const evEnd = new Date(`${ev.end}T00:00:00Z`);
        if (_rangesOverlap(checkIn, checkOut, evStart, evEnd)) {
          conflicts.push(ev);
        }
      }
      return {
        available: conflicts.length === 0,
        conflicts,
        source: 'airbnb',
        checkIn: params.checkIn,
        checkOut: params.checkOut,
      };
    },
  });
}
