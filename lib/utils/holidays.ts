// lib/utils/holidays.ts
import { format, isSameDay } from 'date-fns';

// Brazilian holidays for 2024-2026
export const BRAZILIAN_HOLIDAYS = [
  // 2024
  { date: '2024-01-01', name: 'Confraternização Universal' },
  { date: '2024-02-12', name: 'Carnaval' },
  { date: '2024-02-13', name: 'Carnaval' },
  { date: '2024-03-29', name: 'Sexta-feira Santa' },
  { date: '2024-04-21', name: 'Tiradentes' },
  { date: '2024-05-01', name: 'Dia do Trabalhador' },
  { date: '2024-09-07', name: 'Independência do Brasil' },
  { date: '2024-10-12', name: 'Nossa Senhora Aparecida' },
  { date: '2024-11-02', name: 'Finados' },
  { date: '2024-11-15', name: 'Proclamação da República' },
  { date: '2024-12-25', name: 'Natal' },

  // 2025
  { date: '2025-01-01', name: 'Confraternização Universal' },
  { date: '2025-03-03', name: 'Carnaval' },
  { date: '2025-03-04', name: 'Carnaval' },
  { date: '2025-04-18', name: 'Sexta-feira Santa' },
  { date: '2025-04-21', name: 'Tiradentes' },
  { date: '2025-05-01', name: 'Dia do Trabalhador' },
  { date: '2025-09-07', name: 'Independência do Brasil' },
  { date: '2025-10-12', name: 'Nossa Senhora Aparecida' },
  { date: '2025-11-02', name: 'Finados' },
  { date: '2025-11-15', name: 'Proclamação da República' },
  { date: '2025-12-25', name: 'Natal' },

  // 2026
  { date: '2026-01-01', name: 'Confraternização Universal' },
  { date: '2026-02-16', name: 'Carnaval' },
  { date: '2026-02-17', name: 'Carnaval' },
  { date: '2026-04-03', name: 'Sexta-feira Santa' },
  { date: '2026-04-21', name: 'Tiradentes' },
  { date: '2026-05-01', name: 'Dia do Trabalhador' },
  { date: '2026-09-07', name: 'Independência do Brasil' },
  { date: '2026-10-12', name: 'Nossa Senhora Aparecida' },
  { date: '2026-11-02', name: 'Finados' },
  { date: '2026-11-15', name: 'Proclamação da República' },
  { date: '2026-12-25', name: 'Natal' },
];

export function isHoliday(date: Date): boolean {
  const dateString = format(date, 'yyyy-MM-dd');
  return BRAZILIAN_HOLIDAYS.some(holiday => holiday.date === dateString);
}

export function getHolidayName(date: Date): string | null {
  const dateString = format(date, 'yyyy-MM-dd');
  const holiday = BRAZILIAN_HOLIDAYS.find(h => h.date === dateString);
  return holiday ? holiday.name : null;
}

export function getHolidaysInRange(startDate: Date, endDate: Date) {
  return BRAZILIAN_HOLIDAYS.filter(holiday => {
    const holidayDate = new Date(holiday.date);
    return holidayDate >= startDate && holidayDate <= endDate;
  });
}