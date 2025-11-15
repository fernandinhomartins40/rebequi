import { Router } from 'express';
import {
  getProducts,
  getProductById,
  getProductsByCategory,
  getPromotionalProducts,
  getNewProducts,
} from '../controllers/productsController.js';

export const productsRouter = Router();

// GET /api/products - Get all products with filters
productsRouter.get('/', getProducts);

// GET /api/products/promotional - Get promotional products
productsRouter.get('/promotional', getPromotionalProducts);

// GET /api/products/new - Get new products
productsRouter.get('/new', getNewProducts);

// GET /api/products/category/:categorySlug - Get products by category
productsRouter.get('/category/:categorySlug', getProductsByCategory);

// GET /api/products/:id - Get product by ID
productsRouter.get('/:id', getProductById);
