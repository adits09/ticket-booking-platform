import { Request, Response, NextFunction } from 'express';
import * as venueService from '../services/venue.service';

export const getVenues = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venues = await venueService.getVenues();
    res.status(200).json(venues);
  } catch (err) {
    next(err);
  }
};

export const getVenueById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venue = await venueService.getVenueById(req.params.id);
    res.status(200).json(venue);
  } catch (err) {
    next(err);
  }
};

export const createVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, address, city, totalRows, seatsPerRow, seats } = req.body;
    if (!name || !address || !city || !totalRows || !seatsPerRow) {
      return res.status(400).json({ error: 'Missing required venue fields' });
    }
    const venue = await venueService.createVenue({
      name,
      address,
      city,
      totalRows: parseInt(totalRows, 10),
      seatsPerRow: parseInt(seatsPerRow, 10),
      seats,
    });
    res.status(201).json(venue);
  } catch (err) {
    next(err);
  }
};

export const updateVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const venue = await venueService.updateVenue(req.params.id, req.body);
    res.status(200).json(venue);
  } catch (err) {
    next(err);
  }
};

export const deleteVenue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await venueService.deleteVenue(req.params.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
};
