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
import { saleScope } from '../services/commercial-access-policy.js';
const router: Router = Router();
router.use(authenticate, (_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
const assignmentRoles = getRolesForMerchantPermission('commercial:assign');
const params = z.object({ kind: commercialKindSchema, id: z.string().min(1).max(128) });
router.get('/workbench', authorize(...getRolesForMerchantPermission('commercial:work')), async (req, res, next) => {
  try {
    const own = { assignedSellerId: req.user!.userId };
    const sales = saleScope({ userId: req.user!.userId, role: 'SALES' });
    const [quotes, orders, customers, pendingSales, quotesCount, ordersCount, followUpsCount, pendingSalesCount] = await Promise.all([
      prisma.quoteRequest.findMany({ where: { ...own, status: { in: ['SUBMITTED', 'IN_REVIEW'] } }, orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }], take: 5, select: { id: true, referenceCode: true, title: true, status: true, submittedAt: true } }),
      prisma.customerOrder.findMany({ where: { ...own, status: { in: ['PENDING_WHATSAPP', 'WHATSAPP_REDIRECTED', 'IN_RECOVERY'] } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 5, select: { id: true, referenceCode: true, status: true, createdAt: true, customerNameSnapshot: true } }),
      prisma.user.findMany({ where: { ...own, role: 'CUSTOMER', followUpAt: { lte: new Date() } }, orderBy: [{ followUpAt: 'asc' }, { id: 'asc' }], take: 5, select: { id: true, name: true, followUpAt: true } }),
      prisma.sale.findMany({ where: { AND: [sales], status: 'PENDING_PAYMENT' }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 5, select: { id: true, referenceCode: true, createdAt: true } }),
      prisma.quoteRequest.count({ where: { ...own, status: { in: ['SUBMITTED', 'IN_REVIEW'] } } }),
      prisma.customerOrder.count({ where: { ...own, status: { in: ['PENDING_WHATSAPP', 'WHATSAPP_REDIRECTED', 'IN_RECOVERY'] } } }),
      prisma.user.count({ where: { ...own, role: 'CUSTOMER', followUpAt: { lte: new Date() } } }),
      prisma.sale.count({ where: { AND: [sales], status: 'PENDING_PAYMENT' } }),
    ]);
    successResponse(res, { quotes, orders, customers, pendingSales, counts: { quotes: quotesCount, orders: ordersCount, followUps: followUpsCount, pendingSales: pendingSalesCount } });
  } catch (error) { next(error); }
});
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
