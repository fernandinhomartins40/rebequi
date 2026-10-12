import { Router } from 'express';
import { z } from 'zod';
import { createEstimateSchema, projectSchema, requestEstimateQuoteSchema, laborQuoteSchema } from '@rebequi/shared/schemas';
import { authorize } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';
import { successResponse } from '../utils/response.util.js';
import { getCalculationCatalog, getPartnerProject, listPartnerProjects, requestMaterialQuote, saveMaterialEstimate, savePartnerProject, listLaborQuotes, saveLaborQuote } from '../services/partner-project.service.js';
const router: Router = Router();
router.use(authorize('CUSTOMER'));
router.get('/projects', validateQuery(z.object({ page: z.coerce.number().int().min(1).default(1) })), async (req, res, next) => {
  try { successResponse(res, await listPartnerProjects(req.user!.userId, Number(req.query.page))); } catch (error) { next(error); }
});
router.post('/projects', validateBody(projectSchema), async (req, res, next) => {
  try { successResponse(res, await savePartnerProject(req.user!.userId, undefined, req.body), 201); } catch (error) { next(error); }
});
router.get('/projects/:id', async (req, res, next) => {
  try { successResponse(res, await getPartnerProject(req.user!.userId, req.params.id)); } catch (error) { next(error); }
});
router.put('/projects/:id', validateBody(projectSchema), async (req, res, next) => {
  try { successResponse(res, await savePartnerProject(req.user!.userId, req.params.id, req.body)); } catch (error) { next(error); }
});
router.get('/catalog', validateQuery(z.object({ service: z.enum(['PAINT', 'TILE']) })), async (req, res, next) => {
  try { successResponse(res, await getCalculationCatalog(req.query.service as 'PAINT' | 'TILE')); } catch (error) { next(error); }
});
router.post('/estimates', validateBody(createEstimateSchema), async (req, res, next) => {
  try { successResponse(res, await saveMaterialEstimate(req.user!.userId, req.body), 201); } catch (error) { next(error); }
});
router.post('/estimates/:id/quote', validateBody(requestEstimateQuoteSchema), async (req, res, next) => {
  try { successResponse(res, await requestMaterialQuote(req.user!.userId, req.params.id, req.body.quantity)); } catch (error) { next(error); }
});
router.get('/projects/:id/labor-quotes', validateQuery(z.object({ page: z.coerce.number().int().min(1).default(1) })), async (req, res, next) => {
  try { successResponse(res, await listLaborQuotes(req.user!.userId, req.params.id, Number(req.query.page))); } catch (error) { next(error); }
});
router.post('/labor-quotes', validateBody(laborQuoteSchema), async (req, res, next) => {
  try { successResponse(res, await saveLaborQuote(req.user!.userId, req.body), 201); } catch (error) { next(error); }
});
export default router;
