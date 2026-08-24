import { Response, NextFunction } from 'express';
import * as bookingService from '../services/booking.service';
import { AuthRequest } from '../middleware/auth';

export const createBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { eventId, holdId, paymentDetails } = req.body;
    if (!eventId || !holdId) {
      return res.status(400).json({ error: 'eventId and holdId are required' });
    }

    const booking = await bookingService.createBooking(req.user!.userId, {
      eventId,
      holdId,
      paymentDetails,
    });
    res.status(201).json(booking);
  } catch (err) {
    next(err);
  }
};

export const getUserBookings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const bookings = await bookingService.getUserBookings(req.user!.userId);
    res.status(200).json(bookings);
  } catch (err) {
    next(err);
  }
};

export const getBookingById = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const booking = await bookingService.getBookingById(
      req.params.id,
      req.user!.userId,
      req.user!.role
    );
    res.status(200).json(booking);
  } catch (err) {
    next(err);
  }
};

export const cancelBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await bookingService.cancelBooking(
      req.params.id,
      req.user!.userId,
      req.user!.role
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
