import { TenantServiceFactory } from '@/lib/firebase/firestore-v2'
import { Reservation, ReservationStatus, PaymentStatus } from '@/lib/types/reservation'
import { Property } from '@/lib/types/property'
import { ValidationError } from '@/lib/utils/errors'
import { CheckAvailabilityInput } from '@/lib/validation/reservation'
import { eachDayOfInterval, format } from 'date-fns'

class ReservationService {
  private getTenantService(tenantId: string) {
    return new TenantServiceFactory(tenantId)
  }

  /**
   * Check if a property is available for the given dates
   */
  async checkAvailability(input: CheckAvailabilityInput | {
    propertyId: string;
    checkIn: Date;
    checkOut: Date;
    excludeReservationId?: string;
    tenantId: string;
  }): Promise<boolean> {
    const { propertyId, checkIn, checkOut, excludeReservationId, tenantId } = input as any
    
    const services = this.getTenantService(tenantId)
    
    // Get all reservations for this property
    const reservations = await services.reservations.getMany([
      { field: 'propertyId', operator: '==', value: propertyId },
      { field: 'status', operator: 'in', value: [
        ReservationStatus.CONFIRMED,
        ReservationStatus.PENDING,
        ReservationStatus.CHECKED_IN
      ]}
    ])

    const checkInDate = new Date(checkIn)
    const checkOutDate = new Date(checkOut)

    // Check for date conflicts
    for (const reservation of reservations) {
      // Skip if it's the same reservation being updated
      if (excludeReservationId && reservation.id === excludeReservationId) {
        continue
      }

      const resCheckIn = new Date(reservation.checkIn)
      const resCheckOut = new Date(reservation.checkOut)

      // Check for overlap
      if (
        (checkInDate >= resCheckIn && checkInDate < resCheckOut) ||
        (checkOutDate > resCheckIn && checkOutDate <= resCheckOut) ||
        (checkInDate <= resCheckIn && checkOutDate >= resCheckOut)
      ) {
        return false
      }
    }

    return true
  }


  /**
   * Validate property capacity
   */
  async validatePropertyCapacity(propertyId: string, guests: number, tenantId: string): Promise<void> {
    const services = this.getTenantService(tenantId)
    const property = await services.properties.get(propertyId)
    
    if (!property) {
      throw new ValidationError('Propriedade não encontrada', 'propertyId')
    }

    if (!property.isActive) {
      throw new ValidationError('Propriedade não está disponível', 'propertyId')
    }

    if (guests > property.maxGuests) {
      throw new ValidationError(
        `Número de hóspedes excede a capacidade máxima (${property.maxGuests})`,
        'guests'
      )
    }

    const checkInDate = new Date()
    const checkOutDate = new Date()
    checkOutDate.setDate(checkOutDate.getDate() + 1)

    // Check minimum nights
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (property.minimumNights && nights < property.minimumNights) {
      throw new ValidationError(
        `Estadia mínima é de ${property.minimumNights} noites`,
        'nights'
      )
    }
  }

  /**
   * Calculate pricing for a reservation
   * Now using PricingService for complete and accurate calculations
   */
  async calculatePricing(
    propertyId: string,
    checkIn: Date,
    checkOut: Date,
    guests: number,
    tenantId: string
  ): Promise<{
    nights: number
    baseAmount: number
    cleaningFee: number
    securityDeposit: number
    totalAmount: number
    weekendSurcharge?: number
    holidaySurcharge?: number
    seasonalAdjustment?: number
  }> {
    const services = this.getTenantService(tenantId)
    const property = await services.properties.get(propertyId)

    if (!property) {
      throw new ValidationError('Propriedade não encontrada', 'propertyId')
    }

    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (nights <= 0) {
      throw new ValidationError('Período inválido', 'dates')
    }

    // Use PricingService for complete pricing calculation
    const { pricingService } = await import('./pricing')
    const priceCalculation = await pricingService.calculatePrice(
      property,
      checkIn,
      checkOut,
      guests
    )

    return {
      nights: priceCalculation.nights,
      baseAmount: priceCalculation.subtotal,
      cleaningFee: priceCalculation.cleaningFee,
      securityDeposit: priceCalculation.securityDeposit,
      totalAmount: priceCalculation.totalPrice,
      weekendSurcharge: priceCalculation.weekendSurcharge,
      holidaySurcharge: priceCalculation.holidaySurcharge,
      seasonalAdjustment: priceCalculation.seasonalAdjustment
    }
  }

