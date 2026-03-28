import { Router } from 'express';
import { getRolesForMerchantPermission } from '@rebequi/shared/constants';
import { createPromotionSchema, updatePromotionSchema } from '@rebequi/shared/schemas';
import { PromotionController } from '../controllers/promotion.controller.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { upload } from '../config/multer.js';
import { uploadLimiter } from '../middleware/rate-limit.middleware.js';

const router: Router = Router();
const promotionController = new PromotionController();
const promotionRoles = getRolesForMerchantPermission('promotions:manage');

router.get('/', promotionController.getPublicAll);
router.get('/slug/:slug', promotionController.getPublicBySlug);
router.get('/admin/list', authenticate, authorize(...promotionRoles), promotionController.getAdminAll);

router.post(
  '/images/upload',
  authenticate,
  authorize(...promotionRoles),
  uploadLimiter,
  upload.single('image'),
  promotionController.uploadImage,
);

router.post(
  '/',
  authenticate,
  authorize(...promotionRoles),
  validateBody(createPromotionSchema),
  promotionController.create,
);

router.put(
  '/:id',
  authenticate,
  authorize(...promotionRoles),
  validateBody(updatePromotionSchema),
  promotionController.update,
);

router.delete('/:id', authenticate, authorize(...promotionRoles), promotionController.delete);

export default router;
