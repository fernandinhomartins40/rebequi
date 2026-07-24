import { Router } from 'express';
import { getRolesForMerchantPermission } from '@rebequi/shared/constants';
import {
  createSaleSchema,
  revenueSummaryQuerySchema,
  saleFiltersSchema,
  updateSaleStatusSchema,
} from '@rebequi/shared/schemas';
import { SaleController } from '../controllers/sale.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';

const router: Router = Router();
const saleController = new SaleController();
const saleRoles = getRolesForMerchantPermission('sales:manage');

router.get('/admin/revenue', authenticate, authorize(...saleRoles), validateQuery(revenueSummaryQuerySchema), saleController.getRevenueSummary);
router.get('/admin/list', authenticate, authorize(...saleRoles), validateQuery(saleFiltersSchema), saleController.listSales);
router.get('/admin/:id', authenticate, authorize(...saleRoles), saleController.getSale);
router.post('/admin', authenticate, authorize(...saleRoles), validateBody(createSaleSchema), saleController.createSale);
router.post('/admin/:id/status', authenticate, authorize(...saleRoles), validateBody(updateSaleStatusSchema), saleController.updateSaleStatus);

export default router;
