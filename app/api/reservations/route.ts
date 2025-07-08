import { NextRequest, NextResponse } from 'next/server';
import { FirestoreService } from '@/lib/firebase/firestore';
import { Reservation } from '@/lib/types';

const reservationService = new FirestoreService<Reservation>('reservations');

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const propertyId = searchParams.get('propertyId');

    let reservations: Reservation[];

    if (status || startDate || endDate || propertyId) {
      // Apply filters
      const filters: any[] = [];
      
      if (status) {
        filters.push({ field: 'status', operator: '==', value: status });
      }
      
      if (propertyId) {
        filters.push({ field: 'propertyId', operator: '==', value: propertyId });
      }
      
      if (startDate) {
        filters.push({ field: 'checkIn', operator: '>=', value: new Date(startDate) });
      }
      
      if (endDate) {
        filters.push({ field: 'checkOut', operator: '<=', value: new Date(endDate) });
      }

      reservations = await reservationService.getMany(filters);
    } else {
      reservations = await reservationService.getAll();
    }

    return NextResponse.json({
      reservations,
      count: reservations.length,
    });

  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reservations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['propertyId', 'clientPhone', 'checkIn', 'checkOut', 'guests'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Calculate nights
    const checkInDate = new Date(body.checkIn);
    const checkOutDate = new Date(body.checkOut);
    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));

    if (nights <= 0) {
      return NextResponse.json(
        { error: 'Check-out date must be after check-in date' },
        { status: 400 }
      );
    }

    // Create reservation object
    const reservation: Omit<Reservation, 'id'> = {
      propertyId: body.propertyId,
      propertyName: body.propertyName || '',
      clientPhone: body.clientPhone,
      clientName: body.clientName || '',
      clientEmail: body.clientEmail,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      nights,
      guests: parseInt(body.guests),
      baseAmount: body.baseAmount || 0,
      cleaningFee: body.cleaningFee || 0,
      securityDeposit: body.securityDeposit || 0,
      totalAmount: body.totalAmount || 0,
      status: body.status || 'pending',
      paymentStatus: body.paymentStatus || 'pending',
      source: body.source || 'manual',
      notes: body.notes,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const savedReservation = await reservationService.create(reservation);

    return NextResponse.json(savedReservation, { status: 201 });

  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json(
      { error: 'Failed to create reservation' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      );
    }

    updateData.updatedAt = new Date();

    const updatedReservation = await reservationService.update(id, updateData);

    return NextResponse.json(updatedReservation);

  } catch (error) {
    console.error('Error updating reservation:', error);
    return NextResponse.json(
      { error: 'Failed to update reservation' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Reservation ID is required' },
        { status: 400 }
      );
    }

    await reservationService.delete(id);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting reservation:', error);
    return NextResponse.json(
      { error: 'Failed to delete reservation' },
      { status: 500 }
    );
  }
}