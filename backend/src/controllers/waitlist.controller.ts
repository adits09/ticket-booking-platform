import { Request, Response, NextFunction } from 'express';
import * as waitlistService from '../services/waitlist.service';
import { AuthRequest } from '../middleware/auth';
import { SeatCategory } from '@prisma/client';

export const joinWaitlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // eventId
    const { category } = req.body;
    if (!category) {
      return res.status(400).json({ error: 'Seat category is required' });
    }

    const result = await waitlistService.joinWaitlist(
      id,
      category as SeatCategory,
      req.user!.userId
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const getWaitlistStatus = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params; // eventId
    const status = await waitlistService.getWaitlistStatus(id, req.user!.userId);
    res.status(200).json(status);
  } catch (err) {
    next(err);
  }
};

export const getUserWaitlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const entries = await waitlistService.getUserWaitlistEntries(req.user!.userId);
    res.status(200).json(entries);
  } catch (err) {
    next(err);
  }
};

export const getOfferByToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const offer = await waitlistService.getOfferByToken(token);
    res.status(200).json(offer);
  } catch (err) {
    next(err);
  }
};

export const acceptOffer = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { token } = req.params;
    const result = await waitlistService.acceptWaitlistOffer(token, req.user!.userId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
