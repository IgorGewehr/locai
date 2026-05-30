/**
 * Helpers do canal do Assistente Sofia (IA↔operador) — contratos 3/4/5.
 *
 * O feed do assistente mistura:
 *  - CHAMADOS: owner_alerts criados pela Sofia via notify_owner (kind='alert')
 *  - CHAT LIVRE: mensagens operador↔IA persistidas em assistant_chat (kind='message')
 *
 * Aqui ficam os tipos pinados, o normalizador de datas Firestore e a coerção
 * de campos do card. Nenhum dado é fabricado: campos ausentes ficam undefined.
 */

/** Documento bruto de owner_alerts (sob tenants/{tid}/owner_alerts). */
export interface OwnerAlertDoc {
  id?: string;
  tenantId?: string;
  conversationId?: string;
  clientPhone?: string;
  propertyId?: string | null;
  reason?: string;
  severity?: string;
  summary?: string;
  deepLink?: string;
  status?: string;
  repingCount?: number;
  createdAt?: unknown;
  // Campos enriquecidos para o card (contrato 1)
  clientName?: string;
  guests?: number;
  checkIn?: string;
  checkOut?: string;
  propertyTitle?: string;
}

/** Documento bruto de assistant_chat (sob tenants/{tid}/assistant_chat). */
export interface AssistantChatDoc {
  id?: string;
  role?: 'operator' | 'assistant';
  text?: string;
  createdAt?: unknown;
}

/** Item do feed: chamado (card) OU mensagem de chat. */
export type FeedItem =
  | {
      kind: 'alert';
      id: string;
      status: string;
      createdAt: string; // ISO
      clientName?: string;
      phone: string;
      guests?: number;
      checkIn?: string;
      checkOut?: string;
      propertyTitle?: string;
      summary: string;
      deepLink: string;
      ageMinutes: number;
    }
  | {
      kind: 'message';
      id: string;
      role: 'operator' | 'assistant';
      text: string;
      createdAt: string; // ISO
    };

/**
 * Converte qualquer representação de data do Firestore (Timestamp do client SDK,
 * Timestamp do admin SDK, Date, número de ms ou string ISO) em milissegundos.
 * Retorna 0 quando não há data utilizável (mantém o item, ordena no início).
 */
export function toMillis(value: unknown): number {
  if (value == null) return 0;
  if (value instanceof Date) {
    const t = value.getTime();
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === 'string') {
    const t = Date.parse(value);
    return Number.isNaN(t) ? 0 : t;
  }
  if (typeof value === 'object') {
    const v = value as {
      toMillis?: () => number;
      toDate?: () => Date;
      seconds?: number;
      _seconds?: number;
      nanoseconds?: number;
      _nanoseconds?: number;
    };
    // Firestore Timestamp (client ou admin)
    if (typeof v.toMillis === 'function') {
      try {
        const t = v.toMillis();
        return Number.isFinite(t) ? t : 0;
      } catch {
        /* fall through */
      }
    }
    if (typeof v.toDate === 'function') {
      try {
        const t = v.toDate().getTime();
        return Number.isNaN(t) ? 0 : t;
      } catch {
        /* fall through */
      }
    }
    // Timestamp serializado: { seconds | _seconds, nanoseconds | _nanoseconds }
    const seconds = v.seconds ?? v._seconds;
    if (typeof seconds === 'number') {
      const nanos = v.nanoseconds ?? v._nanoseconds ?? 0;
      return seconds * 1000 + Math.floor(nanos / 1e6);
    }
  }
  return 0;
}

/** ms → ISO string (string vazia se não houver data). */
export function toIso(value: unknown): string {
  const ms = toMillis(value);
  return ms > 0 ? new Date(ms).toISOString() : '';
}

/** Idade em minutos a partir de um createdAt; 0 quando indeterminado. */
export function ageMinutesFrom(value: unknown, nowMs: number = Date.now()): number {
  const ms = toMillis(value);
  if (ms <= 0) return 0;
  return Math.max(0, Math.round((nowMs - ms) / 60000));
}

/** Coage um valor a string não-vazia ou undefined (nunca fabrica dado). */
function strOrUndef(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/** Coage um valor a número finito ou undefined. */
function numOrUndef(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/** Mapeia um owner_alert para FeedItem (kind='alert'). */
export function alertToFeedItem(doc: OwnerAlertDoc, nowMs: number = Date.now()): FeedItem {
  return {
    kind: 'alert',
    id: doc.id || '',
    status: doc.status || 'sent',
    createdAt: toIso(doc.createdAt),
    clientName: strOrUndef(doc.clientName),
    phone: doc.clientPhone || '',
    guests: numOrUndef(doc.guests),
    checkIn: strOrUndef(doc.checkIn),
    checkOut: strOrUndef(doc.checkOut),
    propertyTitle: strOrUndef(doc.propertyTitle),
    summary: doc.summary || '',
    deepLink: doc.deepLink || '',
    ageMinutes: ageMinutesFrom(doc.createdAt, nowMs),
  };
}

/** Mapeia uma mensagem de assistant_chat para FeedItem (kind='message'). */
export function messageToFeedItem(doc: AssistantChatDoc): FeedItem {
  return {
    kind: 'message',
    id: doc.id || '',
    role: doc.role === 'operator' ? 'operator' : 'assistant',
    text: doc.text || '',
    createdAt: toIso(doc.createdAt),
  };
}

/** Coleção do chat livre operador↔IA. */
export const ASSISTANT_CHAT_COLLECTION = 'assistant_chat';
/** Coleção dos chamados (alertas do dono). */
export const OWNER_ALERTS_COLLECTION = 'owner_alerts';
