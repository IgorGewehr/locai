// lib/ai-agent/date-validator.ts
// Sistema inteligente de validação e confirmação de datas

import { logger } from '@/lib/utils/logger';
import { SOFIA_CONFIG, getDefaultCheckIn, getDefaultCheckOut } from '@/lib/config/sofia-config';

export interface DateValidationResult {
  isValid: boolean;
  needsConfirmation: boolean;
  originalDates: {
    checkIn: string;
    checkOut: string;
  };
  suggestedDates?: {
    checkIn: string;
    checkOut: string;
  };
  issues: string[];
  confirmationMessage?: string;
}

export interface DateRange {
  checkIn: string;
  checkOut: string;
  nights: number;
}

class DateValidator {
  /**
   * Validar e sugerir correções para datas
   */
  validateDates(
    checkIn: string | undefined,
    checkOut: string | undefined,
    autoCorrect: boolean = SOFIA_CONFIG.validation.AUTO_CORRECT_DATES
  ): DateValidationResult {
    const issues: string[] = [];
    const result: DateValidationResult = {
      isValid: true,
      needsConfirmation: false,
      originalDates: {
        checkIn: checkIn || '',
        checkOut: checkOut || ''
      },
      issues: []
    };

    // Se não tem datas, usar padrões
    if (!checkIn || !checkOut) {
      result.suggestedDates = {
        checkIn: checkIn || getDefaultCheckIn(),
        checkOut: checkOut || getDefaultCheckOut()
      };
      result.needsConfirmation = true;
      result.confirmationMessage = this.buildConfirmationMessage(
        result.originalDates,
        result.suggestedDates,
        'Datas não especificadas'
      );
      return result;
    }

    try {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Validar formato das datas
      if (isNaN(checkInDate.getTime())) {
        issues.push(`Data de check-in inválida: ${checkIn}`);
        result.isValid = false;
      }

      if (isNaN(checkOutDate.getTime())) {
        issues.push(`Data de check-out inválida: ${checkOut}`);
        result.isValid = false;
      }

      if (!result.isValid) {
        result.issues = issues;
        return result;
      }

      // Verificar se as datas estão no passado
      const isPastCheckIn = checkInDate < today;
      const isPastCheckOut = checkOutDate < today;

      if (isPastCheckIn || isPastCheckOut) {
        issues.push('Datas no passado detectadas');
        
        if (autoCorrect) {
          // Corrigir movendo para o próximo mês
          const correctedCheckIn = this.moveToNextMonth(checkInDate);
          const correctedCheckOut = this.moveToNextMonth(checkOutDate);
          
          result.suggestedDates = {
            checkIn: this.formatDate(correctedCheckIn),
            checkOut: this.formatDate(correctedCheckOut)
          };
          
          result.needsConfirmation = SOFIA_CONFIG.validation.CONFIRM_DATE_CORRECTIONS;
          result.confirmationMessage = this.buildConfirmationMessage(
            result.originalDates,
            result.suggestedDates,
            'Datas no passado'
          );
        } else {
          result.isValid = false;
        }
      }

      // Verificar se check-out é depois de check-in
      if (checkOutDate <= checkInDate) {
        issues.push('Check-out deve ser após check-in');
        
        if (autoCorrect) {
          const correctedCheckOut = new Date(checkInDate);
          correctedCheckOut.setDate(checkInDate.getDate() + SOFIA_CONFIG.dates.DEFAULT_STAY_DURATION_DAYS);
          
          result.suggestedDates = {
            checkIn: checkIn,
            checkOut: this.formatDate(correctedCheckOut)
          };
          
          result.needsConfirmation = SOFIA_CONFIG.validation.CONFIRM_DATE_CORRECTIONS;
          result.confirmationMessage = this.buildConfirmationMessage(
            result.originalDates,
            result.suggestedDates,
            'Check-out antes do check-in'
          );
        } else {
          result.isValid = false;
        }
      }

      // Verificar se está muito no futuro
      const maxFutureDate = new Date();
      maxFutureDate.setMonth(maxFutureDate.getMonth() + SOFIA_CONFIG.dates.MAX_FUTURE_BOOKING_MONTHS);
      
      if (checkInDate > maxFutureDate) {
        issues.push(`Reservas podem ser feitas até ${SOFIA_CONFIG.dates.MAX_FUTURE_BOOKING_MONTHS} meses no futuro`);
        
        if (autoCorrect) {
          result.suggestedDates = {
            checkIn: getDefaultCheckIn(),
            checkOut: getDefaultCheckOut()
          };
          
          result.needsConfirmation = true;
          result.confirmationMessage = this.buildConfirmationMessage(
            result.originalDates,
            result.suggestedDates,
            'Data muito distante'
          );
        } else {
          result.isValid = false;
        }
      }

      // Verificar duração da estadia
      const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (nights < 1) {
        issues.push('Mínimo de 1 diária');
        result.isValid = false;
      } else if (nights > 30) {
        issues.push('Estadias acima de 30 dias precisam de aprovação especial');
        result.needsConfirmation = true;
      }

      result.issues = issues;

      // Log da validação
      if (issues.length > 0) {
        logger.info('📅 [DateValidator] Problemas encontrados nas datas', {
          originalCheckIn: checkIn,
          originalCheckOut: checkOut,
          issues,
          suggestedCheckIn: result.suggestedDates?.checkIn,
          suggestedCheckOut: result.suggestedDates?.checkOut
        });
      }

    } catch (error) {
      logger.error('❌ [DateValidator] Erro ao validar datas', {
        error: error instanceof Error ? error.message : 'Unknown error',
        checkIn,
        checkOut
      });
      
      result.isValid = false;
      result.issues = ['Erro ao processar datas'];
    }

    return result;
  }

