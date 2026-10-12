import { Router } from 'express';
import { z } from 'zod';
import { getRolesForMerchantPermission } from '@rebequi/shared/constants';
import { commercialKindSchema, commercialAssignmentSchema } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { requireTrustedOrigin } from '../middleware/trusted-origin.middleware.js';
import { validateBody, validateParams, validateQuery } from '../middleware/validation.middleware.js';
import { successResponse } from '../utils/response.util.js';
import { assignCommercialRecord, commercialAssignmentState } from '../services/commercial-assignment.service.js';
const router: Router = Router();
router.use(authenticate, (_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
const assignmentRoles = getRolesForMerchantPermission('commercial:assign');
const params = z.object({ kind: commercialKindSchema, id: z.string().min(1).max(128) });
router.get('/sellers', authorize(...assignmentRoles), validateQuery(z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) })), async (req, res, next) => {
  try {
    const page = Number(req.query.page); const where = { role: { in: ['SALES', 'ADMIN', 'MANAGER'] as ('SALES' | 'ADMIN' | 'MANAGER')[] }, isActive: true };
    const [sellers, total] = await Promise.all([prisma.user.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (page - 1) * 20, take: 20, select: { id: true, name: true, role: true } }), prisma.user.count({ where })]);
    successResponse(res, { sellers, total, page, totalPages: Math.ceil(total / 20) });
  } catch (error) { next(error); }
});
router.get('/assignments/:kind/:id', authorize('ADMIN', 'MANAGER', 'SALES'), validateParams(params), async (req, res, next) => { try { successResponse(res, await commercialAssignmentState(commercialKindSchema.parse(req.params.kind), req.params.id, req.user!)); } catch (error) { next(error); } });
router.put('/assignments/:kind/:id', authorize(...assignmentRoles), requireTrustedOrigin, validateParams(params), validateBody(commercialAssignmentSchema), async (req, res, next) => { try { successResponse(res, await assignCommercialRecord(commercialKindSchema.parse(req.params.kind), req.params.id, req.user!.userId, req.body)); } catch (error) { next(error); } });
router.get('/assignments/:kind/:id/history', authorize(...assignmentRoles), validateParams(params), validateQuery(z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) })), async (req, res, next) => {
  try { const kind = commercialKindSchema.parse(req.params.kind); await commercialAssignmentState(kind, req.params.id, req.user!); const page = Number(req.query.page); const where = { resourceKind: kind, resourceId: req.params.id }; const [events, total] = await Promise.all([prisma.commercialAssignmentAudit.findMany({ where, orderBy: { version: 'desc' }, skip: (page - 1) * 20, take: 20 }), prisma.commercialAssignmentAudit.count({ where })]); successResponse(res, { events, total, page, totalPages: Math.ceil(total / 20) }); } catch (error) { next(error); }
});
export default router;
