/**
 * Product Routes
 * E-commerce product endpoints
 */

import { Router } from 'express';
import { ProductController } from '../controllers/product.controller.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { createProductSchema, updateProductSchema } from '@rebequi/shared/schemas';

const router = Router();
const productController = new ProductController();

// Public routes
router.get('/', productController.getAll);
router.get('/promotional', productController.getPromotional);
router.get('/new', productController.getNew);
router.get('/featured', productController.getFeatured);
router.get('/category/:categorySlug', productController.getByCategory);
router.get('/slug/:slug', productController.getBySlug);
router.get('/:id', productController.getById);

// Admin routes
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validateBody(createProductSchema),
  productController.create
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validateBody(updateProductSchema),
  productController.update
);

router.delete('/:id', authenticate, authorize('ADMIN'), productController.delete);

export default router;