  /**
   * Construir mensagem de confirmação amigável
   */
  private buildConfirmationMessage(
    original: { checkIn: string; checkOut: string },
    suggested: { checkIn: string; checkOut: string },
    reason: string
  ): string {
    const formatDateBR = (dateStr: string): string => {
      if (!dateStr) return 'não informada';
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR');
    };

    const messages: Record<string, string> = {
      'Datas no passado': `Notei que as datas estão no passado. Você quis dizer:\n📅 Check-in: ${formatDateBR(suggested.checkIn)}\n📅 Check-out: ${formatDateBR(suggested.checkOut)}?`,
      'Check-out antes do check-in': `A data de saída precisa ser depois da entrada. Sugiro:\n📅 Check-in: ${formatDateBR(suggested.checkIn)}\n📅 Check-out: ${formatDateBR(suggested.checkOut)}\nEstá correto?`,
      'Data muito distante': `As datas estão muito no futuro. Que tal:\n📅 Check-in: ${formatDateBR(suggested.checkIn)}\n📅 Check-out: ${formatDateBR(suggested.checkOut)}?`,
      'Datas não especificadas': `Para calcular o valor, preciso das datas. Posso usar:\n📅 Check-in: ${formatDateBR(suggested.checkIn)}\n📅 Check-out: ${formatDateBR(suggested.checkOut)}?`
    };

    return messages[reason] || `Verifique as datas:\n📅 Check-in: ${formatDateBR(suggested.checkIn)}\n📅 Check-out: ${formatDateBR(suggested.checkOut)}`;
  }

  /**
   * Mover data para o próximo mês mantendo o dia
   */
  private moveToNextMonth(date: Date): Date {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    nextMonth.setDate(date.getDate());
    
    // Se o dia não existe no próximo mês (ex: 31 de fevereiro), usar último dia
    if (nextMonth.getDate() !== date.getDate()) {
      nextMonth.setDate(0); // Último dia do mês anterior
    }
    
    return nextMonth;
  }

  /**
   * Formatar data para YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Calcular número de noites
   */
  calculateNights(checkIn: string, checkOut: string): number {
    try {
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      return Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return 0;
    }
  }

  /**
   * Verificar se é fim de semana
   */
  isWeekend(dateStr: string): boolean {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 || day === 6; // Domingo ou Sábado
  }

  /**
   * Verificar se é feriado brasileiro
   */
  isBrazilianHoliday(dateStr: string): boolean {
    // Lista simplificada de feriados fixos
    const holidays = [
      '01-01', // Ano Novo
      '04-21', // Tiradentes
      '05-01', // Dia do Trabalho
      '09-07', // Independência
      '10-12', // Nossa Senhora
      '11-02', // Finados
      '11-15', // Proclamação da República
      '12-25', // Natal
    ];

    const date = new Date(dateStr);
    const monthDay = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    return holidays.includes(monthDay);
  }

  /**
   * Sugerir datas alternativas baseadas em disponibilidade
   */
  suggestAlternativeDates(
    unavailableDates: string[],
    desiredCheckIn: string,
    desiredNights: number
  ): DateRange[] {
    const suggestions: DateRange[] = [];
    const baseDate = new Date(desiredCheckIn);
    
    // Tentar 5 alternativas
    for (let offset = 1; offset <= 5; offset++) {
      // Antes da data desejada
      const beforeDate = new Date(baseDate);
      beforeDate.setDate(baseDate.getDate() - (offset * 7)); // Semana antes
      
      const beforeCheckOut = new Date(beforeDate);
      beforeCheckOut.setDate(beforeDate.getDate() + desiredNights);
      
      if (!this.hasConflict(beforeDate, beforeCheckOut, unavailableDates)) {
        suggestions.push({
          checkIn: this.formatDate(beforeDate),
          checkOut: this.formatDate(beforeCheckOut),
          nights: desiredNights
        });
      }
      
      // Depois da data desejada
      const afterDate = new Date(baseDate);
      afterDate.setDate(baseDate.getDate() + (offset * 7)); // Semana depois
      
      const afterCheckOut = new Date(afterDate);
      afterCheckOut.setDate(afterDate.getDate() + desiredNights);
      
      if (!this.hasConflict(afterDate, afterCheckOut, unavailableDates)) {
        suggestions.push({
          checkIn: this.formatDate(afterDate),
          checkOut: this.formatDate(afterCheckOut),
          nights: desiredNights
        });
      }
    }
    
    return suggestions.slice(0, 3); // Retornar até 3 sugestões
  }

  /**
   * Verificar conflito com datas indisponíveis
   */
  private hasConflict(checkIn: Date, checkOut: Date, unavailableDates: string[]): boolean {
    for (const unavailable of unavailableDates) {
      const unavailableDate = new Date(unavailable);
      if (unavailableDate >= checkIn && unavailableDate < checkOut) {
        return true;
      }
    }
    return false;
  }
}

// Singleton instance
export const dateValidator = new DateValidator();