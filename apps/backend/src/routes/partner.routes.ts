import { Router } from 'express';
import { partnerFiltersSchema, partnerProfileSchema, reviewPartnerSchema, type PartnerFiltersInput } from '@rebequi/shared/schemas';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import { requireTrustedOrigin } from '../middleware/trusted-origin.middleware.js';
import { successResponse } from '../utils/response.util.js';
import { getPartnerProfile, listPartners, reviewPartner, savePartnerProfile } from '../services/partner.service.js';
import projectRoutes from './partner-project.routes.js';

const router: Router = Router();
router.use(authenticate, (_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
// Cookie mutations require an allowed browser origin. SameSite is not the only control.
router.use(requireTrustedOrigin);
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
