import { Router } from 'express';
import * as settingsController from '../controllers/settingsController';

const router = Router();

router.get('/all', settingsController.getAllSettings);
router.get('/', settingsController.getSettings);
router.post('/', settingsController.saveSettings);
router.delete('/', settingsController.deleteSettings);

export default router;