import { Router } from 'express';
import { getRolesForMerchantPermission } from '@rebequi/shared/constants';
import {
  authenticatedCheckoutOrderSchema,
  orderFiltersSchema,
  publicCheckoutOrderSchema,
  updateOrderStatusSchema,
} from '@rebequi/shared/schemas';
import { OrderController } from '../controllers/order.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import { reserveOrderStock } from '../services/stock-reservation.service.js';
import { resolvePartnerReferral } from '../services/partner-referral.service.js';
import { requireTrustedOrigin } from '../middleware/trusted-origin.middleware.js';
import { z } from 'zod';
import { customerFulfillmentHistory } from '../services/customer-fulfillment-history.service.js';
import { customerFulfillmentMaterials } from '../services/customer-fulfillment-materials.service.js';
import { successResponse } from '../utils/response.util.js';
import { validateParams } from '../middleware/validation.middleware.js';

const router: Router = Router();
const orderController = new OrderController();
const orderRoles = getRolesForMerchantPermission('orders:manage');
router.get('/referral/:code', async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  try { res.json({ success: true, data: await resolvePartnerReferral(req.params.code) }); } catch (error) { next(error); }
});

router.post('/public/checkout', (req, res, next) => req.body?.referral ? requireTrustedOrigin(req, res, next) : next(), validateBody(publicCheckoutOrderSchema), orderController.publicCheckout);
router.post('/public/:id/whatsapp-redirected', authenticate, authorize('CUSTOMER'), orderController.markWhatsappRedirected);

router.get('/me', authenticate, authorize('CUSTOMER'), orderController.listCustomerOrders);
router.get('/me/:id/fulfillment-materials', authenticate, authorize('CUSTOMER'), validateParams(z.object({ id: z.string().min(1).max(128) })), validateQuery(z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) })), async (req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try { successResponse(res, await customerFulfillmentMaterials(req.params.id, req.user!.userId, Number(req.query.page))); } catch (error) { next(error); }
});
router.get('/me/:id/fulfillment-history', authenticate, authorize('CUSTOMER'), validateParams(z.object({ id: z.string().min(1).max(128) })), validateQuery(z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) })), async (req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try { successResponse(res, await customerFulfillmentHistory(req.params.id, req.user!.userId, Number(req.query.page))); } catch (error) { next(error); }
});
router.post('/checkout', authenticate, authorize('CUSTOMER'), (req, res, next) => req.body?.referral ? requireTrustedOrigin(req, res, next) : next(), validateBody(authenticatedCheckoutOrderSchema), orderController.authenticatedCheckout);

router.get('/admin/list', authenticate, authorize(...orderRoles), validateQuery(orderFiltersSchema), orderController.listAdminOrders);
router.get('/admin/:id', authenticate, authorize(...orderRoles), orderController.getAdminOrder);
router.post('/admin/:id/reserve', authenticate, authorize(...orderRoles), async (req, res, next) => {
  try { res.json({ success: true, data: await reserveOrderStock(req.params.id, req.user) }); }
  catch (error) { next(error); }
});
router.post(
  '/admin/:id/status',
  authenticate,
  authorize(...orderRoles),
  validateBody(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

export default router;
