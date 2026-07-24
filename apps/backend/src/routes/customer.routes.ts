import { Router } from 'express';
import { getRolesForMerchantPermission } from '@rebequi/shared/constants';
import {
  createCustomerNoteSchema,
  customerFiltersSchema,
  updateCustomerCrmSchema,
} from '@rebequi/shared/schemas';
import { CustomerController } from '../controllers/customer.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';

const router: Router = Router();
const customerController = new CustomerController();
const customerRoles = getRolesForMerchantPermission('customers:manage');

router.get('/admin/stages', authenticate, authorize(...customerRoles), customerController.getStageDistribution);
router.get('/admin/list', authenticate, authorize(...customerRoles), validateQuery(customerFiltersSchema), customerController.listCustomers);
router.get('/admin/:id', authenticate, authorize(...customerRoles), customerController.getCustomer);
router.patch('/admin/:id', authenticate, authorize(...customerRoles), validateBody(updateCustomerCrmSchema), customerController.updateCrm);
router.post('/admin/:id/notes', authenticate, authorize(...customerRoles), validateBody(createCustomerNoteSchema), customerController.addNote);
router.delete('/admin/:id/notes/:noteId', authenticate, authorize(...customerRoles), customerController.deleteNote);

export default router;
