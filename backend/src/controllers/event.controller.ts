import { Request, Response, NextFunction } from 'express';
import * as eventService from '../services/event.service';
import { AuthRequest } from '../middleware/auth';
import { EventType } from '@prisma/client';

export const getEvents = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { eventType, date, venueId, search } = req.query;
    const events = await eventService.getEvents({
      eventType: eventType as EventType,
      date: date as string,
      venueId: venueId as string,
      search: search as string,
    });
    res.status(200).json(events);
  } catch (err) {
    next(err);
  }
};

export const getEventById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    res.status(200).json(event);
  } catch (err) {
    next(err);
  }
};

export const createEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { title, description, eventType, date, startTime, endTime, posterUrl, venueId, categoryPrices } = req.body;
    if (!title || !eventType || !date || !startTime || !venueId) {
      return res.status(400).json({ error: 'Missing required event fields' });
    }

    const event = await eventService.createEvent({
      title,
      description,
      eventType,
      date,
      startTime,
      endTime,
      posterUrl,
      venueId,
      categoryPrices,
      organiserId: req.user!.userId,
    });
    res.status(201).json(event);
  } catch (err) {
    next(err);
  }
};

export const updateEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const event = await eventService.updateEvent(
      req.params.id,
      req.body,
      req.user!.userId,
      req.user!.role
    );
    res.status(200).json(event);
  } catch (err) {
    next(err);
  }
};

export const cancelEvent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = await eventService.cancelEvent(
      req.params.id,
      req.user!.userId,
      req.user!.role
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};

export const getOrganiserEvents = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const events = await eventService.getOrganiserEvents(req.user!.userId);
    res.status(200).json(events);
  } catch (err) {
    next(err);
  }
};
