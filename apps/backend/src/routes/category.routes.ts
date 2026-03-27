/**
 * Category Routes
 * Product category endpoints
 */

import { Router } from 'express';
import { CategoryController } from '../controllers/category.controller.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { createCategorySchema, updateCategorySchema } from '@rebequi/shared/schemas';

const router: Router = Router();
const categoryController = new CategoryController();

// Public routes
router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);
router.get('/slug/:slug', categoryController.getBySlug);

// Admin routes
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validateBody(createCategorySchema),
  categoryController.create
);

router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validateBody(updateCategorySchema),
  categoryController.update
);

router.delete('/:id', authenticate, authorize('ADMIN'), categoryController.delete);

export default router;
