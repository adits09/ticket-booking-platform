# Ticket Booking Platform — System Design Document

## 1. Seat Hold and TTL Mechanism
To prevent overbooking while guaranteeing a seamless checkout experience, the platform implements temporary seat holds backed by explicit database TTL timestamps. When a customer selects seats, the backend creates an active `SeatHold` entity associated with a configurable expiration time (`expiresAt = NOW() + SEAT_HOLD_TTL_MINUTES`). 

Rather than relying on brittle client-side timers or passive database cleanup, TTL expiration is enforced at two distinct layers:
1. **Dynamic Query-Time Evaluation**: Every seat query dynamically checks whether an active hold has exceeded its `expiresAt` timestamp. Expired holds are treated as `AVAILABLE` immediately on read operations, eliminating stale hold locks even if background cleanup is delayed.
2. **Background Cron Worker**: A dedicated background service polls active holds every 5 seconds, transitioning expired records from `ACTIVE` to `EXPIRED`, resetting event seats to `AVAILABLE`, and emitting real-time WebSocket events.

## 2. Concurrency Prevention
High-demand event ticketing requires absolute guarantees against double-booking and race conditions (e.g., two users clicking the exact same seat simultaneously).

We prevent race conditions at the database level using PostgreSQL pessimistic row-level locking via `SELECT ... FOR UPDATE`:
```sql
SELECT es.id, es.status, es.hold_id 
FROM "EventSeat" es 
WHERE es.id = ANY($1) AND es.event_id = $2 
FOR UPDATE;
```
During hold creation and final booking conversion, target seat rows are locked within an isolated database transaction. If User A and User B simultaneously attempt to hold seat `A10`:
- User A's transaction acquires the row lock first. User B's request blocks until User A's transaction completes.
- Once User A's transaction commits with status `HELD`, User B's transaction resumes, reads status `HELD`, and fails immediately with HTTP 409 Conflict.
- At final checkout, hold ownership and TTL validity are verified inside a second `FOR UPDATE` transaction, ensuring no two users can ever be granted confirmed bookings for the same physical seat.

## 3. Seat Data Model
To decouple physical venue layouts from event-specific inventory, the database schema separates reusable venue configurations from event seat instances:
- **`Venue` & `Seat`**: Defines physical architecture (`venueId`, `rowLabel`, `seatNumber`, default `category` such as `VIP`, `PREMIUM`, `STANDARD`). Reusable across multiple shows.
- **`Event` & `EventSeat`**: Represents show-specific inventory created upon event initialization. Each `EventSeat` references its underlying `Seat` and tracks show-specific status (`AVAILABLE`, `HELD`, `BOOKED`), event-specific category pricing, active `holdId`, and optimistic concurrency `version`.

## 4. Real-Time Seat Status
The application utilizes WebSockets via Socket.IO to broadcast instantaneous seat state mutations across all connected clients viewing a given event room. 
- When any customer holds, releases, or books seats—or when a background worker expires a hold—the server broadcasts a `seats_updated` payload containing affected seat IDs and new statuses.
- Client browsers receive these state updates in real time, updating the visual seat map DOM without requiring manual page reloads.

## 5. Waitlist Auto-Assignment
When an event or seat category sells out, customers can join a FIFO waitlist queue (`WaitlistEntry`).
- Waitlist entries are ordered strictly by creation timestamp and position per `(eventId, category)`.
- Upon booking cancellation or seat hold release, the system checks for pending waitlist entries in that category.
- If an entry exists, the seat is automatically assigned to the position-1 customer, initiating a time-limited waitlist offer.

## 6. Time-Limited Waitlist Offers
Waitlist seat allocations generate a `WaitlistOffer` containing a cryptographically secure, unguessable token (`crypto.randomBytes(32)`) and an offer expiration timestamp.
- The customer receives an email notification with a unique claim link (`/waitlist/offer?token=...`).
- When the customer accesses the link, the token is verified. Upon acceptance (`POST /waitlist/offers/:token/accept`), the offer converts into an active `SeatHold` under the customer's account, allowing them to proceed directly to checkout.
- If the offer expires before acceptance, the background worker marks the offer as `EXPIRED` and automatically re-assigns the seat to the next customer in the FIFO waitlist queue.

## 7. QR Code and Email Flow
Upon successful payment, the backend constructs a confirmed `Booking` record with a unique human-readable reference (`BOOK-2026-XXXXXX`).
- A high-density QR code is generated server-side using the `qrcode` library, encoding the booking reference into a base64 Data URL.
- An HTML confirmation email embedded with the QR ticket image and show details is dispatched asynchronously via Nodemailer (supporting both production SMTP and development console logging).

## 8. Key Architectural Decisions
- **TypeScript Full-Stack**: Enforces end-to-end type safety across backend API DTOs and frontend React state.
- **PostgreSQL & Prisma ORM**: Combines the developer ergonomics of Prisma with raw SQL capabilities for explicit pessimistic `FOR UPDATE` locking.
- **Vite & Tailwind CSS**: Delivers a highly responsive, modern visual seat map interface with visual status indicators, countdown banners, and category pricing legends.
