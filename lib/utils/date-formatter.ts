import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Safely formats a date value, handling Firestore timestamps and invalid dates
 * @param dateValue - Date, Firestore timestamp, or string
 * @param formatString - Date format string
 * @param fallback - Fallback text if date is invalid
 * @returns Formatted date string or fallback
 */
export function safeFormatDate(
  dateValue: any, 
  formatString: string = 'dd/MM/yyyy', 
  fallback: string = 'Data inválida'
): string {
  if (!dateValue) {
    return fallback;
  }

  try {
    // Handle Firestore timestamp
    let date: Date;
    if (dateValue?.toDate && typeof dateValue.toDate === 'function') {
      date = dateValue.toDate();
    } else if (dateValue instanceof Date) {
      date = dateValue;
    } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      date = new Date(dateValue);
    } else {
      return fallback;
    }

    // Check if date is valid
    if (!isValid(date) || isNaN(date.getTime())) {
      return fallback;
    }

    return format(date, formatString, { locale: ptBR });
  } catch (error) {
    console.warn('Date formatting error:', error, 'for value:', dateValue);
    return fallback;
  }
}

/**
 * Common date format presets
 */
export const DateFormats = {
  SHORT: 'dd/MM/yyyy',
  LONG: "dd 'de' MMMM 'de' yyyy",
  WITH_TIME: 'dd/MM/yyyy HH:mm',
  TIME_ONLY: 'HH:mm',
  MONTH_DAY: 'dd/MM',
  FULL_WITH_TIME: "dd/MM/yyyy 'às' HH:mm",
} as const;