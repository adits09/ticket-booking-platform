import { prisma } from '../prisma/client';
import { EventType, SeatCategory, SeatStatus } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export interface CreateEventDTO {
  title: string;
  description: string;
  eventType: EventType;
  date: string | Date;
  startTime: string;
  endTime?: string;
  posterUrl?: string;
  venueId: string;
  categoryPrices: Record<SeatCategory, number>; // { VIP: 500, PREMIUM: 300, STANDARD: 200 }
  organiserId: string;
}

export const createEvent = async (data: CreateEventDTO) => {
  const venue = await prisma.venue.findUnique({
    where: { id: data.venueId },
    include: { seats: true },
  });

  if (!venue) {
    throw new AppError('Venue not found', 404);
  }

  if (!venue.seats || venue.seats.length === 0) {
    throw new AppError('Selected venue has no seat layout defined', 400);
  }

  const prices: Record<string, number> = {
    VIP: data.categoryPrices.VIP ?? 500,
    PREMIUM: data.categoryPrices.PREMIUM ?? 300,
    STANDARD: data.categoryPrices.STANDARD ?? 150,
  };

  return await prisma.$transaction(async (tx) => {
    const event = await tx.event.create({
      data: {
        title: data.title,
        description: data.description,
        eventType: data.eventType,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        posterUrl: data.posterUrl,
        venueId: data.venueId,
        organiserId: data.organiserId,
        categoryPrices: prices,
      },
    });

    // Generate event seat inventory from venue layout
    const eventSeatsData = venue.seats.map((seat) => {
      const price = prices[seat.category] || 150;
      return {
        eventId: event.id,
        seatId: seat.id,
        rowLabel: seat.rowLabel,
        seatNumber: seat.seatNumber,
        category: seat.category,
        price: price,
        status: seat.isDisabled ? SeatStatus.BOOKED : SeatStatus.AVAILABLE,
      };
    });

    await tx.eventSeat.createMany({
      data: eventSeatsData,
    });

    return tx.event.findUnique({
      where: { id: event.id },
      include: {
        venue: true,
        organiser: { select: { id: true, name: true, email: true } },
        _count: { select: { eventSeats: true } },
      },
    });
  });
};

export const getEvents = async (filters: {
  eventType?: EventType;
  date?: string;
  venueId?: string;
  search?: string;
}) => {
  const where: any = { isCancelled: false };

  if (filters.eventType) {
    where.eventType = filters.eventType;
  }
  if (filters.venueId) {
    where.venueId = filters.venueId;
  }
  if (filters.date) {
    const startDate = new Date(filters.date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(filters.date);
    endDate.setHours(23, 59, 59, 999);
    where.date = { gte: startDate, lte: endDate };
  }
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  const events = await prisma.event.findMany({
    where,
    include: {
      venue: { select: { id: true, name: true, city: true } },
      organiser: { select: { id: true, name: true } },
      _count: { select: { eventSeats: true, bookings: true } },
    },
    orderBy: { date: 'asc' },
  });

  return events;
};

export const getEventById = async (eventId: string) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      venue: true,
      organiser: { select: { id: true, name: true, email: true } },
      eventSeats: {
        orderBy: [{ rowLabel: 'asc' }, { seatNumber: 'asc' }],
      },
    },
  });

  if (!event) {
    throw new AppError('Event not found', 404);
  }

  return event;
};

export const updateEvent = async (
  eventId: string,
  data: Partial<CreateEventDTO>,
  userId: string,
  userRole: string
) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  if (userRole !== 'ADMIN' && event.organiserId !== userId) {
    throw new AppError('Forbidden: You can only edit your own events', 403);
  }

  return prisma.event.update({
    where: { id: eventId },
    data: {
      title: data.title ?? event.title,
      description: data.description ?? event.description,
      eventType: data.eventType ?? event.eventType,
      date: data.date ? new Date(data.date) : event.date,
      startTime: data.startTime ?? event.startTime,
      endTime: data.endTime ?? event.endTime,
      posterUrl: data.posterUrl ?? event.posterUrl,
    },
    include: { venue: true },
  });
};

export const cancelEvent = async (eventId: string, userId: string, userRole: string) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  if (userRole !== 'ADMIN' && event.organiserId !== userId) {
    throw new AppError('Forbidden: You can only cancel your own events', 403);
  }

  return prisma.event.update({
    where: { id: eventId },
    data: { isCancelled: true },
  });
};

export const getOrganiserEvents = async (organiserId: string) => {
  const events = await prisma.event.findMany({
    where: { organiserId },
    include: {
      venue: true,
      bookings: {
        where: { status: 'CONFIRMED' },
        include: { bookingSeats: true },
      },
      eventSeats: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return events.map((event) => {
    const totalCapacity = event.eventSeats.length;
    const bookedSeats = event.eventSeats.filter((s) => s.status === 'BOOKED').length;
    const totalRevenue = event.bookings.reduce((sum, b) => sum + b.totalPrice, 0);

    return {
      id: event.id,
      title: event.title,
      date: event.date,
      startTime: event.startTime,
      venueName: event.venue.name,
      isCancelled: event.isCancelled,
      totalCapacity,
      ticketsSold: bookedSeats,
      totalRevenue,
      occupancyPercentage: totalCapacity > 0 ? ((bookedSeats / totalCapacity) * 100).toFixed(1) : 0,
    };
  });
};
