import { format, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Safely formats a date value, handling Firestore timestamps and invalid dates
 * @param date - The date value to format (Date, Firestore timestamp, string, or null/undefined)
 * @param formatString - The format string for date-fns format function
 * @param fallback - The fallback value to return if date is invalid (default: 'N/A')
 * @returns Formatted date string or fallback value
 */
export const safeFormatDate = (
  date: any, 
  formatString: string, 
  fallback: string = 'N/A'
): string => {
  if (!date) return fallback;
  
  let dateObj: Date;
  
  try {
    // Handle Firestore timestamp
    if (date.toDate && typeof date.toDate === 'function') {
      dateObj = date.toDate();
    } 
    // Handle regular Date object or string/number
    else {
      dateObj = new Date(date);
    }
    
    // Check if date is valid
    if (!isValid(dateObj)) {
      console.warn('Invalid date provided to safeFormatDate:', date);
      return fallback;
    }
    
    return format(dateObj, formatString, { locale: ptBR });
  } catch (error) {
    console.error('Date formatting error:', error, 'for date:', date);
    return fallback;
  }
};

/**
 * Safely converts various date formats to a JavaScript Date object
 * @param date - The date value to convert
 * @returns Date object or null if invalid
 */
export const safeParseDate = (date: any): Date | null => {
  if (!date) return null;
  
  try {
    // Handle Firestore timestamp
    if (date.toDate && typeof date.toDate === 'function') {
      return date.toDate();
    }
    
    // Handle regular Date object or string/number
    const dateObj = new Date(date);
    
    // Check if date is valid
    if (!isValid(dateObj)) {
      return null;
    }
    
    return dateObj;
  } catch (error) {
    console.error('Date parsing error:', error, 'for date:', date);
    return null;
  }
};

/**
 * Common date format patterns
 */
export const DateFormats = {
  SHORT: 'dd/MM/yyyy',
  LONG: 'dd/MM/yyyy HH:mm',
  MONTH_YEAR: 'MMM yyyy',
  TIME: 'HH:mm',
  FULL: 'dd/MM/yyyy \'às\' HH:mm',
  ISO: 'yyyy-MM-dd',
  FRIENDLY: 'dd \'de\' MMMM \'de\' yyyy'
} as const;