  /**
   * Get active reservations count for analytics
   */
  async getActiveReservationsCount(tenantId: string): Promise<number> {
    const services = this.getTenantService(tenantId)
    const reservations = await services.reservations.getMany([
      { field: 'status', operator: 'in', value: [
        ReservationStatus.CONFIRMED,
        ReservationStatus.CHECKED_IN
      ]}
    ])

    return reservations.length
  }

  /**
   * Get reservations with conflicts (same property, overlapping dates)
   */
  async findConflictingReservations(
    propertyId: string,
    checkIn: Date,
    checkOut: Date,
    tenantId: string,
    excludeId?: string
  ): Promise<Reservation[]> {
    const services = this.getTenantService(tenantId)
    const reservations = await services.reservations.getMany([
      { field: 'propertyId', operator: '==', value: propertyId },
      { field: 'status', operator: 'in', value: [
        ReservationStatus.CONFIRMED,
        ReservationStatus.PENDING,
        ReservationStatus.CHECKED_IN
      ]}
    ])

    return reservations.filter(reservation => {
      if (excludeId && reservation.id === excludeId) return false

      const resCheckIn = new Date(reservation.checkIn)
      const resCheckOut = new Date(reservation.checkOut)

      return (
        (checkIn >= resCheckIn && checkIn < resCheckOut) ||
        (checkOut > resCheckIn && checkOut <= resCheckOut) ||
        (checkIn <= resCheckIn && checkOut >= resCheckOut)
      )
    })
  }

  /**
   * Update reservation payment status based on payments
   */
  async updatePaymentStatus(reservationId: string, paidAmount: number, tenantId: string): Promise<void> {
    const services = this.getTenantService(tenantId)
    const reservation = await services.reservations.get(reservationId)
    
    if (!reservation) {
      throw new ValidationError('Reserva não encontrada', 'reservationId')
    }

    const updates: Partial<Reservation> = {
      paidAmount,
      pendingAmount: reservation.totalAmount - paidAmount,
      updatedAt: new Date()
    }

    // Update payment status based on paid amount
    if (paidAmount >= reservation.totalAmount) {
      updates.paymentStatus = PaymentStatus.PAID
    } else if (paidAmount > 0) {
      updates.paymentStatus = PaymentStatus.PARTIAL
    }

    await services.reservations.update(reservationId, updates)
  }

  /**
   * Validate reservation dates
   */
  validateReservationDates(checkIn: Date, checkOut: Date): void {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    if (checkIn < now) {
      throw new ValidationError('Data de check-in não pode ser no passado', 'checkIn')
    }

    if (checkOut <= checkIn) {
      throw new ValidationError('Data de check-out deve ser posterior ao check-in', 'checkOut')
    }

    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (nights > 365) {
      throw new ValidationError('Período de estadia não pode exceder 365 dias', 'nights')
    }

    // Check if dates are not too far in the future (2 years)
    const maxFutureDate = new Date()
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 2)

