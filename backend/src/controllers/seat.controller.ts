import { Request, Response, NextFunction } from 'express';
import * as seatService from '../services/seat.service';
import { AuthRequest } from '../middleware/auth';

export const getEventSeats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const currentUserId = (req as AuthRequest).user?.userId;
    const seats = await seatService.getEventSeats(id, currentUserId);
    res.status(200).json(seats);
  } catch (err) {
    next(err);
  }
};

export const createSeatHold = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // eventId
    const { eventSeatIds, ttlMinutes } = req.body;
    if (!eventSeatIds || !Array.isArray(eventSeatIds) || eventSeatIds.length === 0) {
      return res.status(400).json({ error: 'eventSeatIds must be a non-empty array' });
    }

    const hold = await seatService.createSeatHold(
      id,
      eventSeatIds,
      req.user!.userId,
      ttlMinutes
    );
    res.status(201).json(hold);
  } catch (err) {
    next(err);
  }
};

export const releaseSeatHold = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { holdId } = req.params;
    const result = await seatService.releaseSeatHold(holdId, req.user!.userId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
