import { Router } from 'express';
import { getRolesForMerchantPermission } from '@rebequi/shared/constants';
import { quoteAiTestSchema, quoteAiUpdateSchema } from '@rebequi/shared/schemas';
import { upload } from '../config/multer.js';
import { IntegrationController } from '../controllers/integration.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { uploadLimiter } from '../middleware/rate-limit.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { z } from 'zod';
import { getMarketplaceSettings, saveMarketplaceSettings } from '../services/marketplace-settings.service.js';
import type { MarketplaceType } from '@rebequi/shared/constants';

const router: Router = Router();
const controller = new IntegrationController();
const allowedRoles = getRolesForMerchantPermission('integrations:manage');

router.get('/marketplaces', authenticate, authorize(...allowedRoles), async (_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try { res.json({ success: true, data: await getMarketplaceSettings() }); }
  catch (error) { next(error); }
});
router.put('/marketplaces/:type', authenticate, authorize(...allowedRoles),
  validateBody(z.object({ channelId: z.string().min(1).max(128).optional(), isActive: z.boolean().optional(), credentials: z.record(z.string().max(64), z.string().max(4096).nullable()) }).strict()),
  async (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    try { res.json({ success: true, data: await saveMarketplaceSettings(req.params.type as MarketplaceType, req.user!.userId, req.body) }); }
    catch (error) { next(error); }
  });

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
