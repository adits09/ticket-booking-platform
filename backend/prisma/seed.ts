import { PrismaClient, Role, EventType, SeatCategory, SeatStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Create Users
  const passwordHash = await bcrypt.hash('password123', 10);
  const adminPasswordHash = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      passwordHash: adminPasswordHash,
      name: 'System Admin',
      role: Role.ADMIN,
    },
  });

  const organiser = await prisma.user.upsert({
    where: { email: 'organiser@example.com' },
    update: {},
    create: {
      email: 'organiser@example.com',
      passwordHash,
      name: 'Cinema Events Corp',
      role: Role.ORGANISER,
    },
  });

  const customer1 = await prisma.user.upsert({
    where: { email: 'customer1@example.com' },
    update: {},
    create: {
      email: 'customer1@example.com',
      passwordHash,
      name: 'Alice Johnson',
      role: Role.CUSTOMER,
    },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: 'customer2@example.com' },
    update: {},
    create: {
      email: 'customer2@example.com',
      passwordHash,
      name: 'Bob Smith',
      role: Role.CUSTOMER,
    },
  });

  console.log('✅ Users seeded successfully!');

  // 2. Create Venue: Grand Cinema Screen 1
  const venue1 = await prisma.venue.create({
    data: {
      name: 'Grand Cinema Screen 1',
      address: '100 Entertainment Blvd, Tech City',
      city: 'San Francisco',
      totalRows: 6,
      seatsPerRow: 10,
    },
  });

  // Generate venue 1 seats:
  // Row A: VIP (10 seats)
  // Row B, C: PREMIUM (20 seats)
  // Row D, E, F: STANDARD (30 seats)
  const seatsData1 = [];
  for (let r = 0; r < 6; r++) {
    const rowLabel = String.fromCharCode(65 + r); // A to F
    let category = SeatCategory.STANDARD;
    if (r === 0) category = SeatCategory.VIP;
    else if (r <= 2) category = SeatCategory.PREMIUM;

    for (let s = 1; s <= 10; s++) {
      seatsData1.push({
        venueId: venue1.id,
        rowLabel,
        seatNumber: s,
        category,
        isDisabled: false,
      });
    }
  }
  await prisma.seat.createMany({ data: seatsData1 });
  const venue1Seats = await prisma.seat.findMany({ where: { venueId: venue1.id } });

  // 3. Create Venue 2: Starlight Amphitheatre
  const venue2 = await prisma.venue.create({
    data: {
      name: 'Starlight Amphitheatre',
      address: '500 Music Drive, Bay Area',
      city: 'San Jose',
      totalRows: 4,
      seatsPerRow: 8,
    },
  });

  const seatsData2 = [];
  for (let r = 0; r < 4; r++) {
    const rowLabel = String.fromCharCode(65 + r); // A to D
    let category = SeatCategory.STANDARD;
    if (r === 0) category = SeatCategory.VIP;
    else if (r === 1) category = SeatCategory.PREMIUM;

    for (let s = 1; s <= 8; s++) {
      seatsData2.push({
        venueId: venue2.id,
        rowLabel,
        seatNumber: s,
        category,
        isDisabled: false,
      });
    }
  }
  await prisma.seat.createMany({ data: seatsData2 });
  const venue2Seats = await prisma.seat.findMany({ where: { venueId: venue2.id } });

  console.log('✅ Venues & Seat layouts seeded successfully!');

  // 4. Create Sample Movie Event: "Avengers: Secret Wars"
  const eventDate1 = new Date();
  eventDate1.setDate(eventDate1.getDate() + 7); // 7 days from now

  const movieEvent = await prisma.event.create({
    data: {
      title: 'Avengers: Secret Wars',
      description: 'The ultimate superhero showdown on IMAX 3D. Experience epic battle scenes and stunning visual effects.',
      eventType: EventType.MOVIE,
      date: eventDate1,
      startTime: '19:00',
      endTime: '22:15',
      posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
      venueId: venue1.id,
      organiserId: organiser.id,
      categoryPrices: { VIP: 500, PREMIUM: 350, STANDARD: 200 },
    },
  });

  // Populate event seats
  const movieEventSeats = venue1Seats.map((seat) => {
    let price = 200;
    if (seat.category === SeatCategory.VIP) price = 500;
    if (seat.category === SeatCategory.PREMIUM) price = 350;

    return {
      eventId: movieEvent.id,
      seatId: seat.id,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      category: seat.category,
      price,
      status: SeatStatus.AVAILABLE,
    };
  });
  await prisma.eventSeat.createMany({ data: movieEventSeats });

  // 5. Create Sample Concert Event: "Coldplay: Music of the Spheres"
  const eventDate2 = new Date();
  eventDate2.setDate(eventDate2.getDate() + 14);

  const concertEvent = await prisma.event.create({
    data: {
      title: 'Coldplay: Music of the Spheres',
      description: 'A spectacular live concert filled with hit songs, laser lights, and wristbands that glow in unison.',
      eventType: EventType.CONCERT,
      date: eventDate2,
      startTime: '20:00',
      endTime: '23:00',
      posterUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&w=800&q=80',
      venueId: venue2.id,
      organiserId: organiser.id,
      categoryPrices: { VIP: 1200, PREMIUM: 850, STANDARD: 500 },
    },
  });

  const concertEventSeats = venue2Seats.map((seat) => {
    let price = 500;
    if (seat.category === SeatCategory.VIP) price = 1200;
    if (seat.category === SeatCategory.PREMIUM) price = 850;

    return {
      eventId: concertEvent.id,
      seatId: seat.id,
      rowLabel: seat.rowLabel,
      seatNumber: seat.seatNumber,
      category: seat.category,
      price,
      status: SeatStatus.AVAILABLE,
    };
  });
  await prisma.eventSeat.createMany({ data: concertEventSeats });

  console.log('✅ Events & Event Seats seeded successfully!');

  // 6. Create Initial System Settings
  await prisma.systemSetting.upsert({
    where: { key: 'SEAT_HOLD_TTL_MINUTES' },
    update: { value: '10' },
    create: { key: 'SEAT_HOLD_TTL_MINUTES', value: '10' },
  });

  await prisma.systemSetting.upsert({
    where: { key: 'WAITLIST_OFFER_TTL_MINUTES' },
    update: { value: '10' },
    create: { key: 'WAITLIST_OFFER_TTL_MINUTES', value: '10' },
  });

  console.log('🌱 Database seeding completed successfully!\n');
  console.log('================ DEMO ACCOUNTS ================');
  console.log('Admin:     admin@example.com     / admin123');
  console.log('Organiser: organiser@example.com / password123');
  console.log('Customer1: customer1@example.com / password123');
  console.log('Customer2: customer2@example.com / password123');
  console.log('===============================================');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
