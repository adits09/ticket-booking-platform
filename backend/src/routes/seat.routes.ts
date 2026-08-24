import { Router } from 'express';
import * as seatController from '../controllers/seat.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/events/:id/seats', seatController.getEventSeats);
router.post('/events/:id/holds', authenticate, seatController.createSeatHold);
router.delete('/holds/:holdId', authenticate, seatController.releaseSeatHold);

export default router;
