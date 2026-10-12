/**
 * Product Routes
 * E-commerce product endpoints
 */

import { Router } from 'express';
import { getRolesForMerchantPermission } from '@rebequi/shared/constants';
import { ProductController } from '../controllers/product.controller.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { requireTrustedOrigin } from '../middleware/trusted-origin.middleware.js';
import { createProductSchema, updateProductSchema, technicalSpecSchema } from '@rebequi/shared/schemas';
import { getTechnicalSpec, saveTechnicalSpec } from '../services/partner-project.service.js';
import { successResponse } from '../utils/response.util.js';
import { upload } from '../config/multer.js';
import { uploadLimiter } from '../middleware/rate-limit.middleware.js';

const router: Router = Router();
const productController = new ProductController();
const catalogRoles = getRolesForMerchantPermission('catalog:manage');
const catalogReadRoles = getRolesForMerchantPermission('catalog:read');

// Public routes
router.get('/', productController.getAll);
router.get('/promotional', productController.getPromotional);
router.get('/new', productController.getNew);
router.get('/featured', productController.getFeatured);
router.get('/category/:categorySlug', productController.getByCategory);
router.get('/slug/:slug', productController.getBySlug);

// Admin read routes
router.get('/admin/list', authenticate, authorize(...catalogReadRoles), productController.getAdminAll);
router.get('/admin/:id/technical-spec', authenticate, authorize(...catalogReadRoles), async (req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try { successResponse(res, await getTechnicalSpec(req.params.id)); } catch (error) { next(error); }
});
router.put('/admin/:id/technical-spec', authenticate, authorize(...catalogRoles), requireTrustedOrigin, validateBody(technicalSpecSchema), async (req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try { successResponse(res, await saveTechnicalSpec(req.params.id, req.user!.userId, req.body)); } catch (error) { next(error); }
});

// Admin routes
router.post(
  '/images/upload',
  authenticate,
  authorize(...catalogRoles),
  uploadLimiter,
  upload.single('image'),
  productController.uploadImage
);

router.post(
  '/',
  authenticate,
  authorize(...catalogRoles),
  validateBody(createProductSchema),
  productController.create
);

router.put(
  '/:id',
  authenticate,
  authorize(...catalogRoles),
  validateBody(updateProductSchema),
  productController.update
);

router.delete('/:id', authenticate, authorize(...catalogRoles), productController.delete);
router.get('/:id', productController.getById);

export default router;