    if (checkIn > maxFutureDate) {
      throw new ValidationError('Data de check-in está muito distante no futuro', 'checkIn')
    }
  }

  /**
   * Check if a reservation can be cancelled
   */
  canCancelReservation(reservation: Reservation): boolean {
    // Cannot cancel if already checked in or completed
    if ([
      ReservationStatus.CHECKED_IN,
      ReservationStatus.CHECKED_OUT,
      ReservationStatus.CANCELLED
    ].includes(reservation.status)) {
      return false
    }

    // Add more business rules here (e.g., cancellation deadline)
    return true
  }

  /**
   * Check if a reservation can be modified
   */
  canModifyReservation(reservation: Reservation): boolean {
    // Cannot modify if already checked in, completed, or cancelled
    if ([
      ReservationStatus.CHECKED_IN,
      ReservationStatus.CHECKED_OUT,
      ReservationStatus.CANCELLED,
      ReservationStatus.NO_SHOW
    ].includes(reservation.status)) {
      return false
    }

    // Add more business rules here
    return true
  }

  /**
   * Sync reservation dates with property unavailableDates
   * This is called when a reservation is confirmed
   */
  async syncReservationWithUnavailableDates(
    reservationId: string,
    tenantId: string,
    action: 'add' | 'remove' = 'add'
  ): Promise<void> {
    const services = this.getTenantService(tenantId)
    const reservation = await services.reservations.get(reservationId)
    
    if (!reservation) {
      throw new ValidationError('Reserva não encontrada', 'reservationId')
    }

    // Only sync confirmed, checked-in, or pending reservations
    if (![
      ReservationStatus.CONFIRMED,
      ReservationStatus.CHECKED_IN,
      ReservationStatus.PENDING
    ].includes(reservation.status)) {
      return
    }

    const property = await services.properties.get(reservation.propertyId)
    
    if (!property) {
      throw new ValidationError('Propriedade não encontrada', 'propertyId')
    }

    // Get all dates in the reservation period
    const reservationDates = eachDayOfInterval({
      start: new Date(reservation.checkIn),
      end: new Date(reservation.checkOut)
    })

    // Convert existing unavailable dates to date strings for comparison
    const unavailableDateStrings = new Set(
      (property.unavailableDates || []).map(date => 
        format(new Date(date), 'yyyy-MM-dd')
      )
    )

    if (action === 'add') {
      // Add reservation dates to unavailable dates
      reservationDates.forEach(date => {
        unavailableDateStrings.add(format(date, 'yyyy-MM-dd'))
      })
    } else {
      // Remove reservation dates from unavailable dates
      reservationDates.forEach(date => {
        unavailableDateStrings.delete(format(date, 'yyyy-MM-dd'))
      })
    }

    // Convert back to Date array
    const updatedUnavailableDates = Array.from(unavailableDateStrings)
      .map(dateStr => new Date(dateStr))
      .sort((a, b) => a.getTime() - b.getTime())

    // Update property with new unavailable dates
    await services.properties.update(reservation.propertyId, {
      unavailableDates: updatedUnavailableDates,
      updatedAt: new Date()
    })
  }

  /**
   * Create a new reservation
   */
  async create(reservationData: {
    propertyId: string;
    clientId: string;
    checkIn: Date;
    checkOut: Date;
    guests: number;
    totalAmount: number;
    paymentMethod: string;
    specialRequests?: string;
    status: ReservationStatus;
    tenantId: string;
  }): Promise<Reservation> {
    const { tenantId } = reservationData;
    const services = this.getTenantService(tenantId);

    // Validate availability
    const isAvailable = await this.checkAvailability({
      propertyId: reservationData.propertyId,
      checkIn: reservationData.checkIn,
      checkOut: reservationData.checkOut,
      tenantId
    });

    if (!isAvailable) {
      throw new ValidationError('Propriedade não disponível para as datas selecionadas', 'availability');
    }

    // Validate property capacity
    await this.validatePropertyCapacity(reservationData.propertyId, reservationData.guests, tenantId);

    // Calculate pricing
    const pricing = await this.calculatePricing(
      reservationData.propertyId,
      reservationData.checkIn,
      reservationData.checkOut,
      reservationData.guests,
      tenantId
    );

    // Generate confirmation code
    const confirmationCode = `RES${Date.now().toString(36).toUpperCase()}`;

    // Create reservation
    const reservation: Omit<Reservation, 'id'> = {
      ...reservationData,
      confirmationCode,
      totalAmount: pricing.totalAmount,
      paidAmount: 0,
      pendingAmount: pricing.totalAmount,
      paymentStatus: PaymentStatus.PENDING,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const id = await services.reservations.create(reservation);
    const createdReservation = { ...reservation, id } as Reservation;

    // Sync with property unavailable dates
    if (reservationData.status === ReservationStatus.CONFIRMED) {
      await this.syncReservationWithUnavailableDates(id, tenantId, 'add');
    }

    return createdReservation;
  }

  /**
   * Update reservation status and sync availability if needed
   */
  async updateReservationStatus(
    reservationId: string,
    newStatus: ReservationStatus,
    tenantId: string
  ): Promise<void> {
    const services = this.getTenantService(tenantId)
    const reservation = await services.reservations.get(reservationId)
    
    if (!reservation) {
      throw new ValidationError('Reserva não encontrada', 'reservationId')
    }

    const oldStatus = reservation.status

    // Update reservation status
    await services.reservations.update(reservationId, {
      status: newStatus,
      updatedAt: new Date()
    })

    // Sync availability based on status change
    if (
      newStatus === ReservationStatus.CONFIRMED && 
      oldStatus !== ReservationStatus.CONFIRMED
    ) {
      // Add dates to unavailable when confirming
      await this.syncReservationWithUnavailableDates(reservationId, tenantId, 'add')
    } else if (
      [ReservationStatus.CANCELLED, ReservationStatus.NO_SHOW].includes(newStatus) &&
      [ReservationStatus.CONFIRMED, ReservationStatus.PENDING].includes(oldStatus)
    ) {
      // Remove dates from unavailable when cancelling
      await this.syncReservationWithUnavailableDates(reservationId, tenantId, 'remove')
    }
  }
}

export const reservationService = new ReservationService()
export { ReservationService }