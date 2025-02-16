import { Router } from 'express';
import { getEventsStream, getEvents } from '../controllers/eventsController';

const router = Router();

router.get('/stream', getEventsStream);
router.get('/', getEvents);

export default router;