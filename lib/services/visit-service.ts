// lib/services/visit-service.ts
import { FirestoreService } from '@/lib/firebase/firestore';
import { 
  VisitAppointment, 
  VisitStatus, 
  VisitResult,
  TenantVisitSchedule,
  WorkingHours,
  DaySchedule,
  AvailableTimeSlot,
  VisitAvailabilityFilters,
  TimePreference
} from '@/lib/types/visit-appointment';
import { 
  collection, 
  query, 
  where, 
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  writeBatch,
  onSnapshot
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { addDays, format, isAfter, isBefore, isSameDay, setHours, setMinutes, startOfDay, endOfDay } from 'date-fns';
import { logger } from '@/lib/utils/logger';

class VisitService {
  private visitService: FirestoreService<VisitAppointment>;
  private scheduleService: FirestoreService<TenantVisitSchedule>;

  constructor() {
    this.visitService = new FirestoreService<VisitAppointment>('visit_appointments');
    this.scheduleService = new FirestoreService<TenantVisitSchedule>('tenant_visit_schedules');
  }

  // =============== VISIT APPOINTMENT MANAGEMENT ===============

  async createVisit(data: Omit<VisitAppointment, 'id' | 'createdAt' | 'updatedAt'>): Promise<VisitAppointment> {
    try {
      logger.info('Creating new visit appointment', { propertyId: data.propertyId, clientId: data.clientId });
      
      // Check for conflicts
      const hasConflict = await this.checkTimeConflict(
        data.tenantId,
        data.scheduledDate,
        data.scheduledTime,
        data.duration || 60
      );

      if (hasConflict) {
        throw new Error('Já existe uma visita agendada neste horário');
      }

      const visit: Omit<VisitAppointment, 'id'> = {
        ...data,
        status: data.status || VisitStatus.SCHEDULED,
        duration: data.duration || 60,
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmedByClient: data.confirmedByClient || false,
        confirmedByAgent: data.confirmedByAgent || false,
        reminderSent: false
      };

      const docRef = await addDoc(collection(db, 'visit_appointments'), {
        ...visit,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      const createdVisit = { id: docRef.id, ...visit } as VisitAppointment;
      
      logger.info('Visit appointment created successfully', { visitId: docRef.id });
      
      return createdVisit;
    } catch (error) {
      logger.error('Error creating visit appointment', { error });
      throw error;
    }
  }

  async updateVisit(visitId: string, updates: Partial<VisitAppointment>): Promise<VisitAppointment> {
    try {
      const visit = await this.visitService.getById(visitId);
      if (!visit) throw new Error('Visita não encontrada');

      await updateDoc(doc(db, 'visit_appointments', visitId), {
        ...updates,
        updatedAt: serverTimestamp()
      });

      logger.info('Visit appointment updated', { visitId, updates });

      return { ...visit, ...updates } as VisitAppointment;
    } catch (error) {
      logger.error('Error updating visit appointment', { visitId, error });
      throw error;
    }
  }

  async getVisitById(id: string): Promise<VisitAppointment | null> {
    return this.visitService.getById(id);
  }

  async getVisitsByProperty(propertyId: string, tenantId: string): Promise<VisitAppointment[]> {
    const q = query(
      collection(db, 'visit_appointments'),
      where('tenantId', '==', tenantId),
      where('propertyId', '==', propertyId),
      where('status', 'in', [VisitStatus.SCHEDULED, VisitStatus.CONFIRMED]),
      orderBy('scheduledDate', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as VisitAppointment));
  }

  async getVisitsByClient(clientId: string, tenantId: string): Promise<VisitAppointment[]> {
    const q = query(
      collection(db, 'visit_appointments'),
      where('tenantId', '==', tenantId),
      where('clientId', '==', clientId),
      orderBy('scheduledDate', 'desc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as VisitAppointment));
  }

  async getUpcomingVisits(tenantId: string, days: number = 7): Promise<VisitAppointment[]> {
    const today = startOfDay(new Date());
    const endDate = endOfDay(addDays(today, days));
    
    const q = query(
      collection(db, 'visit_appointments'),
      where('tenantId', '==', tenantId),
      where('scheduledDate', '>=', today),
      where('scheduledDate', '<=', endDate),
      where('status', 'in', [VisitStatus.SCHEDULED, VisitStatus.CONFIRMED]),
      orderBy('scheduledDate', 'asc')
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as VisitAppointment));
  }

  async completeVisit(visitId: string, result: VisitResult): Promise<void> {
    await this.updateVisit(visitId, {
      status: VisitStatus.COMPLETED,
      visitResult: result
    });
  }

  async cancelVisit(visitId: string, cancelledBy: 'client' | 'agent', reason?: string): Promise<void> {
    const status = cancelledBy === 'client' ? 
      VisitStatus.CANCELLED_BY_CLIENT : 
      VisitStatus.CANCELLED_BY_AGENT;
    
    await this.updateVisit(visitId, {
      status,
      notes: reason ? `Cancelamento: ${reason}` : undefined
    });
  }

  // =============== AVAILABILITY MANAGEMENT ===============

  async getTenantSchedule(tenantId: string): Promise<TenantVisitSchedule | null> {
    const schedules = await this.scheduleService.getWhere('tenantId', '==', tenantId);
    if (schedules.length === 0) {
      // Return default schedule if none exists
      return this.getDefaultSchedule(tenantId);
    }
    return schedules[0];
  }

  private getDefaultSchedule(tenantId: string): TenantVisitSchedule {
    const defaultWorkingHours: WorkingHours = {
      monday: { isWorkingDay: true, startTime: '09:00', endTime: '18:00' },
      tuesday: { isWorkingDay: true, startTime: '09:00', endTime: '18:00' },
      wednesday: { isWorkingDay: true, startTime: '09:00', endTime: '18:00' },
      thursday: { isWorkingDay: true, startTime: '09:00', endTime: '18:00' },
      friday: { isWorkingDay: true, startTime: '09:00', endTime: '18:00' },
      saturday: { isWorkingDay: true, startTime: '09:00', endTime: '17:00' },
      sunday: { isWorkingDay: false, startTime: '', endTime: '' }
    };

    return {
      id: 'default',
      tenantId,
      workingHours: defaultWorkingHours,
      blockedDates: [],
      holidays: [],
      visitDurationDefault: 60,
      visitBufferTime: 15,
      maxVisitsPerDay: 10,
      availableAgents: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async checkAvailability(
    tenantId: string, 
    filters: VisitAvailabilityFilters
  ): Promise<AvailableTimeSlot[]> {
    try {
      logger.info('Checking visit availability', { tenantId, filters });
      
      // Get tenant schedule
      const schedule = await this.getTenantSchedule(tenantId);
      if (!schedule) throw new Error('Schedule not found');

      // Get existing visits in date range
      const existingVisits = await this.getVisitsInRange(
        tenantId,
        filters.startDate,
        filters.endDate
      );

      // Generate available slots
      const availableSlots: AvailableTimeSlot[] = [];
      const currentDate = new Date(filters.startDate);
      const now = new Date();

      while (currentDate <= filters.endDate) {
        const dayName = this.getDayName(currentDate.getDay());
        const daySchedule = schedule.workingHours[dayName as keyof WorkingHours];

        if (daySchedule.isWorkingDay && !this.isBlockedDate(currentDate, schedule)) {
          // Generate time slots for this day
          const daySlots = this.generateDaySlots(
            currentDate,
            daySchedule,
            schedule.visitDurationDefault,
            schedule.visitBufferTime,
            existingVisits,
            filters.preferredTimes
          );

          // Filter future slots only
          const futureSlots = daySlots.filter(slot => {
            const slotDateTime = this.getSlotDateTime(slot.date, slot.time);
            return isAfter(slotDateTime, now);
          });

          availableSlots.push(...futureSlots);
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      logger.info('Found available slots', { count: availableSlots.length });
      
      return availableSlots;
    } catch (error) {
      logger.error('Error checking availability', { error });
      throw error;
    }
  }

  private async getVisitsInRange(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<VisitAppointment[]> {
    const q = query(
      collection(db, 'visit_appointments'),
      where('tenantId', '==', tenantId),
      where('scheduledDate', '>=', startDate),
      where('scheduledDate', '<=', endDate),
      where('status', 'in', [VisitStatus.SCHEDULED, VisitStatus.CONFIRMED])
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as VisitAppointment));
  }

  private generateDaySlots(
    date: Date,
    daySchedule: DaySchedule,
    duration: number,
    bufferTime: number,
    existingVisits: VisitAppointment[],
    preferredTimes?: string[]
  ): AvailableTimeSlot[] {
    const slots: AvailableTimeSlot[] = [];
    const [startHour, startMin] = daySchedule.startTime.split(':').map(Number);
    const [endHour, endMin] = daySchedule.endTime.split(':').map(Number);
    
    let currentTime = setMinutes(setHours(date, startHour), startMin);
    const endTime = setMinutes(setHours(date, endHour), endMin);

    while (currentTime < endTime) {
      const timeStr = format(currentTime, 'HH:mm');
      
      // Check if time matches preference
      if (!preferredTimes || this.matchesTimePreference(timeStr, preferredTimes)) {
        // Check if slot is available
        const isAvailable = !this.hasConflict(
          date,
          timeStr,
          duration,
          existingVisits
        );

        if (isAvailable) {
          slots.push({
            date,
            time: timeStr,
            duration
          });
        }
      }

      // Move to next slot
      currentTime = new Date(currentTime.getTime() + (duration + bufferTime) * 60000);
    }

    return slots;
  }

  private hasConflict(
    date: Date,
    time: string,
    duration: number,
    existingVisits: VisitAppointment[]
  ): boolean {
    const slotStart = this.getSlotDateTime(date, time);
    const slotEnd = new Date(slotStart.getTime() + duration * 60000);

    return existingVisits.some(visit => {
      if (!isSameDay(visit.scheduledDate, date)) return false;
      
      const visitStart = this.getSlotDateTime(visit.scheduledDate, visit.scheduledTime);
      const visitEnd = new Date(visitStart.getTime() + (visit.duration || 60) * 60000);
      
      // Check if times overlap
      return (slotStart < visitEnd && slotEnd > visitStart);
    });
  }

  private async checkTimeConflict(
    tenantId: string,
    date: Date,
    time: string,
    duration: number
  ): Promise<boolean> {
    const dayVisits = await this.getVisitsInRange(tenantId, date, date);
    return this.hasConflict(date, time, duration, dayVisits);
  }

  private getSlotDateTime(date: Date, time: string): Date {
    const [hour, minute] = time.split(':').map(Number);
    return setMinutes(setHours(new Date(date), hour), minute);
  }

  private matchesTimePreference(time: string, preferences: string[]): boolean {
    const hour = parseInt(time.split(':')[0]);
    
    return preferences.some(pref => {
      switch (pref) {
        case TimePreference.MORNING:
          return hour >= 8 && hour < 12;
        case TimePreference.AFTERNOON:
          return hour >= 12 && hour < 18;
        case TimePreference.EVENING:
          return hour >= 18 && hour < 21;
        default:
          return true;
      }
    });
  }

  private isBlockedDate(date: Date, schedule: TenantVisitSchedule): boolean {
    return schedule.blockedDates.some(blocked => isSameDay(blocked, date)) ||
           schedule.holidays.some(holiday => isSameDay(holiday, date));
  }

  private getDayName(dayIndex: number): string {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[dayIndex];
  }

  // =============== INTEGRATION WITH RESERVATIONS ===============

  async convertVisitToReservation(visitId: string, reservationId: string): Promise<void> {
    const visit = await this.getVisitById(visitId);
    if (!visit) throw new Error('Visita não encontrada');

    await this.updateVisit(visitId, {
      status: VisitStatus.COMPLETED,
      visitResult: {
        ...visit.visitResult,
        convertedToReservation: true,
        reservationId,
        completedAt: new Date()
      } as VisitResult
    });
  }
}

// Export singleton instance
export const visitService = new VisitService();