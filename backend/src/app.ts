import express from 'express';
import cors from 'cors';
import { config } from './config';
import authRoutes from './routes/auth.routes';
import venueRoutes from './routes/venue.routes';
import eventRoutes from './routes/event.routes';
import seatRoutes from './routes/seat.routes';
import bookingRoutes from './routes/booking.routes';
import waitlistRoutes from './routes/waitlist.routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/auth', authRoutes);
app.use('/venues', venueRoutes);
app.use('/events', eventRoutes);
app.use('/', seatRoutes);
app.use('/bookings', bookingRoutes);
app.use('/', waitlistRoutes);

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
