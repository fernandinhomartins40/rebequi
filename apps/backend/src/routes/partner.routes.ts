import { Router } from 'express';
import { partnerFiltersSchema, partnerProfileSchema, reviewPartnerSchema, type PartnerFiltersInput } from '@rebequi/shared/schemas';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import { requireTrustedOrigin } from '../middleware/trusted-origin.middleware.js';
import { successResponse } from '../utils/response.util.js';
import { getPartnerProfile, listPartners, reviewPartner, savePartnerProfile } from '../services/partner.service.js';
import projectRoutes from './partner-project.routes.js';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../utils/errors.util.js';
import { partnerPortfolioUpload } from '../config/multer.js';
import { uploadLimiter } from '../middleware/rate-limit.middleware.js';
import { addPartnerPortfolio, listPartnerPortfolio, removePartnerPortfolio } from '../services/partner-portfolio.service.js';
import { partnerAiInputSchema } from '@rebequi/shared/schemas';
import { getPartnerAiStatus, interpretPartnerDescription } from '../services/partner-ai.service.js';

const router: Router = Router();
router.use(authenticate, (_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
// Cookie mutations require an allowed browser origin. SameSite is not the only control.
router.use(requireTrustedOrigin);
router.get('/ai/status', authorize('CUSTOMER'), async (req, res, next) => {
  try { successResponse(res, await getPartnerAiStatus(req.user!.userId)); } catch (error) { next(error); }
});
router.post('/ai/interpret', authorize('CUSTOMER'), validateBody(partnerAiInputSchema), async (req, res, next) => {
  try { successResponse(res, await interpretPartnerDescription(req.user!.userId, req.body)); } catch (error) { next(error); }
});
router.get('/portfolio', authorize('CUSTOMER'), async (req, res, next) => {
  try { successResponse(res, await listPartnerPortfolio(req.user!.userId)); } catch (error) { next(error); }
});
router.post('/portfolio', authorize('CUSTOMER'), uploadLimiter, partnerPortfolioUpload.single('image'), validateBody(z.object({ caption: z.string().trim().max(160).default(''), requestKey: z.string().uuid(), authorized: z.literal('true') }).strict()), async (req, res, next) => {
  try { successResponse(res, await addPartnerPortfolio(req.user!.userId, req.file!, req.body.caption, req.body.requestKey), 201); } catch (error) { next(error); }
});
router.delete('/portfolio/:id', authorize('CUSTOMER'), async (req, res, next) => {
  try { await removePartnerPortfolio(req.user!.userId, req.params.id); successResponse(res, { removed: true }); } catch (error) { next(error); }
});
router.get('/admin/:id/portfolio', authorize('ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const partner = await prisma.partnerProfile.findUnique({ where: { id: req.params.id }, select: { userId: true } });
    if (!partner) throw new NotFoundError('Cadastro não encontrado');
    successResponse(res, await listPartnerPortfolio(partner.userId));
  } catch (error) { next(error); }
});
router.get('/me', authorize('CUSTOMER'), async (req, res, next) => {
  try { successResponse(res, await getPartnerProfile(req.user!.userId)); } catch (error) { next(error); }
});
router.put('/me', authorize('CUSTOMER'), validateBody(partnerProfileSchema), async (req, res, next) => {
  try { successResponse(res, await savePartnerProfile(req.user!.userId, req.body)); } catch (error) { next(error); }
});
router.get('/admin/list', authorize('ADMIN', 'MANAGER'), validateQuery(partnerFiltersSchema), async (req, res, next) => {
  try { successResponse(res, await listPartners(req.query as unknown as PartnerFiltersInput)); } catch (error) { next(error); }
});
router.post('/admin/:id/review', authorize('ADMIN', 'MANAGER'), validateBody(reviewPartnerSchema), async (req, res, next) => {
  try { successResponse(res, await reviewPartner(req.params.id, req.user!.userId, req.body)); } catch (error) { next(error); }
});
router.use(projectRoutes);
export default router;
