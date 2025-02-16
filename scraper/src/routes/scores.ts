import { Router } from 'express';
import * as scoresController from '../controllers/scoresController';

const router = Router();

router.get('/known/:url', scoresController.getKnownScores);
router.get('/unknown/:url', scoresController.getUnknownScores);

export default router;