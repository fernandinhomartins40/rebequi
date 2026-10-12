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
import { z } from 'zod';
import { saleReturnSchema, saleReturnPreviewSchema } from '@rebequi/shared/schemas';
import { requireTrustedOrigin } from '../middleware/trusted-origin.middleware.js';
import { listSaleReturns, createSaleReturn, previewSaleReturn } from '../services/sale-return.service.js';

const router: Router = Router();
const saleController = new SaleController();
const saleRoles = getRolesForMerchantPermission('sales:manage');
router.post('/admin/:id/returns/preview', authenticate, authorize(...saleRoles), requireTrustedOrigin, validateBody(saleReturnPreviewSchema), async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try { res.json({ success: true, data: await previewSaleReturn(req.params.id, req.body) }); } catch (error) { next(error); }
});
router.get('/admin/:id/returns', authenticate, authorize(...saleRoles), validateQuery(z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) })), async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try { res.json({ success: true, data: await listSaleReturns(req.params.id, Number(req.query.page)) }); } catch (error) { next(error); }
});
router.post('/admin/:id/returns', authenticate, authorize(...saleRoles), requireTrustedOrigin, validateBody(saleReturnSchema), async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try { res.status(201).json({ success: true, data: await createSaleReturn(req.params.id, req.user!.userId, req.body) }); } catch (error) { next(error); }
});

router.get('/admin/revenue', authenticate, authorize(...saleRoles), validateQuery(revenueSummaryQuerySchema), saleController.getRevenueSummary);
router.get('/admin/list', authenticate, authorize(...saleRoles), validateQuery(saleFiltersSchema), saleController.listSales);
router.get('/admin/:id', authenticate, authorize(...saleRoles), saleController.getSale);
router.post('/admin', authenticate, authorize(...saleRoles), requireTrustedOrigin, validateBody(createSaleSchema), saleController.createSale);
router.post('/admin/:id/status', authenticate, authorize(...saleRoles), requireTrustedOrigin, validateBody(updateSaleStatusSchema), saleController.updateSaleStatus);

export default router;
