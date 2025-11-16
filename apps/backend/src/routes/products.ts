import { Router } from 'express';
import {
  getProducts,
  getProductById,
  getProductsByCategory,
  getPromotionalProducts,
  getNewProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  addProductImages,
  deleteProductImage,
} from '../controllers/productsController.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

export const productsRouter = Router();

/**
 * Public routes
 */

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

/**
 * Protected routes - ADMIN only
 */

// POST /api/products - Create new product
productsRouter.post('/', authenticateToken, requireAdmin, createProduct);

// PUT /api/products/:id - Update product
productsRouter.put('/:id', authenticateToken, requireAdmin, updateProduct);

// DELETE /api/products/:id - Delete product (soft delete)
productsRouter.delete('/:id', authenticateToken, requireAdmin, deleteProduct);

// POST /api/products/:id/images - Add images to product
productsRouter.post(
  '/:id/images',
  authenticateToken,
  requireAdmin,
  addProductImages
);

// DELETE /api/products/:id/images/:imageId - Delete product image
productsRouter.delete(
  '/:id/images/:imageId',
  authenticateToken,
  requireAdmin,
  deleteProductImage
);
