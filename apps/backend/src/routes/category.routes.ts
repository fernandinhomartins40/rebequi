/**
 * Category Routes
 * Product category endpoints
 */

import { Router } from 'express';
import { getRolesForMerchantPermission } from '@rebequi/shared/constants';
import { CategoryController } from '../controllers/category.controller.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { createCategorySchema, updateCategorySchema } from '@rebequi/shared/schemas';

const router: Router = Router();
const categoryController = new CategoryController();
const catalogRoles = getRolesForMerchantPermission('catalog:manage');

// Public routes
router.get('/', categoryController.getAll);
router.get('/:id', categoryController.getById);
router.get('/slug/:slug', categoryController.getBySlug);

// Admin routes
router.post(
  '/',
  authenticate,
  authorize(...catalogRoles),
  validateBody(createCategorySchema),
  categoryController.create
);

router.put(
  '/:id',
  authenticate,
  authorize(...catalogRoles),
  validateBody(updateCategorySchema),
  categoryController.update
);

router.delete('/:id', authenticate, authorize(...catalogRoles), categoryController.delete);

export default router;
