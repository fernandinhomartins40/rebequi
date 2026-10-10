import { Router } from 'express';
import { getRolesForMerchantPermission } from '@rebequi/shared/constants';
import { quoteAiTestSchema, quoteAiUpdateSchema } from '@rebequi/shared/schemas';
import { upload } from '../config/multer.js';
import { IntegrationController } from '../controllers/integration.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { uploadLimiter } from '../middleware/rate-limit.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';

const router: Router = Router();
const controller = new IntegrationController();
const allowedRoles = getRolesForMerchantPermission('integrations:manage');

router.get(
  '/ai',
  authenticate,
  authorize(...allowedRoles),
  controller.getAi
);

router.put(
  '/ai',
  authenticate,
  authorize(...allowedRoles),
  validateBody(quoteAiUpdateSchema),
  controller.updateAi
);


router.post(
  '/ai/test-recognition',
  authenticate,
  authorize(...allowedRoles),
  uploadLimiter,
  upload.single('document'),
  controller.testRecognition
);

router.post(
  '/ai/test',
  authenticate,
  authorize(...allowedRoles),
  validateBody(quoteAiTestSchema),
  controller.testProvider
);

export default router;
