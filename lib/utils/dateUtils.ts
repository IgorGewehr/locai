// lib/utils/dateUtils.ts
import { format, parseISO, isValid, differenceInDays, addDays, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function parseDateKey(dateKey: string): Date {
  return parseISO(dateKey)
}

export function formatDisplayDate(date: Date): string {
  return format(date, 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDisplayDateTime(date: Date): string {
  return format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR })
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return formatDateKey(date1) === formatDateKey(date2)
}

export function isWeekend(date: Date): boolean {
  const day = date.getDay()
  return day === 0 || day === 6
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

export function getDaysBetween(start: Date, end: Date): Date[] {
  const days: Date[] = []
  let current = startOfDay(start)
  const endDay = startOfDay(end)
  
  while (current <= endDay) {
    days.push(new Date(current))
    current = addDays(current, 1)
  }
  
  return days
}

export function getDateRange(start: Date, end: Date): { start: Date; end: Date; nights: number } {
  const startDay = startOfDay(start)
  const endDay = startOfDay(end)
  const nights = differenceInDays(endDay, startDay)
  
  return {
    start: startDay,
    end: endDay,
    nights: Math.max(0, nights)
  }
}

export function addBusinessDays(date: Date, days: number): Date {
  let current = new Date(date)
  let businessDays = 0
  
  while (businessDays < days) {
    current = addDays(current, 1)
    if (!isWeekend(current)) {
      businessDays++
    }
  }
  
  return current
}

export function isValidDateRange(start: Date, end: Date): boolean {
  return isValid(start) && isValid(end) && start < end
}

export function getMonthName(date: Date): string {
  return format(date, 'MMMM', { locale: ptBR })
}

export function getYearMonth(date: Date): string {
  return format(date, 'yyyy-MM')
}

export function getNextMonth(date: Date): Date {
  const nextMonth = new Date(date)
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  return nextMonth
}

export function getPreviousMonth(date: Date): Date {
  const prevMonth = new Date(date)
  prevMonth.setMonth(prevMonth.getMonth() - 1)
  return prevMonth
}

export function getWeekdayName(date: Date): string {
  return format(date, 'EEEE', { locale: ptBR })
}

export function getShortWeekdayName(date: Date): string {
  return format(date, 'EEE', { locale: ptBR })
}

// Brazilian holidays (simplified)
export const BRAZILIAN_HOLIDAYS = {
  '2024-01-01': 'Confraternização Universal',
  '2024-02-12': 'Carnaval',
  '2024-02-13': 'Carnaval',
  '2024-03-29': 'Sexta-feira Santa',
  '2024-04-21': 'Tiradentes',
  '2024-05-01': 'Dia do Trabalhador',
  '2024-09-07': 'Independência do Brasil',
  '2024-10-12': 'Nossa Senhora Aparecida',
  '2024-11-02': 'Finados',
  '2024-11-15': 'Proclamação da República',
  '2024-12-25': 'Natal',
}

export function isHoliday(date: Date): boolean {
  const dateKey = formatDateKey(date)
  return dateKey in BRAZILIAN_HOLIDAYS
}

export function getHolidayName(date: Date): string | null {
  const dateKey = formatDateKey(date)
  return BRAZILIAN_HOLIDAYS[dateKey as keyof typeof BRAZILIAN_HOLIDAYS] || null
}