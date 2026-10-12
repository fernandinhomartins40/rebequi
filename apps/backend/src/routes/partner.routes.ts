import { Router } from 'express';
import { partnerFiltersSchema, partnerProfileSchema, reviewPartnerSchema, type PartnerFiltersInput } from '@rebequi/shared/schemas';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import { requireTrustedOrigin } from '../middleware/trusted-origin.middleware.js';
import { successResponse } from '../utils/response.util.js';
import { getPartnerProfile, listPartners, reviewPartner, savePartnerProfile } from '../services/partner.service.js';
import projectRoutes from './partner-project.routes.js';
import rewardRoutes from './partner-reward.routes.js';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { NotFoundError } from '../utils/errors.util.js';
import { partnerPortfolioUpload } from '../config/multer.js';
import { uploadLimiter } from '../middleware/rate-limit.middleware.js';
import { addPartnerPortfolio, listPartnerPortfolio, removePartnerPortfolio } from '../services/partner-portfolio.service.js';
import { partnerAiInputSchema } from '@rebequi/shared/schemas';
import { getPartnerAiStatus, interpretPartnerDescription } from '../services/partner-ai.service.js';
import { listOwnReferrals } from '../services/partner-referral.service.js';
import { partnerProgramRuleSchema, acceptPartnerProgramSchema, partnerPayoutSchema } from '@rebequi/shared/schemas';
import { currentPartnerRule, savePartnerRule, getOwnPartnerProgram, acceptPartnerRule, ownPartnerWallet, readPartnerWallet, recordPartnerPayout, ownPartnerRuleHistory } from '../services/partner-program.service.js';

const router: Router = Router();
router.use(authenticate, (_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
// Cookie mutations require an allowed browser origin. SameSite is not the only control.
router.use(requireTrustedOrigin);
router.use(rewardRoutes);
const pageQuery = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) });
router.get('/program/history', authorize('CUSTOMER'), validateQuery(pageQuery), async (req, res, next) => { try { successResponse(res, await ownPartnerRuleHistory(req.user!.userId, Number(req.query.page))); } catch (error) { next(error); } });
router.get('/program', authorize('CUSTOMER'), async (req, res, next) => { try { successResponse(res, await getOwnPartnerProgram(req.user!.userId)); } catch (error) { next(error); } });
router.post('/program/accept', authorize('CUSTOMER'), validateBody(acceptPartnerProgramSchema), async (req, res, next) => { try { successResponse(res, await acceptPartnerRule(req.user!.userId, req.body.ruleId)); } catch (error) { next(error); } });
router.get('/wallet', authorize('CUSTOMER'), validateQuery(pageQuery), async (req, res, next) => { try { successResponse(res, await ownPartnerWallet(req.user!.userId, Number(req.query.page))); } catch (error) { next(error); } });
router.get('/admin/program', authorize('ADMIN', 'MANAGER'), async (_req, res, next) => { try { successResponse(res, await currentPartnerRule()); } catch (error) { next(error); } });
router.post('/admin/program', authorize('ADMIN', 'MANAGER'), validateBody(partnerProgramRuleSchema), async (req, res, next) => { try { successResponse(res, await savePartnerRule(req.user!.userId, req.body)); } catch (error) { next(error); } });
router.get('/admin/:id/wallet', authorize('ADMIN', 'MANAGER'), validateQuery(pageQuery), async (req, res, next) => {
  try { if (!await prisma.partnerProfile.findUnique({ where: { id: req.params.id }, select: { id: true } })) throw new NotFoundError('Cadastro não encontrado'); successResponse(res, await readPartnerWallet(req.params.id, Number(req.query.page))); } catch (error) { next(error); }
});
router.post('/admin/:id/payouts', authorize('ADMIN', 'MANAGER'), validateBody(partnerPayoutSchema), async (req, res, next) => { try { successResponse(res, await recordPartnerPayout(req.params.id, req.user!.userId, req.body), 201); } catch (error) { next(error); } });
router.get('/referrals', authorize('CUSTOMER'), validateQuery(z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) })), async (req, res, next) => {
  try { successResponse(res, await listOwnReferrals(req.user!.userId, Number(req.query.page))); } catch (error) { next(error); }
});
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
