import { Router } from 'express';
import { getRolesForMerchantPermission } from '@rebequi/shared/constants';
import {
  startLeadSchema,
  createManualQuoteDraftSchema,
  submitAnonymousQuoteSchema,
  updateAnonymousQuoteDraftSchema,
  updateLeadStatusSchema,
  updateQuoteDraftSchema,
  updateQuoteStatusSchema,
  proposalSchema, acceptProposalSchema,
} from '@rebequi/shared/schemas';
import { upload } from '../config/multer.js';
import { QuoteController } from '../controllers/quote.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { uploadLimiter } from '../middleware/rate-limit.middleware.js';
import { validateBody } from '../middleware/validation.middleware.js';
import { requireTrustedOrigin } from '../middleware/trusted-origin.middleware.js';
import { listQuoteProposals, createQuoteProposal, acceptQuoteProposal } from '../services/quote-proposal.service.js';
import { successResponse } from '../utils/response.util.js';
import { z } from 'zod';
import { validateQuery } from '../middleware/validation.middleware.js';

const router: Router = Router();
const quoteController = new QuoteController();
const quoteRoles = getRolesForMerchantPermission('quotes:manage');
const integrationRoles = getRolesForMerchantPermission('integrations:manage');

router.get('/:id/proposals', authenticate, authorize('CUSTOMER', ...quoteRoles), validateQuery(z.object({ page: z.coerce.number().int().min(1).default(1) })), async (req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try { successResponse(res, await listQuoteProposals(req.params.id, req.user!.userId, req.user!.role, Number(req.query.page))); } catch (error) { next(error); }
});
router.post('/admin/:id/proposals', authenticate, authorize(...quoteRoles), requireTrustedOrigin, validateBody(proposalSchema), async (req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try { successResponse(res, await createQuoteProposal(req.params.id, req.user!.userId, req.body, req.user), 201); } catch (error) { next(error); }
});
router.post('/:id/proposals/accept', authenticate, authorize('CUSTOMER'), requireTrustedOrigin, validateBody(acceptProposalSchema), async (req, res, next) => {
  res.setHeader('Cache-Control', 'private, no-store');
  try { successResponse(res, await acceptQuoteProposal(req.params.id, req.user!.userId, req.body.version)); } catch (error) { next(error); }
});

router.post('/public/start', validateBody(startLeadSchema), quoteController.startPublicLead);
router.post('/public/manual', authenticate, authorize('CUSTOMER'), uploadLimiter, validateBody(createManualQuoteDraftSchema), quoteController.createManualDraft);
router.post('/public/document', authenticate, authorize('CUSTOMER'), uploadLimiter, upload.single('document'), quoteController.processPublicDocument);

// Legacy paths remain compatible, but every draft requires its customer's session.
router.post(
  '/public/anonymous-document',
  authenticate, authorize('CUSTOMER'),
  uploadLimiter,
  upload.single('document'),
  quoteController.createAnonymousDraft
);
router.get('/public/anonymous/:token', authenticate, authorize('CUSTOMER'), quoteController.getAnonymousDraft);
router.put(
  '/public/anonymous',
  authenticate, authorize('CUSTOMER'),
  validateBody(updateAnonymousQuoteDraftSchema),
  quoteController.updateAnonymousDraft
);
router.post(
  '/public/anonymous/submit',
  authenticate, authorize('CUSTOMER'),
  validateBody(submitAnonymousQuoteSchema),
  quoteController.submitAnonymousDraft
);

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

router.get('/admin/ocr-health', authenticate, authorize(...integrationRoles), quoteController.getOcrHealth);
router.get('/admin/ocr-stats', authenticate, authorize(...integrationRoles), quoteController.getOcrStats);
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
