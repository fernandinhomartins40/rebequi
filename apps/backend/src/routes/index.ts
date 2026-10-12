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
import orderRoutes from './order.routes.js';
import saleRoutes from './sale.routes.js';
import customerRoutes from './customer.routes.js';
import channelRoutes from './channel.routes.js';
import userRoutes from './user.routes.js';
import integrationRoutes from './integration.routes.js';
import partnerRoutes from './partner.routes.js';

const router: Router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/promotions', promotionRoutes);
router.use('/quotes', quoteRoutes);
router.use('/orders', orderRoutes);
router.use('/sales', saleRoutes);
router.use('/customers', customerRoutes);
router.use('/channels', channelRoutes);
router.use('/health', healthRoutes);
router.use('/users', userRoutes);
router.use('/integrations', integrationRoutes);
router.use('/partners', partnerRoutes);

export default router;
