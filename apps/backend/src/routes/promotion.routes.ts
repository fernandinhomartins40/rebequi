import { Router } from 'express';
import { createPromotionSchema, updatePromotionSchema } from '@rebequi/shared/schemas';
import { PromotionController } from '../controllers/promotion.controller.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { upload } from '../config/multer.js';
import { uploadLimiter } from '../middleware/rate-limit.middleware.js';

const router: Router = Router();
const promotionController = new PromotionController();

router.get('/', promotionController.getPublicAll);
router.get('/slug/:slug', promotionController.getPublicBySlug);
router.get('/admin/list', authenticate, authorize('ADMIN'), promotionController.getAdminAll);

router.post(
  '/images/upload',
  authenticate,
  authorize('ADMIN'),
  uploadLimiter,
  upload.single('image'),
  promotionController.uploadImage,
);

router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validateBody(createPromotionSchema),
  promotionController.create,
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validateBody(updatePromotionSchema),
  promotionController.update,
);

router.delete('/:id', authenticate, authorize('ADMIN'), promotionController.delete);

export default router;
