import { format, addHours } from 'date-fns';
import { AvailabilityCalendarDay } from '@/lib/types/availability';
import { Property } from '@/lib/types/property';

/**
 * Export calendar to iCal format (.ics)
 */
export function exportToICal(
  property: Property,
  calendarDays: AvailabilityCalendarDay[],
  propertyName: string
): void {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Locai//Property Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${propertyName} - Disponibilidade`,
    'X-WR-TIMEZONE:America/Sao_Paulo',
    'X-WR-CALDESC:Calendário de disponibilidade da propriedade',
  ];

  // Add events for blocked and reserved dates
  const blockedAndReservedDays = calendarDays.filter(
    day => day.status === 'blocked' || day.status === 'reserved'
  );

  for (const day of blockedAndReservedDays) {
    const startDate = day.date;
    const endDate = addHours(startDate, 23);

    const dtStart = format(startDate, "yyyyMMdd'T'HHmmss");
    const dtEnd = format(endDate, "yyyyMMdd'T'HHmmss");
    const uid = `${property.id}-${format(startDate, 'yyyyMMdd')}@locai.com`;

    const summary =
      day.status === 'reserved'
        ? `Reservado${day.reservationId ? ` - ${day.reservationId.slice(-8)}` : ''}`
        : `Bloqueado${day.reason ? ` - ${day.reason}` : ''}`;

    const description = day.reason || 'Período indisponível';

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${format(new Date(), "yyyyMMdd'T'HHmmss'Z'")}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `STATUS:${day.status === 'reserved' ? 'CONFIRMED' : 'TENTATIVE'}`,
      `TRANSP:OPAQUE`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');

  // Create blob and download
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${propertyName.replace(/\s+/g, '_')}_calendar.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export calendar to CSV format
 */
export function exportToCSV(
  property: Property,
  calendarDays: AvailabilityCalendarDay[],
  propertyName: string
): void {
  const headers = [
    'Data',
    'Dia da Semana',
    'Status',
    'Preço',
    'Fim de Semana',
    'Feriado',
    'Reserva ID',
    'Motivo/Observação',
  ];

  const rows = calendarDays.map(day => {
    const dateStr = format(day.date, 'dd/MM/yyyy');
    const dayOfWeek = format(day.date, 'EEEE', { locale: require('date-fns/locale/pt-BR') });

    const statusLabels: Record<string, string> = {
      available: 'Disponível',
      reserved: 'Reservado',
      blocked: 'Bloqueado',
      maintenance: 'Manutenção',
      pending: 'Pendente',
    };

    const status = statusLabels[day.status] || day.status;

    // Get price for the day
    const dateKey = format(day.date, 'yyyy-MM-dd');
    const price = property.customPricing?.[dateKey] || property.basePrice;

    return [
      dateStr,
      dayOfWeek,
      status,
      `R$ ${price}`,
      day.isWeekend ? 'Sim' : 'Não',
      day.isHoliday ? 'Sim' : 'Não',
      day.reservationId || '',
      day.reason || '',
    ];
  });

  // Create CSV content
  const csvContent = [
    headers.join(','),
    ...rows.map(row =>
      row.map(cell => {
        // Escape commas and quotes in cell values
        const cellStr = cell.toString();
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(',')
    ),
  ].join('\n');

  // Add BOM for proper Excel UTF-8 encoding
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${propertyName.replace(/\s+/g, '_')}_calendar.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export calendar to JSON format (for API integration)
 */
export function exportToJSON(
  property: Property,
  calendarDays: AvailabilityCalendarDay[],
  propertyName: string
): void {
  const data = {
    property: {
      id: property.id,
      name: propertyName,
      basePrice: property.basePrice,
    },
    exportDate: new Date().toISOString(),
    calendar: calendarDays.map(day => ({
      date: format(day.date, 'yyyy-MM-dd'),
      status: day.status,
      price: property.customPricing?.[format(day.date, 'yyyy-MM-dd')] || property.basePrice,
      isWeekend: day.isWeekend,
      isHoliday: day.isHoliday,
      reservationId: day.reservationId || null,
      reason: day.reason || null,
    })),
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${propertyName.replace(/\s+/g, '_')}_calendar.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generate shareable link for calendar (simplified)
 */
export function generateShareableLink(propertyId: string, tenantId: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return `${baseUrl}/calendar/share/${tenantId}/${propertyId}`;
}

/**
 * Copy calendar data to clipboard in text format
 */
export async function copyToClipboard(
  property: Property,
  calendarDays: AvailabilityCalendarDay[],
  propertyName: string
): Promise<void> {
  const blockedDates = calendarDays
    .filter(day => day.status === 'blocked' || day.status === 'reserved')
    .map(day => format(day.date, 'dd/MM/yyyy'))
    .join(', ');

  const text = `
${propertyName} - Calendário de Disponibilidade

Período: ${format(calendarDays[0].date, 'dd/MM/yyyy')} a ${format(
    calendarDays[calendarDays.length - 1].date,
    'dd/MM/yyyy'
  )}

Total de dias: ${calendarDays.length}
Dias disponíveis: ${calendarDays.filter(d => d.status === 'available').length}
Dias reservados: ${calendarDays.filter(d => d.status === 'reserved').length}
Dias bloqueados: ${calendarDays.filter(d => d.status === 'blocked').length}

Datas indisponíveis: ${blockedDates || 'Nenhuma'}

Preço base: R$ ${property.basePrice}
  `.trim();

  await navigator.clipboard.writeText(text);
}

/**
 * Print calendar (opens print dialog with formatted view)
 */
export function printCalendar(
  property: Property,
  calendarDays: AvailabilityCalendarDay[],
  propertyName: string
): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Por favor, permita pop-ups para imprimir o calendário');
    return;
  }

  // Group days by month
  const monthsMap = new Map<string, AvailabilityCalendarDay[]>();
  for (const day of calendarDays) {
    const monthKey = format(day.date, 'MMMM yyyy', { locale: require('date-fns/locale/pt-BR') });
    if (!monthsMap.has(monthKey)) {
      monthsMap.set(monthKey, []);
    }
    monthsMap.get(monthKey)!.push(day);
  }

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${propertyName} - Calendário</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          max-width: 1000px;
          margin: 0 auto;
        }
        h1 {
          text-align: center;
          color: #333;
          margin-bottom: 30px;
        }
        .month {
          margin-bottom: 40px;
          page-break-inside: avoid;
        }
        .month-title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 10px;
          color: #555;
          text-transform: capitalize;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: center;
        }
        th {
          background-color: #f5f5f5;
          font-weight: bold;
        }
        .available { background-color: #e8f5e9; }
        .reserved { background-color: #ffebee; }
        .blocked { background-color: #f5f5f5; }
        .weekend { font-weight: bold; }
        .legend {
          margin-top: 30px;
          padding: 15px;
          background: #f9f9f9;
          border-radius: 4px;
        }
        .legend-item {
          display: inline-block;
          margin-right: 20px;
          margin-bottom: 10px;
        }
        .legend-color {
          display: inline-block;
          width: 20px;
          height: 20px;
          margin-right: 5px;
          vertical-align: middle;
        }
        @media print {
          .no-print { display: none; }
        }
      </style>
    </head>
    <body>
      <h1>${propertyName} - Calendário de Disponibilidade</h1>

      ${Array.from(monthsMap.entries())
        .map(
          ([month, days]) => `
        <div class="month">
          <div class="month-title">${month}</div>
          <table>
            <thead>
              <tr>
                <th>Dom</th>
                <th>Seg</th>
                <th>Ter</th>
                <th>Qua</th>
                <th>Qui</th>
                <th>Sex</th>
                <th>Sáb</th>
              </tr>
            </thead>
            <tbody>
              ${generateMonthRows(days)}
            </tbody>
          </table>
        </div>
      `
        )
        .join('')}

      <div class="legend">
        <strong>Legenda:</strong><br>
        <div class="legend-item">
          <span class="legend-color available"></span>
          Disponível
        </div>
        <div class="legend-item">
          <span class="legend-color reserved"></span>
          Reservado
        </div>
        <div class="legend-item">
          <span class="legend-color blocked"></span>
          Bloqueado
        </div>
      </div>

      <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 20px; font-size: 16px;">
        Imprimir
      </button>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
}

function generateMonthRows(days: AvailabilityCalendarDay[]): string {
  const weeks: AvailabilityCalendarDay[][] = [];
  let currentWeek: AvailabilityCalendarDay[] = [];

  // Fill first week with empty cells if needed
  const firstDay = days[0];
  const dayOfWeek = firstDay.date.getDay();
  for (let i = 0; i < dayOfWeek; i++) {
    currentWeek.push(null as any);
  }

  // Add all days
  for (const day of days) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  // Fill last week if needed
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null as any);
    }
    weeks.push(currentWeek);
  }

  return weeks
    .map(
      week =>
        `<tr>${week
          .map(day => {
            if (!day) return '<td></td>';
            const statusClass = day.status;
            const weekendClass = day.isWeekend ? 'weekend' : '';
            return `<td class="${statusClass} ${weekendClass}">${format(day.date, 'd')}</td>`;
          })
          .join('')}</tr>`
    )
    .join('');
}
