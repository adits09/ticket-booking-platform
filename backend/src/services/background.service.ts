import { prisma } from '../prisma/client';
import { HoldStatus, SeatStatus, OfferStatus, WaitlistStatus } from '@prisma/client';
import { broadcastSeatUpdate, SeatStatusUpdate } from '../socket';
import { processWaitlistOfferForSeat } from './waitlist.service';

export const processExpiredHolds = async () => {
  const now = new Date();

  try {
    const expiredHolds = await prisma.seatHold.findMany({
      where: {
        status: HoldStatus.ACTIVE,
        expiresAt: { lt: now },
      },
      include: {
        items: { include: { eventSeat: true } },
      },
    });

    if (expiredHolds.length === 0) return;

    for (const hold of expiredHolds) {
      await prisma.$transaction(async (tx) => {
        // Mark hold as EXPIRED
        await tx.seatHold.update({
          where: { id: hold.id },
          data: { status: HoldStatus.EXPIRED },
        });

        const eventSeatIds = hold.items.map((i) => i.eventSeatId);

        // Reset seats to AVAILABLE
        await tx.eventSeat.updateMany({
          where: { id: { in: eventSeatIds }, holdId: hold.id },
          data: { status: SeatStatus.AVAILABLE, holdId: null },
        });

        // Broadcast Socket update
        const seatUpdates: SeatStatusUpdate[] = hold.items.map((i) => ({
          seatId: i.eventSeatId,
          rowLabel: i.eventSeat.rowLabel,
          seatNumber: i.eventSeat.seatNumber,
          status: 'AVAILABLE',
          holdId: null,
          heldByUserId: null,
        }));
        broadcastSeatUpdate(hold.eventId, seatUpdates);

        console.log(`[Background Worker] Released expired hold ${hold.id} (${eventSeatIds.length} seats)`);
      });

      // Trigger waitlist auto-assignment for each freed seat
      for (const item of hold.items) {
        processWaitlistOfferForSeat(hold.eventId, item.eventSeatId, item.eventSeat.category).catch((err) =>
          console.error('[Waitlist Expiry Trigger Error]', err)
        );
      }
    }
  } catch (err) {
    console.error('[Background Worker Error] Failed processing expired holds:', err);
  }
};

export const processExpiredWaitlistOffers = async () => {
  const now = new Date();

  try {
    const expiredOffers = await prisma.waitlistOffer.findMany({
      where: {
        status: OfferStatus.PENDING,
        expiresAt: { lt: now },
      },
      include: {
        waitlistEntry: true,
        eventSeat: true,
      },
    });

    if (expiredOffers.length === 0) return;

    for (const offer of expiredOffers) {
      await prisma.$transaction(async (tx) => {
        await tx.waitlistOffer.update({
          where: { id: offer.id },
          data: { status: OfferStatus.EXPIRED },
        });

        await tx.waitlistEntry.update({
          where: { id: offer.waitlistEntryId },
          data: { status: WaitlistStatus.EXPIRED },
        });

        await tx.eventSeat.update({
          where: { id: offer.eventSeatId },
          data: { status: SeatStatus.AVAILABLE, holdId: null },
        });

        console.log(`[Background Worker] Expired waitlist offer ${offer.id} for user ${offer.waitlistEntry.userId}`);
      });

      // Pass the freed seat to the NEXT eligible customer on waitlist
      processWaitlistOfferForSeat(
        offer.waitlistEntry.eventId,
        offer.eventSeatId,
        offer.eventSeat.category
      ).catch((err) => console.error('[Waitlist Offer Re-assignment Error]', err));
    }
  } catch (err) {
    console.error('[Background Worker Error] Failed processing expired waitlist offers:', err);
  }
};

let intervalId: NodeJS.Timeout | null = null;

export const startBackgroundJobWorker = (intervalMs: number = 5000) => {
  if (intervalId) return;

  console.log(`[Background Worker] Service started (Polling interval: ${intervalMs}ms)`);
  intervalId = setInterval(async () => {
    await processExpiredHolds();
    await processExpiredWaitlistOffers();
  }, intervalMs);
};

export const stopBackgroundJobWorker = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Background Worker] Service stopped');
  }
};
