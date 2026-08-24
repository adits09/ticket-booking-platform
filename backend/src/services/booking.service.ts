import { prisma } from '../prisma/client';
import { SeatStatus, HoldStatus, BookingStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';
import { generateQRCodeDataURL } from './qr.service';
import { sendBookingConfirmationEmail } from './email.service';
import { broadcastSeatUpdate, SeatStatusUpdate } from '../socket';
import { processWaitlistOfferForSeat } from './waitlist.service';

export interface CreateBookingDTO {
  eventId: string;
  holdId: string;
  paymentDetails?: {
    cardHolderName?: string;
    cardNumber?: string;
  };
}

export const createBooking = async (userId: string, data: CreateBookingDTO) => {
  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    // 1. Verify SeatHold
    const hold = await tx.seatHold.findUnique({
      where: { id: data.holdId },
      include: {
        items: {
          include: {
            eventSeat: true,
          },
        },
        user: true,
        event: {
          include: { venue: true },
        },
      },
    });

    if (!hold) {
      throw new AppError('Seat hold not found', 404);
    }

    if (hold.userId !== userId) {
      throw new AppError('Forbidden: Hold does not belong to user', 403);
    }

    if (hold.status !== HoldStatus.ACTIVE) {
      throw new AppError(`Seat hold is no longer active (status: ${hold.status})`, 400);
    }

    if (hold.expiresAt <= now) {
      // Mark hold as EXPIRED
      await tx.seatHold.update({
        where: { id: hold.id },
        data: { status: HoldStatus.EXPIRED },
      });
      // Free seats
      const expiredSeatIds = hold.items.map((i) => i.eventSeatId);
      await tx.eventSeat.updateMany({
        where: { id: { in: expiredSeatIds }, holdId: hold.id },
        data: { status: SeatStatus.AVAILABLE, holdId: null },
      });
      throw new AppError('Seat hold has expired. Please select seats again.', 400);
    }

    const eventSeatIds = hold.items.map((i) => i.eventSeatId);

    // 2. Lock EventSeats for atomic conversion
    const lockedSeats: any[] = await tx.$queryRaw`
      SELECT es.id, es.status, es.price, es."rowLabel", es."seatNumber"
      FROM "EventSeat" es
      WHERE es.id = ANY(${eventSeatIds}::text[])
      FOR UPDATE
    `;

    for (const seat of lockedSeats) {
      if (seat.status === SeatStatus.BOOKED) {
        throw new AppError(`Seat ${seat.rowLabel}${seat.seatNumber} is already booked`, 409);
      }
    }

    // Calculate total price
    const totalPrice = hold.items.reduce((sum, item) => sum + item.eventSeat.price, 0);

    // Generate unique booking reference
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const bookingReference = `BOOK-2026-${randomHex}`;

    // Generate QR Code Data URL containing the booking reference
    const qrCodeDataUrl = await generateQRCodeDataURL(bookingReference);

    // 3. Create Booking record
    const booking = await tx.booking.create({
      data: {
        bookingReference,
        eventId: hold.eventId,
        userId: userId,
        status: BookingStatus.CONFIRMED,
        totalPrice,
        qrCodeData: qrCodeDataUrl,
        paymentId: `PAY-${Date.now()}-${randomHex}`,
        bookingSeats: {
          create: hold.items.map((item) => ({
            eventSeatId: item.eventSeatId,
            price: item.eventSeat.price,
          })),
        },
      },
      include: {
        bookingSeats: {
          include: {
            eventSeat: true,
          },
        },
        event: { include: { venue: true } },
        user: true,
      },
    });

    // 4. Update Hold status to CONVERTED
    await tx.seatHold.update({
      where: { id: hold.id },
      data: { status: HoldStatus.CONVERTED },
    });

    // 5. Update EventSeats to BOOKED
    await tx.eventSeat.updateMany({
      where: { id: { in: eventSeatIds } },
      data: { status: SeatStatus.BOOKED, holdId: null },
    });

    // Broadcast WebSocket real-time update
    const seatUpdates: SeatStatusUpdate[] = hold.items.map((item) => ({
      seatId: item.eventSeatId,
      rowLabel: item.eventSeat.rowLabel,
      seatNumber: item.eventSeat.seatNumber,
      status: 'BOOKED',
      holdId: null,
      heldByUserId: null,
    }));
    broadcastSeatUpdate(hold.eventId, seatUpdates);

    // 6. Dispatch Confirmation Email asynchronously
    const seatLabels = hold.items.map((item) => `${item.eventSeat.rowLabel}${item.eventSeat.seatNumber}`);
    sendBookingConfirmationEmail({
      toEmail: hold.user.email,
      userName: hold.user.name,
      bookingRef: bookingReference,
      eventTitle: hold.event.title,
      eventDate: `${hold.event.date.toISOString().split('T')[0]} ${hold.event.startTime}`,
      venueName: hold.event.venue.name,
      seats: seatLabels,
      totalPrice,
      qrCodeDataUrl,
    }).catch((e) => console.error('Error sending confirmation email:', e));

    return booking;
  });
};

export const cancelBooking = async (bookingId: string, userId: string, userRole: string) => {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingSeats: {
          include: {
            eventSeat: true,
          },
        },
        event: true,
      },
    });

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (userRole !== 'ADMIN' && booking.userId !== userId) {
      throw new AppError('Forbidden: Booking does not belong to user', 403);
    }

    if (booking.status === BookingStatus.CANCELLED) {
      throw new AppError('Booking is already cancelled', 400);
    }

    // 1. Mark booking as CANCELLED
    await tx.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.CANCELLED },
    });

    // 2. Mark event seats as AVAILABLE
    const eventSeatIds = booking.bookingSeats.map((bs) => bs.eventSeatId);
    await tx.eventSeat.updateMany({
      where: { id: { in: eventSeatIds } },
      data: { status: SeatStatus.AVAILABLE, holdId: null },
    });

    // Broadcast WebSocket real-time update
    const seatUpdates: SeatStatusUpdate[] = booking.bookingSeats.map((bs) => ({
      seatId: bs.eventSeatId,
      rowLabel: bs.eventSeat.rowLabel,
      seatNumber: bs.eventSeat.seatNumber,
      status: 'AVAILABLE',
      holdId: null,
      heldByUserId: null,
    }));
    broadcastSeatUpdate(booking.eventId, seatUpdates);

    // 3. Trigger Automatic Waitlist Assignment for each freed seat!
    for (const bs of booking.bookingSeats) {
      // Process waitlist offer outside transaction or after block to prevent deadlock
      setTimeout(() => {
        processWaitlistOfferForSeat(booking.eventId, bs.eventSeatId, bs.eventSeat.category).catch((err) =>
          console.error('[Waitlist Trigger Error]', err)
        );
      }, 100);
    }

    return { message: 'Booking cancelled successfully. Seats freed.' };
  });
};

export const getUserBookings = async (userId: string) => {
  return prisma.booking.findMany({
    where: { userId },
    include: {
      event: {
        include: { venue: true },
      },
      bookingSeats: {
        include: { eventSeat: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getBookingById = async (bookingId: string, userId: string, userRole: string) => {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      event: {
        include: { venue: true },
      },
      user: {
        select: { id: true, name: true, email: true },
      },
      bookingSeats: {
        include: { eventSeat: true },
      },
    },
  });

  if (!booking) {
    throw new AppError('Booking not found', 404);
  }

  if (userRole !== 'ADMIN' && booking.userId !== userId && booking.event.organiserId !== userId) {
    throw new AppError('Forbidden: Cannot view this booking', 403);
  }

  return booking;
};
