import { Timestamp } from 'firebase/firestore';
import { format as dateFnsFormat } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Converte qualquer tipo de data para Date
 * Aceita: Date, Timestamp do Firestore, string ISO, número (unix timestamp)
 */
export function toDate(date: Date | Timestamp | string | number | null | undefined): Date | null {
  if (!date) return null;

  try {
    // Se já é Date
    if (date instanceof Date) {
      return isNaN(date.getTime()) ? null : date;
    }

    // Se é Timestamp do Firestore
    if (date && typeof date === 'object' && 'toDate' in date) {
      return (date as Timestamp).toDate();
    }

    // Se é string ISO ou número
    if (typeof date === 'string' || typeof date === 'number') {
      const dateObj = new Date(date);
      return isNaN(dateObj.getTime()) ? null : dateObj;
    }

    return null;
  } catch (error) {
    console.error('Error converting to Date:', error, date);
    return null;
  }
}

/**
 * Formata data de forma segura
 * Retorna fallback se data for inválida
 */
export function safeFormat(
  date: Date | Timestamp | string | number | null | undefined,
  formatStr: string,
  options?: { locale?: Locale; fallback?: string }
): string {
  const { locale = ptBR, fallback = '--' } = options || {};

  try {
    const dateObj = toDate(date);
    if (!dateObj) return fallback;

    return dateFnsFormat(dateObj, formatStr, { locale });
  } catch (error) {
    console.error('Error formatting date:', error, date);
    return fallback;
  }
}

/**
 * Formata timestamp de forma inteligente (usado em listas de conversas)
 */
export function formatTimestamp(
  date: Date | Timestamp | string | number | null | undefined
): string {
  try {
    const dateObj = toDate(date);
    if (!dateObj) return '--:--';

    const now = new Date();
    const diffInHours = (now.getTime() - dateObj.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return dateFnsFormat(dateObj, 'HH:mm');
    } else if (diffInHours < 168) {
      return dateFnsFormat(dateObj, 'EEE', { locale: ptBR });
    } else {
      return dateFnsFormat(dateObj, 'dd/MM/yy');
    }
  } catch (error) {
    console.error('Error formatting timestamp:', error, date);
    return '--:--';
  }
}
