import { Router } from 'express';
import * as venueController from '../controllers/venue.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', venueController.getVenues);
router.get('/:id', venueController.getVenueById);
router.post('/', authenticate, authorize([Role.ADMIN]), venueController.createVenue);
router.patch('/:id', authenticate, authorize([Role.ADMIN]), venueController.updateVenue);
router.delete('/:id', authenticate, authorize([Role.ADMIN]), venueController.deleteVenue);

export default router;
