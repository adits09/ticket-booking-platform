import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../src/prisma/client';
import * as seatService from '../src/services/seat.service';
import * as bookingService from '../src/services/booking.service';
import * as waitlistService from '../src/services/waitlist.service';
import { generateQRCodeDataURL } from '../src/services/qr.service';
import bcrypt from 'bcryptjs';
import { Role, EventType, SeatCategory, SeatStatus } from '@prisma/client';

describe('Production Ticket Booking System Test Suite', () => {
  let userA: any;
  let userB: any;
  let event: any;
  let targetSeat: any;

  beforeAll(async () => {
    // 1. Create Test Users
    const passwordHash = await bcrypt.hash('password123', 10);
    userA = await prisma.user.create({
      data: {
        email: `test_a_${Date.now()}@example.com`,
        passwordHash,
        name: 'Test User A',
        role: Role.CUSTOMER,
      },
    });

    userB = await prisma.user.create({
      data: {
        email: `test_b_${Date.now()}@example.com`,
        passwordHash,
        name: 'Test User B',
        role: Role.CUSTOMER,
      },
    });

    // 2. Create Test Venue & Seat
    const venue = await prisma.venue.create({
      data: {
        name: 'Test Arena',
        address: '123 Test St',
        city: 'Test City',
        totalRows: 1,
        seatsPerRow: 2,
      },
    });

    const seat = await prisma.seat.create({
      data: {
        venueId: venue.id,
        rowLabel: 'A',
        seatNumber: 1,
        category: SeatCategory.PREMIUM,
      },
    });

    // 3. Create Test Event
    event = await prisma.event.create({
      data: {
        title: 'Test Concurrency Show',
        description: 'Testing concurrency locks and TTL holds',
        eventType: EventType.CONCERT,
        date: new Date(),
        startTime: '20:00',
        venueId: venue.id,
        organiserId: userA.id,
        categoryPrices: { PREMIUM: 300 },
      },
    });

    targetSeat = await prisma.eventSeat.create({
      data: {
        eventId: event.id,
        seatId: seat.id,
        rowLabel: 'A',
        seatNumber: 1,
        category: SeatCategory.PREMIUM,
        price: 300,
        status: SeatStatus.AVAILABLE,
      },
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Scenario 1: Concurrency Protection - Simultaneous hold requests for exact same seat', async () => {
    // Trigger two parallel hold requests at the exact same millisecond
    const promiseA = seatService.createSeatHold(event.id, [targetSeat.id], userA.id, 10);
    const promiseB = seatService.createSeatHold(event.id, [targetSeat.id], userB.id, 10);

    const results = await Promise.allSettled([promiseA, promiseB]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    // Exactly one request MUST succeed and one MUST be rejected with conflict
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    const successfulHold: any = (fulfilled[0] as PromiseFulfilledResult<any>).value;
    expect(successfulHold).toHaveProperty('holdId');
  });

  it('Scenario 2: Seat Hold TTL Expiration', async () => {
    // Reset target seat status to AVAILABLE
    await prisma.eventSeat.update({
      where: { id: targetSeat.id },
      data: { status: SeatStatus.AVAILABLE, holdId: null },
    });

    // Create hold with short 0.01 minute (600ms) TTL
    const shortHold = await seatService.createSeatHold(event.id, [targetSeat.id], userA.id, 0.01);
    expect(shortHold.holdId).toBeDefined();

    // Wait 700ms for hold to expire
    await new Promise((resolve) => setTimeout(resolve, 700));

    // User B attempts to hold the expired seat -> Should succeed dynamically!
    const userBHold = await seatService.createSeatHold(event.id, [targetSeat.id], userB.id, 10);
    expect(userBHold.userId).toBe(userB.id);
  });

  it('Scenario 3: Booking Conversion & Double Booking Prevention', async () => {
    // User B has active hold, converts it to booking
    const activeHold = await prisma.seatHold.findFirst({
      where: { eventId: event.id, userId: userB.id, status: 'ACTIVE' },
    });

    const booking = await bookingService.createBooking(userB.id, {
      eventId: event.id,
      holdId: activeHold!.id,
    });

    expect(booking.bookingReference).toContain('BOOK-2026-');
    expect(booking.status).toBe('CONFIRMED');

    // User A attempts to hold or book the same seat -> MUST fail because status is now BOOKED
    await expect(
      seatService.createSeatHold(event.id, [targetSeat.id], userA.id, 10)
    ).rejects.toThrow(/already booked/i);
  });

  it('Scenario 4: Cancellation & Automatic Waitlist Assignment', async () => {
    // 1. User A joins waitlist for PREMIUM category
    const waitlistRes = await waitlistService.joinWaitlist(event.id, SeatCategory.PREMIUM, userA.id);
    expect(waitlistRes.waitlistEntry.position).toBe(1);

    // 2. User B cancels their confirmed booking
    const userBBooking = await prisma.booking.findFirst({
      where: { userId: userB.id, status: 'CONFIRMED' },
    });

    await bookingService.cancelBooking(userBBooking!.id, userB.id, 'CUSTOMER');

    // Wait 300ms for background waitlist assignment trigger
    await new Promise((resolve) => setTimeout(resolve, 300));

    // 3. User A should have received a waitlist offer!
    const offers = await prisma.waitlistOffer.findMany({
      where: { waitlistEntryId: waitlistRes.waitlistEntry.id },
    });

    expect(offers.length).toBe(1);
    expect(offers[0].status).toBe('PENDING');

    // 4. User A accepts offer
    const acceptRes = await waitlistService.acceptWaitlistOffer(offers[0].token, userA.id);
    expect(acceptRes.holdId).toBeDefined();
  });

  it('Scenario 5: QR Code Ticket Generation', async () => {
    const qrDataUrl = await generateQRCodeDataURL('BOOK-2026-TESTREF');
    expect(qrDataUrl).toContain('data:image/png;base64,');
  });
});
