import { Router } from 'express';
import * as waitlistController from '../controllers/waitlist.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/events/:id/waitlist', authenticate, waitlistController.joinWaitlist);
router.get('/events/:id/waitlist/status', authenticate, waitlistController.getWaitlistStatus);
router.get('/waitlist/my-entries', authenticate, waitlistController.getUserWaitlist);
router.get('/waitlist/offers/:token', waitlistController.getOfferByToken);
router.post('/waitlist/offers/:token/accept', authenticate, waitlistController.acceptOffer);

export default router;
