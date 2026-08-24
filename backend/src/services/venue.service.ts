import { prisma } from '../prisma/client';
import { SeatCategory } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export interface CreateSeatInput {
  rowLabel: string;
  seatNumber: number;
  category: SeatCategory;
  isDisabled?: boolean;
}

export interface CreateVenueDTO {
  name: string;
  address: string;
  city: string;
  totalRows: number;
  seatsPerRow: number;
  seats?: CreateSeatInput[];
}

export const createVenue = async (data: CreateVenueDTO) => {
  return await prisma.$transaction(async (tx) => {
    const venue = await tx.venue.create({
      data: {
        name: data.name,
        address: data.address,
        city: data.city,
        totalRows: data.totalRows,
        seatsPerRow: data.seatsPerRow,
      },
    });

    const seatRecords = [];
    if (data.seats && data.seats.length > 0) {
      for (const seat of data.seats) {
        seatRecords.push({
          venueId: venue.id,
          rowLabel: seat.rowLabel,
          seatNumber: seat.seatNumber,
          category: seat.category,
          isDisabled: seat.isDisabled || false,
        });
      }
    } else {
      // Default grid layout generator if no specific seats provided
      for (let r = 0; r < data.totalRows; r++) {
        const rowLabel = String.fromCharCode(65 + r); // A, B, C...
        for (let s = 1; s <= data.seatsPerRow; s++) {
          let category: SeatCategory = SeatCategory.STANDARD;
          if (r === 0) category = SeatCategory.VIP;
          else if (r <= 2) category = SeatCategory.PREMIUM;

          seatRecords.push({
            venueId: venue.id,
            rowLabel,
            seatNumber: s,
            category,
            isDisabled: false,
          });
        }
      }
    }

    await tx.seat.createMany({
      data: seatRecords,
    });

    return tx.venue.findUnique({
      where: { id: venue.id },
      include: {
        seats: {
          orderBy: [{ rowLabel: 'asc' }, { seatNumber: 'asc' }],
        },
      },
    });
  });
};

export const updateVenue = async (
  venueId: string,
  data: Partial<CreateVenueDTO>
) => {
  const venue = await prisma.venue.findUnique({ where: { id: venueId } });
  if (!venue) {
    throw new AppError('Venue not found', 404);
  }

  return await prisma.$transaction(async (tx) => {
    const updatedVenue = await tx.venue.update({
      where: { id: venueId },
      data: {
        name: data.name ?? venue.name,
        address: data.address ?? venue.address,
        city: data.city ?? venue.city,
        totalRows: data.totalRows ?? venue.totalRows,
        seatsPerRow: data.seatsPerRow ?? venue.seatsPerRow,
      },
    });

    if (data.seats) {
      // Re-create seats layout
      await tx.seat.deleteMany({ where: { venueId } });
      const seatRecords = data.seats.map((seat) => ({
        venueId,
        rowLabel: seat.rowLabel,
        seatNumber: seat.seatNumber,
        category: seat.category,
        isDisabled: seat.isDisabled || false,
      }));
      await tx.seat.createMany({ data: seatRecords });
    }

    return tx.venue.findUnique({
      where: { id: venueId },
      include: { seats: { orderBy: [{ rowLabel: 'asc' }, { seatNumber: 'asc' }] } },
    });
  });
};

export const getVenues = async () => {
  return prisma.venue.findMany({
    include: {
      _count: {
        select: { seats: true, events: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

export const getVenueById = async (venueId: string) => {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: {
      seats: {
        orderBy: [{ rowLabel: 'asc' }, { seatNumber: 'asc' }],
      },
    },
  });

  if (!venue) {
    throw new AppError('Venue not found', 404);
  }

  return venue;
};

export const deleteVenue = async (venueId: string) => {
  const venue = await prisma.venue.findUnique({
    where: { id: venueId },
    include: { _count: { select: { events: true } } },
  });

  if (!venue) {
    throw new AppError('Venue not found', 404);
  }

  if (venue._count.events > 0) {
    throw new AppError('Cannot delete venue that has associated events', 400);
  }

  await prisma.venue.delete({ where: { id: venueId } });
  return { message: 'Venue deleted successfully' };
};
