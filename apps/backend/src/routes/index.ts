/**
 * Routes Index
 * Aggregate all routes
 */

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import healthRoutes from './health.routes.js';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/health', healthRoutes);

export default router;
