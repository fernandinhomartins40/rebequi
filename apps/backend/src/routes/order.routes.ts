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

const router: Router = Router();
const orderController = new OrderController();
const orderRoles = getRolesForMerchantPermission('orders:manage');

router.post('/public/checkout', validateBody(publicCheckoutOrderSchema), orderController.publicCheckout);
router.post('/public/:id/whatsapp-redirected', authenticate, authorize('CUSTOMER'), orderController.markWhatsappRedirected);

router.get('/me', authenticate, authorize('CUSTOMER'), orderController.listCustomerOrders);
router.post('/checkout', authenticate, authorize('CUSTOMER'), validateBody(authenticatedCheckoutOrderSchema), orderController.authenticatedCheckout);

router.get('/admin/list', authenticate, authorize(...orderRoles), validateQuery(orderFiltersSchema), orderController.listAdminOrders);
router.get('/admin/:id', authenticate, authorize(...orderRoles), orderController.getAdminOrder);
router.post(
  '/admin/:id/status',
  authenticate,
  authorize(...orderRoles),
  validateBody(updateOrderStatusSchema),
  orderController.updateOrderStatus
);

export default router;
