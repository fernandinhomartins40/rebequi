import { Router } from 'express';
import { getRolesForMerchantPermission } from '@rebequi/shared/constants';
import {
  startLeadSchema,
  updateLeadStatusSchema,
  updateQuoteDraftSchema,
  updateQuoteStatusSchema,
} from '@rebequi/shared/schemas';
import { upload } from '../config/multer.js';
import { QuoteController } from '../controllers/quote.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { uploadLimiter } from '../middleware/rate-limit.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';

const router: Router = Router();
const quoteController = new QuoteController();
const quoteRoles = getRolesForMerchantPermission('quotes:manage');

router.post('/public/start', validateBody(startLeadSchema), quoteController.startPublicLead);
router.post('/public/document', uploadLimiter, upload.single('document'), quoteController.processPublicDocument);

router.get('/me', authenticate, authorize('CUSTOMER'), quoteController.getCustomerQuotes);
router.post(
  '/me/document',
  authenticate,
  authorize('CUSTOMER'),
  uploadLimiter,
  upload.single('document'),
  quoteController.createAuthenticatedDraft
);
router.put('/:id', authenticate, authorize('CUSTOMER'), validateBody(updateQuoteDraftSchema), quoteController.updateCustomerDraft);
router.post('/:id/submit', authenticate, authorize('CUSTOMER'), quoteController.submitCustomerQuote);

router.get('/admin/list', authenticate, authorize(...quoteRoles), quoteController.getAdminQuotes);
router.get('/admin/leads', authenticate, authorize(...quoteRoles), quoteController.getCapturedLeads);
router.post(
  '/admin/:id/status',
  authenticate,
  authorize(...quoteRoles),
  validateBody(updateQuoteStatusSchema),
  quoteController.updateQuoteStatus
);
router.post(
  '/admin/leads/:id/status',
  authenticate,
  authorize(...quoteRoles),
  validateBody(updateLeadStatusSchema),
  quoteController.updateLeadStatus
);

export default router;
