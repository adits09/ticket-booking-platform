import crypto from 'crypto';
import { prisma } from '../prisma/client';
import { SeatCategory, WaitlistStatus, OfferStatus, SeatStatus, HoldStatus } from '@prisma/client';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import { sendWaitlistOfferEmail } from './email.service';

export const joinWaitlist = async (
  eventId: string,
  category: SeatCategory,
  userId: string
) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // Check if user is already waiting in this queue
  const existing = await prisma.waitlistEntry.findFirst({
    where: {
      eventId,
      category,
      userId,
      status: WaitlistStatus.WAITING,
    },
  });

  if (existing) {
    return {
      message: 'You are already on the waitlist for this category',
      waitlistEntry: existing,
    };
  }

  // Calculate position (max position + 1)
  const lastEntry = await prisma.waitlistEntry.findFirst({
    where: { eventId, category, status: WaitlistStatus.WAITING },
    orderBy: { position: 'desc' },
  });

  const position = (lastEntry?.position || 0) + 1;

  const entry = await prisma.waitlistEntry.create({
    data: {
      eventId,
      category,
      userId,
      position,
      status: WaitlistStatus.WAITING,
    },
    include: {
      event: true,
    },
  });

  return {
    message: 'Successfully joined waitlist',
    waitlistEntry: entry,
  };
};

export const getWaitlistStatus = async (eventId: string, userId: string) => {
  const entries = await prisma.waitlistEntry.findMany({
    where: { eventId, userId },
    include: {
      offers: {
        where: { status: OfferStatus.PENDING },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return entries;
};

export const getUserWaitlistEntries = async (userId: string) => {
  return prisma.waitlistEntry.findMany({
    where: { userId },
    include: {
      event: { include: { venue: true } },
      offers: { orderBy: { createdAt: 'desc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
};

/**
 * Process automatic waitlist offer when a seat becomes available.
 */
export const processWaitlistOfferForSeat = async (
  eventId: string,
  eventSeatId: string,
  category: SeatCategory
) => {
  return await prisma.$transaction(async (tx) => {
    // 1. Verify seat is still AVAILABLE
    const seat = await tx.eventSeat.findUnique({
      where: { id: eventSeatId },
    });

    if (!seat || seat.status !== SeatStatus.AVAILABLE) {
      console.log(`[Waitlist Assignment] Seat ${eventSeatId} is no longer AVAILABLE. Skipping offer.`);
      return null;
    }

    // 2. Get next eligible waitlist customer (FIFO: lowest position, status WAITING)
    const nextWaitlistEntry = await tx.waitlistEntry.findFirst({
      where: {
        eventId,
        category,
        status: WaitlistStatus.WAITING,
      },
      include: { user: true, event: true },
      orderBy: { position: 'asc' },
    });

    if (!nextWaitlistEntry) {
      console.log(`[Waitlist Assignment] No pending waitlist entries for event ${eventId}, category ${category}`);
      return null;
    }

    // 3. Generate secure random token and expiration time
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + config.waitlistOfferTTLMinutes * 60 * 1000);

    // 4. Update waitlist entry status to OFFERED
    await tx.waitlistEntry.update({
      where: { id: nextWaitlistEntry.id },
      data: { status: WaitlistStatus.OFFERED },
    });

    // 5. Create WaitlistOffer
    const offer = await tx.waitlistOffer.create({
      data: {
        waitlistEntryId: nextWaitlistEntry.id,
        eventSeatId,
        token,
        expiresAt,
        status: OfferStatus.PENDING,
      },
    });

    // Temporarily mark seat as HELD for waitlist offer recipient
    await tx.eventSeat.update({
      where: { id: eventSeatId },
      data: { status: SeatStatus.HELD },
    });

    // 6. Send email notification to customer
    sendWaitlistOfferEmail({
      toEmail: nextWaitlistEntry.user.email,
      userName: nextWaitlistEntry.user.name,
      eventTitle: nextWaitlistEntry.event.title,
      category,
      offerToken: token,
      expiresAt: expiresAt.toLocaleString(),
    }).catch((e) => console.error('Error sending waitlist offer email:', e));

    console.log(`[Waitlist Assignment] Created offer for user ${nextWaitlistEntry.user.email} (Token: ${token})`);
    return offer;
  });
};

export const getOfferByToken = async (token: string) => {
  const offer = await prisma.waitlistOffer.findUnique({
    where: { token },
    include: {
      waitlistEntry: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          event: { include: { venue: true } },
        },
      },
      eventSeat: true,
    },
  });

  if (!offer) {
    throw new AppError('Waitlist offer not found', 404);
  }

  const now = new Date();
  if (offer.status !== OfferStatus.PENDING || offer.expiresAt <= now) {
    throw new AppError('Waitlist offer has expired or already been used', 400);
  }

  return offer;
};

export const acceptWaitlistOffer = async (token: string, userId: string) => {
  const now = new Date();

  return await prisma.$transaction(async (tx) => {
    const offer = await tx.waitlistOffer.findUnique({
      where: { token },
      include: {
        waitlistEntry: true,
        eventSeat: true,
      },
    });

    if (!offer) {
      throw new AppError('Waitlist offer not found', 404);
    }

    if (offer.waitlistEntry.userId !== userId) {
      throw new AppError('Forbidden: Offer does not belong to user', 403);
    }

    if (offer.status !== OfferStatus.PENDING) {
      throw new AppError(`Waitlist offer is no longer valid (status: ${offer.status})`, 400);
    }

    if (offer.expiresAt <= now) {
      await tx.waitlistOffer.update({
        where: { id: offer.id },
        data: { status: OfferStatus.EXPIRED },
      });
      await tx.waitlistEntry.update({
        where: { id: offer.waitlistEntryId },
        data: { status: WaitlistStatus.EXPIRED },
      });
      // Free seat and re-trigger waitlist
      await tx.eventSeat.update({
        where: { id: offer.eventSeatId },
        data: { status: SeatStatus.AVAILABLE, holdId: null },
      });
      throw new AppError('Waitlist offer has expired', 400);
    }

    // Convert offer into an active SeatHold
    const expiresAt = new Date(now.getTime() + config.seatHoldTTLMinutes * 60 * 1000);
    const hold = await tx.seatHold.create({
      data: {
        eventId: offer.waitlistEntry.eventId,
        userId,
        status: HoldStatus.ACTIVE,
        expiresAt,
        items: {
          create: [{ eventSeatId: offer.eventSeatId }],
        },
      },
    });

    await tx.eventSeat.update({
      where: { id: offer.eventSeatId },
      data: { status: SeatStatus.HELD, holdId: hold.id },
    });

    await tx.waitlistOffer.update({
      where: { id: offer.id },
      data: { status: OfferStatus.ACCEPTED },
    });

    await tx.waitlistEntry.update({
      where: { id: offer.waitlistEntryId },
      data: { status: WaitlistStatus.FULFILLED },
    });

    return {
      message: 'Offer accepted! Seat hold created.',
      holdId: hold.id,
      eventId: offer.waitlistEntry.eventId,
      expiresAt,
    };
  });
};
