import { Router } from 'express';
import { getRolesForMerchantPermission } from '@rebequi/shared/constants';
import { openRouterTestSchema, openRouterUpdateSchema } from '@rebequi/shared/schemas';
import { IntegrationController } from '../controllers/integration.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
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

router.post(
  '/openrouter/test',
  authenticate,
  authorize(...allowedRoles),
  validateBody(openRouterTestSchema),
  controller.testOpenRouter
);

export default router;
