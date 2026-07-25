import { Router } from 'express';
import { getRolesForMerchantPermission } from '@rebequi/shared/constants';
import { openRouterTestSchema, openRouterUpdateSchema } from '@rebequi/shared/schemas';
import { upload } from '../config/multer.js';
import { IntegrationController } from '../controllers/integration.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { uploadLimiter } from '../middleware/rate-limit.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';

const router: Router = Router();
const controller = new IntegrationController();
const allowedRoles = getRolesForMerchantPermission('integrations:manage');

router.get(
  '/openrouter',
  authenticate,
  authorize(...allowedRoles),
  controller.getOpenRouter
);

router.put(
  '/openrouter',
  authenticate,
  authorize(...allowedRoles),
  validateBody(openRouterUpdateSchema),
  controller.updateOpenRouter
);

router.get(
  '/openrouter/models',
  authenticate,
  authorize(...allowedRoles),
  controller.listVisionModels
);

router.post(
  '/openrouter/test-recognition',
  authenticate,
  authorize(...allowedRoles),
  uploadLimiter,
  upload.single('document'),
  controller.testRecognition
);

router.post(
  '/openrouter/test',
  authenticate,
  authorize(...allowedRoles),
  validateBody(openRouterTestSchema),
  controller.testOpenRouter
);

export default router;
