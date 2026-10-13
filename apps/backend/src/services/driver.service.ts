import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import type { DriverAssignmentInput } from '@rebequi/shared/schemas';
import { driverAssignmentSchema } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { ConflictError, NotFoundError } from '../utils/errors.util.js';

export async function listActiveDrivers(page: number) {
  const where = { role: 'DRIVER' as const, isActive: true };
  const [drivers, total] = await Promise.all([
    prisma.user.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (page - 1) * 20, take: 20, select: { id: true, name: true } }),
    prisma.user.count({ where }),
  ]);
  return { drivers, page, totalPages: Math.ceil(total / 20) };
}

export async function assignDriver(id: string, actorId: string, raw: DriverAssignmentInput) {
  const input = driverAssignmentSchema.parse(raw);
  const key = createHash('sha256').update(`fulfillment-driver:${actorId}:${input.requestKey}`).digest('hex');
  const fingerprint = createHash('sha256').update(JSON.stringify({ id, driverId: input.driverId, reason: input.reason })).digest('hex');
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`fulfillment-request:${key}`}))`;
    const identity = await tx.fulfillment.findUnique({ where: { id }, select: { saleId: true } });
    if (!identity) throw new NotFoundError('Entrega não encontrada.');
    await tx.$queryRaw`SELECT id FROM sales WHERE id=${identity.saleId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM fulfillments WHERE id=${id} FOR UPDATE`;
    const repeated = await tx.fulfillmentEvent.findUnique({ where: { requestKey: key } });
    if (repeated) {
      if (repeated.fingerprint !== fingerprint) throw new ConflictError('Este envio já foi usado para outra atribuição.');
      return { id, version: repeated.version };
    }
    const current = await tx.fulfillment.findUniqueOrThrow({ where: { id }, include: { sale: { select: { status: true } } } });
    if (current.version !== input.expectedVersion) throw new ConflictError('A entrega mudou. Recarregue antes de atribuir.');
    if (await tx.deliveryRunStop.count({ where: { fulfillmentId: id, active: true } })) throw new ConflictError('Cancele o planejamento do romaneio antes de trocar o motorista.');
    if (current.mode !== 'DELIVERY' || current.sale.status !== 'PAID' || !['PICKING', 'CHECKING', 'READY'].includes(current.status)) throw new ConflictError('Atribua somente entregas pagas em preparação ou prontas.');
    if (input.driverId) {
      await tx.$queryRaw`SELECT id FROM users WHERE id=${input.driverId} FOR UPDATE`;
      const driver = await tx.user.findFirst({ where: { id: input.driverId, role: 'DRIVER', isActive: true }, select: { id: true } });
      if (!driver) throw new ConflictError('Selecione um motorista ativo.');
    }
    const saved = await tx.fulfillment.update({ where: { id }, data: { driverId: input.driverId, version: { increment: 1 } } });
    await tx.fulfillmentEvent.create({ data: { fulfillmentId: id, version: saved.version, requestKey: key, fingerprint, actorId, kind: 'DRIVER_ASSIGNED', details: { previousDriverId: current.driverId, driverId: input.driverId, note: input.reason } } });
    await tx.integrationAudit.create({ data: { actorId, jobId: id, action: 'FULFILLMENT_DRIVER_ASSIGNED' } });
    return { id, version: saved.version };
  });
}

const taskSelect = {
  deliveryStops: { where: { active: true }, take: 1, select: { run: { select: { status: true } } } },
  id: true, status: true, region: true, address: true, scheduledAt: true,
  sale: { select: { referenceCode: true, customerNameSnapshot: true } },
  items: { select: { id: true, nameSnapshot: true, quantity: true, checked: true, delivered: true } },
} as const;
function formatDriverTask(row: Prisma.FulfillmentGetPayload<{ select: typeof taskSelect }>) {
  const { deliveryStops, ...task } = row;
  const transport = deliveryStops[0]?.run;
  return { ...task, status: ['RECEIVED', 'PARTIALLY_RECEIVED'].includes(task.status) ? task.status : transport && ['LOADED', 'IN_TRANSIT'].includes(transport.status) ? transport.status : task.status };
}
const driverScope = (driverId: string) => ({ driverId, mode: 'DELIVERY', status: { not: 'CANCELED' }, sale: { status: 'PAID' as const } });
export async function driverTasks(driverId: string, page: number) {
  const where = { ...driverScope(driverId), status: { notIn: ['CANCELED', 'RECEIVED'] } };
  const [tasks, total] = await Promise.all([
    prisma.fulfillment.findMany({ where, orderBy: [{ scheduledAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }], skip: (page - 1) * 20, take: 20, select: taskSelect }),
    prisma.fulfillment.count({ where }),
  ]);
  return { tasks: tasks.map(formatDriverTask), page, totalPages: Math.ceil(total / 20) };
}
export async function driverTask(driverId: string, id: string) {
  const task = await prisma.fulfillment.findFirst({ where: { ...driverScope(driverId), id }, select: taskSelect });
  if (!task) throw new NotFoundError('Entrega não encontrada.');
  return formatDriverTask(task);
}
