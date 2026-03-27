import { Router } from 'express';
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

router.get('/admin/list', authenticate, authorize('ADMIN'), quoteController.getAdminQuotes);
router.get('/admin/leads', authenticate, authorize('ADMIN'), quoteController.getCapturedLeads);
router.post(
  '/admin/:id/status',
  authenticate,
  authorize('ADMIN'),
  validateBody(updateQuoteStatusSchema),
  quoteController.updateQuoteStatus
);
router.post(
  '/admin/leads/:id/status',
  authenticate,
  authorize('ADMIN'),
  validateBody(updateLeadStatusSchema),
  quoteController.updateLeadStatus
);

export default router;
