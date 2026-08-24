# Production-Ready Ticket Booking Platform End-to-End

A full-stack, production-quality ticket booking platform for movies and concerts built with Node.js, Express, TypeScript, PostgreSQL, Prisma, React, Tailwind CSS, and WebSockets.

---

## 🌐 Live Production Deployment
- 💻 **Live Frontend Application**: [https://ticket-booking-platform-frontend-a6di08fg0.vercel.app](https://ticket-booking-platform-frontend-a6di08fg0.vercel.app)
- ⚡ **Live Backend API**: [https://ticket-booking-platform-ioa0.onrender.com](https://ticket-booking-platform-ioa0.onrender.com)
- 🐘 **Cloud PostgreSQL Database**: Neon.tech Managed Database Cluster

---

## 1. Project Overview
High-demand events sell out instantly, leaving customers frustrated by race conditions and unhandled cancellations. This platform provides:
- Interactive visual seat maps with real-time seat availability syncing across clients.
- Concurrency-protected temporary seat holds with automatic TTL expiration.
- Automated FIFO waitlists that reallocate cancelled tickets to waiting customers via secure, expirable tokenized email offers.
- Instant QR-code ticket generation and automated email delivery.

---

## 2. Features
- **Visual Interactive Seat Map**: Real-time visual representation of seats (VIP, PREMIUM, STANDARD), category pricing legends, row labels, and status indicators (Available, Selected, Held by You, Held by Other, Booked).
- **Atomic Seat Holds & TTL**: 10-minute configurable hold timer backed by database row locking (`SELECT FOR UPDATE`) and background cleanup worker.
- **Concurrency Safety**: Guarantees zero double-booking even under simultaneous parallel checkout requests.
- **Automated Waitlists**: FIFO queue per event and seat category with automated cancellation re-assignment and time-limited token offers.
- **Digital QR Tickets**: Instant QR code generation encoding unique booking references (`BOOK-2026-XXXXXX`).
- **Email Notifications**: Asynchronous email delivery with mock development mode and production SMTP support.
- **Role-Based Access Control (RBAC)**: Distinct permissions for `ADMIN`, `ORGANISER`, and `CUSTOMER`.
- **Admin Seat Layout Builder**: Practical visual grid layout designer for defining venue rows, seats, and category assignments.
- **Organiser Analytics**: Revenue breakdowns, total tickets sold, capacity metrics, and occupancy percentages.

---

## 3. Tech Stack
- **Backend**: Node.js, Express, TypeScript, Socket.IO, Prisma ORM, Nodemailer, QRCode, JWT, bcryptjs, Vitest.
- **Frontend**: React, Vite, TypeScript, Tailwind CSS, Lucide Icons, Socket.IO Client.
- **Database**: PostgreSQL (with pessimistic `FOR UPDATE` transaction locks).
- **DevOps / Infrastructure**: Docker Compose, Dotenv.

---

## 4. Architecture
```
┌─────────────────────────────────────────────────────────┐
│                     React Frontend                      │
│        (Visual Seat Map, Socket.IO Client, Tailwind)    │
└────────────────────────────┬────────────────────────────┘
                             │ REST API / WebSockets
┌────────────────────────────▼────────────────────────────┐
│                  Express + TS API Server                │
│       (JWT Auth, Seat Locks, Booking Controller)        │
└──────┬─────────────────────┬─────────────────────┬──────┘
       │ Prisma              │ Cron Worker         │ Async
┌──────▼──────┐       ┌──────▼──────┐       ┌──────▼──────┐
│ PostgreSQL  │       │ Background  │       │ QR / Email  │
│ Database    │       │ Hold Expiry │       │ Dispatcher  │
└─────────────┘       └─────────────┘       └─────────────┘
```

---

## 5. Setup Instructions
### Prerequisites
- Node.js >= v18
- Docker & Docker Compose (or local PostgreSQL 15 instance)

### 1. Clone & Install Dependencies
```bash
cd ticket_booking
npm install
```

---

## 6. Environment Variables
Copy `.env.example` to `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ticket_booking?schema=public"
PORT=5001
NODE_ENV=development
JWT_SECRET="super-secret-jwt-key-change-in-production-2026"
FRONTEND_URL="http://localhost:5173"
BACKEND_URL="http://localhost:5001"
SEAT_HOLD_TTL_MINUTES=10
WAITLIST_OFFER_TTL_MINUTES=10
EMAIL_MODE=mock
EMAIL_FROM="tickets@ticketbooking.com"
```

---

## 7. Database Setup & Migrations
Start local PostgreSQL container:
```bash
docker-compose up -d
```

Run database migrations and seed data:
```bash
npm run db:migrate
npm run db:seed
```

---

## 8. Running Locally
Start both backend and frontend concurrently:
```bash
# Terminal 1: Backend Server (http://localhost:5001)
npm run dev:backend

# Terminal 2: Frontend App (http://localhost:5173)
npm run dev:frontend
```

---

## 9. Demo Credentials
| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@example.com` | `admin123` |
| **Organiser** | `organiser@example.com` | `password123` |
| **Customer 1** | `customer1@example.com` | `password123` |
| **Customer 2** | `customer2@example.com` | `password123` |

---

## 10. API Documentation

### Authentication
- `POST /auth/register` - Create account (`email`, `password`, `name`, `role`).
- `POST /auth/login` - Authenticate & receive JWT token.
- `GET /auth/me` - Fetch current user profile.

### Venues (Admin)
- `GET /venues` - List all venues.
- `POST /venues` - Create venue & seat layout.
- `PATCH /venues/:id` - Edit venue.
- `DELETE /venues/:id` - Delete venue.

### Events
- `GET /events` - Search & filter events (`eventType`, `date`, `venueId`, `search`).
- `GET /events/:id` - Fetch event details & seat inventory.
- `POST /events` - Create event (Organiser/Admin).
- `DELETE /events/:id` - Cancel event.

### Seats & Holds
- `GET /events/:id/seats` - Fetch event seat map & live status.
- `POST /events/:id/holds` - Atomically hold selected seats with TTL.
- `DELETE /holds/:holdId` - Manually release held seats.

### Bookings
- `POST /bookings` - Convert active hold into confirmed booking & QR ticket.
- `GET /bookings` - Fetch user's booking history.
- `GET /bookings/:id` - Fetch booking ticket details.
- `POST /bookings/:id/cancel` - Cancel booking & trigger waitlist re-allocation.

### Waitlist
- `POST /events/:id/waitlist` - Join FIFO waitlist for sold-out category.
- `GET /events/:id/waitlist/status` - Check queue position.
- `GET /waitlist/offers/:token` - Inspect expirable waitlist offer.
- `POST /waitlist/offers/:token/accept` - Accept offer & claim seat hold.

---

## 11. Seat Hold Logic
1. When a customer selects seats, `POST /events/:id/holds` locks the target seats inside a database transaction using `SELECT FOR UPDATE`.
2. Verifies seats are currently available and creates a `SeatHold` with an explicit `expiresAt` timestamp (default 10 mins).
3. Holds are automatically released both dynamically on query time and via a 5-second background polling worker.

---

## 12. Waitlist Logic
1. Maintained per event and per seat category in strict FIFO order (`position`).
2. When a booking is cancelled or hold expires, the system queries for position 1 `WAITING` entry.
3. Generates a secure, expirable token `WaitlistOffer` valid for 10 minutes and emails the customer.
4. If expired without acceptance, the offer automatically passes to the next customer in queue.

---

## 13. QR Ticket & Email Delivery
- Bookings automatically generate a 300x300 PNG base64 QR code encoding the unique booking reference.
- Emails are dispatched asynchronously. In `development` / `mock` mode, email contents and claim links are printed cleanly to the server console.

---

## 14. Testing
Run the automated integration and concurrency test suite:
```bash
npm test
```
Includes parallel concurrency race tests, TTL hold expiry tests, double-booking prevention tests, and waitlist auto-assignment tests.

---

## 15. Deployment
- **Frontend**: Deploy `frontend/` to Vercel / Netlify.
- **Backend**: Deploy `backend/` to Render / Railway / Heroku.
- **Database**: Managed PostgreSQL on Neon / Supabase / Render PostgreSQL.

---

## 16. Known Limitations
- Payment processing is implemented as a production-structured mock provider. To connect real Stripe or Razorpay gateways, swap the mock payment token handler in `booking.service.ts`.
