import { Router } from 'express';
import { z } from 'zod';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateQuery } from '../middleware/validation.middleware.js';
import { successResponse } from '../utils/response.util.js';
import { NotFoundError } from '../utils/errors.util.js';
import { prisma } from '../lib/prisma.js';
const router: Router = Router();
router.use(authenticate, authorize('DRIVER'), (_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
router.get('/', validateQuery(z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) })), async (req, res, next) => {
  try {
    const page = Number(req.query.page); const where = { driverId: req.user!.userId, status: 'PLANNED' };
    const [runs, total] = await Promise.all([prisma.deliveryRun.findMany({ where, orderBy: [{ scheduledAt: 'asc' }, { id: 'asc' }], skip: (page - 1) * 20, take: 20, select: { id: true, label: true, scheduledAt: true } }), prisma.deliveryRun.count({ where })]);
    successResponse(res, { runs, page, totalPages: Math.ceil(total / 20) });
  } catch (error) { next(error); }
});
router.get('/:id', async (req, res, next) => {
  try {
    const run = await prisma.deliveryRun.findFirst({ where: { id: req.params.id, driverId: req.user!.userId, status: 'PLANNED' }, select: { id: true, label: true, scheduledAt: true, snapshot: true, stops: { where: { active: true, fulfillment: { driverId: req.user!.userId, sale: { status: 'PAID' }, mode: 'DELIVERY' } }, orderBy: { position: 'asc' }, select: { id: true, position: true, snapshot: true } } } });
    if (!run) throw new NotFoundError('Romaneio não encontrado.'); successResponse(res, run);
  } catch (error) { next(error); }
});
export default router;
