import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categoriesController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

export const categoriesRouter = Router();

/**
 * Public routes
 */

// GET /api/categories - Get all categories
categoriesRouter.get('/', getCategories);

// GET /api/categories/slug/:slug - Get category by slug
categoriesRouter.get('/slug/:slug', getCategoryBySlug);

// GET /api/categories/:id - Get category by ID
categoriesRouter.get('/:id', getCategoryById);

/**
 * Protected routes - ADMIN only
 */

// POST /api/categories - Create new category
categoriesRouter.post('/', authenticateToken, requireAdmin, createCategory);

// PUT /api/categories/:id - Update category
categoriesRouter.put('/:id', authenticateToken, requireAdmin, updateCategory);

// DELETE /api/categories/:id - Delete category (soft delete)
categoriesRouter.delete(
  '/:id',
  authenticateToken,
  requireAdmin,
  deleteCategory
);
