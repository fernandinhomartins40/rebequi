/**
 * Health Routes
 * System health check endpoints
 */

import { Router } from 'express';
import { HealthController } from '../controllers/health.controller.js';

const router: Router = Router();
const healthController = new HealthController();

router.get('/', healthController.check);
router.get('/detailed', healthController.detailedCheck);

export default router;
