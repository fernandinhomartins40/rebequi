/**
 * Routes Index
 * Aggregate all routes
 */

import { Router } from 'express';
import authRoutes from './auth.routes.js';
import categoryRoutes from './category.routes.js';
import productRoutes from './product.routes.js';
import promotionRoutes from './promotion.routes.js';
import quoteRoutes from './quote.routes.js';
import healthRoutes from './health.routes.js';

const router: Router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/promotions', promotionRoutes);
router.use('/quotes', quoteRoutes);
router.use('/health', healthRoutes);

export default router;
