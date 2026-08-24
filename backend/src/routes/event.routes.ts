import { Router } from 'express';
import * as eventController from '../controllers/event.controller';
import { authenticate, authorize } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

router.get('/', eventController.getEvents);
router.get('/organiser/my-events', authenticate, authorize([Role.ORGANISER, Role.ADMIN]), eventController.getOrganiserEvents);
router.get('/:id', eventController.getEventById);
router.post('/', authenticate, authorize([Role.ORGANISER, Role.ADMIN]), eventController.createEvent);
router.patch('/:id', authenticate, authorize([Role.ORGANISER, Role.ADMIN]), eventController.updateEvent);
router.delete('/:id', authenticate, authorize([Role.ORGANISER, Role.ADMIN]), eventController.cancelEvent);

export default router;
