import { prisma } from '../prisma/client';
import { SeatStatus, HoldStatus } from '@prisma/client';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { broadcastSeatUpdate, SeatStatusUpdate } from '../socket';

export const getEventSeats = async (eventId: string, currentUserId?: string) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  const now = new Date();

  // Lazy cleanup check for UI: find holds for this event that expired but are still marked ACTIVE
  const expiredHolds = await prisma.seatHold.findMany({
    where: {
      eventId,
      status: HoldStatus.ACTIVE,
      expiresAt: { lt: now },
    },
    include: { items: true },
  });

  if (expiredHolds.length > 0) {
    const expiredHoldIds = expiredHolds.map((h) => h.id);
    const expiredSeatIds = expiredHolds.flatMap((h) => h.items.map((i) => i.eventSeatId));

    await prisma.$transaction([
      prisma.seatHold.updateMany({
        where: { id: { in: expiredHoldIds } },
        data: { status: HoldStatus.EXPIRED },
      }),
      prisma.eventSeat.updateMany({
        where: { id: { in: expiredSeatIds }, status: SeatStatus.HELD },
        data: { status: SeatStatus.AVAILABLE, holdId: null },
      }),
    ]);
  }

  const seats = await prisma.eventSeat.findMany({
    where: { eventId },
    include: {
      seatHoldItems: {
        where: { hold: { status: HoldStatus.ACTIVE } },
        include: { hold: { select: { id: true, userId: true, expiresAt: true } } },
      },
    },
    orderBy: [{ rowLabel: 'asc' }, { seatNumber: 'asc' }],
  });

  return seats.map((seat) => {
    const activeHold = seat.seatHoldItems[0]?.hold;
    const isHeldByMe = currentUserId ? activeHold?.userId === currentUserId : false;

    return {
      id: seat.id,
      seatId: seat.seatId,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      category: seat.category,
      price: seat.price,
      status: seat.status,
      holdId: seat.holdId,
      isHeldByMe,
      expiresAt: activeHold ? activeHold.expiresAt : null,
    };
  });
};

export const createSeatHold = async (
  eventId: string,
  eventSeatIds: string[],
  userId: string,
  ttlMinutes: number = config.seatHoldTTLMinutes
) => {
  if (!eventSeatIds || eventSeatIds.length === 0) {
    throw new AppError('No seats specified for hold', 400);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);

  // Perform atomic transaction with pessimistic locking via FOR UPDATE
  return await prisma.$transaction(async (tx) => {
    // 1. Lock candidate seats in DB
    const lockedSeats: any[] = await tx.$queryRaw`
      SELECT es.id, es.status, es."holdId", es."rowLabel", es."seatNumber"
      FROM "EventSeat" es
      WHERE es.id = ANY(${eventSeatIds}::text[]) AND es."eventId" = ${eventId}
      FOR UPDATE
    `;

    if (lockedSeats.length !== eventSeatIds.length) {
      throw new AppError('One or more requested seats do not exist for this event', 404);
    }

    // Check if any seat is already booked or currently held by another user with valid TTL
    for (const seat of lockedSeats) {
      if (seat.status === SeatStatus.BOOKED) {
        throw new AppError(`Seat ${seat.rowLabel}${seat.seatNumber} is already booked`, 409);
      }

      if (seat.status === SeatStatus.HELD && seat.holdId) {
        const existingHold = await tx.seatHold.findUnique({
          where: { id: seat.holdId },
        });

        // If hold belongs to same user and is active, we allow re-holding or updating
        if (existingHold && existingHold.status === HoldStatus.ACTIVE && existingHold.expiresAt > now) {
          if (existingHold.userId !== userId) {
            throw new AppError(
              `Seat ${seat.rowLabel}${seat.seatNumber} is currently held by another customer`,
              409
            );
          }
        } else if (existingHold && existingHold.status === HoldStatus.ACTIVE && existingHold.expiresAt <= now) {
          // Expire old hold
          await tx.seatHold.update({
            where: { id: existingHold.id },
            data: { status: HoldStatus.EXPIRED },
          });
        }
      }
    }

    // 2. Release any previous active holds for this user on these exact seats if renewing
    const userPreviousHolds = await tx.seatHold.findMany({
      where: {
        eventId,
        userId,
        status: HoldStatus.ACTIVE,
      },
      include: { items: true },
    });

    for (const hold of userPreviousHolds) {
      await tx.seatHold.update({
        where: { id: hold.id },
        data: { status: HoldStatus.RELEASED },
      });
    }

    // 3. Create new SeatHold
    const hold = await tx.seatHold.create({
      data: {
        eventId,
        userId,
        status: HoldStatus.ACTIVE,
        expiresAt,
        items: {
          create: eventSeatIds.map((id) => ({ eventSeatId: id })),
        },
      },
      include: { items: true },
    });

    // 4. Update EventSeat status to HELD
    await tx.eventSeat.updateMany({
      where: { id: { in: eventSeatIds } },
      data: {
        status: SeatStatus.HELD,
        holdId: hold.id,
      },
    });

    // Broadcast WebSocket real-time update
    const seatUpdates: SeatStatusUpdate[] = lockedSeats.map((seat) => ({
      seatId: seat.id,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      status: 'HELD',
      holdId: hold.id,
      heldByUserId: userId,
    }));
    broadcastSeatUpdate(eventId, seatUpdates);

    return {
      holdId: hold.id,
      eventId,
      userId,
      eventSeatIds,
      expiresAt,
      ttlMinutes,
    };
  });
};

export const releaseSeatHold = async (holdId: string, userId: string) => {
  return await prisma.$transaction(async (tx) => {
    const hold = await tx.seatHold.findUnique({
      where: { id: holdId },
      include: { items: { include: { eventSeat: true } } },
    });

    if (!hold) {
      throw new AppError('Seat hold not found', 404);
    }

    if (hold.userId !== userId) {
      throw new AppError('Forbidden: Hold does not belong to user', 403);
    }

    if (hold.status !== HoldStatus.ACTIVE) {
      return { message: 'Hold is no longer active' };
    }

    await tx.seatHold.update({
      where: { id: holdId },
      data: { status: HoldStatus.RELEASED },
    });

    const eventSeatIds = hold.items.map((i) => i.eventSeatId);
    await tx.eventSeat.updateMany({
      where: { id: { in: eventSeatIds }, holdId: hold.id },
      data: { status: SeatStatus.AVAILABLE, holdId: null },
    });

    const seatUpdates: SeatStatusUpdate[] = hold.items.map((i) => ({
      seatId: i.eventSeatId,
      rowLabel: i.eventSeat.rowLabel,
      seatNumber: i.eventSeat.seatNumber,
      status: 'AVAILABLE',
      holdId: null,
      heldByUserId: null,
    }));
    broadcastSeatUpdate(hold.eventId, seatUpdates);

    return { message: 'Seats released successfully' };
  });
};
