import { Router } from 'express';
import {
  getCategories,
  getCategoryById,
  getCategoryBySlug,
} from '../controllers/categoriesController.js';

export const categoriesRouter = Router();

// GET /api/categories - Get all categories
categoriesRouter.get('/', getCategories);

// GET /api/categories/slug/:slug - Get category by slug
categoriesRouter.get('/slug/:slug', getCategoryBySlug);

// GET /api/categories/:id - Get category by ID
categoriesRouter.get('/:id', getCategoryById);
