import { createHash } from 'node:crypto';
import { hasMerchantPermission } from '@rebequi/shared/constants';
import { deliveryOccurrenceSchema, type DeliveryOccurrenceInput } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.util.js';

export async function recordDeliveryOccurrence(id: string, actor: { userId: string; role: string }, raw: DeliveryOccurrenceInput) {
  const input = deliveryOccurrenceSchema.parse(raw);
  const key = createHash('sha256').update(`delivery-occurrence:${actor.userId}:${input.requestKey}`).digest('hex');
  const fingerprint = createHash('sha256').update(JSON.stringify({ id, stopId: input.stopId, kind: input.kind, note: input.note })).digest('hex');
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`delivery-occurrence:${key}`}))`;
    const identity = await tx.deliveryRun.findUnique({ where: { id }, select: { driverId: true, stops: { select: { fulfillmentId: true, fulfillment: { select: { saleId: true } } } } } });
    if (!identity || actor.role === 'DRIVER' && identity.driverId !== actor.userId) throw new NotFoundError('Romaneio não encontrado.');
    for (const saleId of identity.stops.map(stop => stop.fulfillment.saleId).sort()) await tx.$queryRaw`SELECT id FROM sales WHERE id=${saleId} FOR UPDATE`;
    for (const fulfillmentId of identity.stops.map(stop => stop.fulfillmentId).sort()) await tx.$queryRaw`SELECT id FROM fulfillments WHERE id=${fulfillmentId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM delivery_runs WHERE id=${id} FOR UPDATE`;
    const operator = await tx.user.findFirst({ where: { id: actor.userId, isActive: true }, select: { role: true } });
    if (!operator || operator.role !== actor.role || !(hasMerchantPermission(operator.role, 'logistics:fleet') || operator.role === 'DRIVER' && identity.driverId === actor.userId)) throw new ForbiddenError('Seu perfil não pode registrar esta ocorrência.');
    const repeated = await tx.deliveryRunEvent.findUnique({ where: { requestKey: key } });
    if (repeated) { if (repeated.fingerprint !== fingerprint) throw new ConflictError('Este envio já foi usado para outra ocorrência.'); return { id, version: repeated.version }; }
    const run = await tx.deliveryRun.findUniqueOrThrow({ where: { id }, include: { stops: { include: { fulfillment: { select: { version: true, mode: true, status: true, driverId: true, sale: { select: { status: true } } } } } } } });
    if (run.version !== input.expectedVersion) throw new ConflictError('O romaneio mudou. Recarregue antes de registrar.');
    const stop = run.stops.find(item => item.id === input.stopId);
    if (run.status !== 'IN_TRANSIT' || !stop?.active || stop.fulfillment.mode !== 'DELIVERY' || stop.fulfillment.driverId !== run.driverId || stop.fulfillment.sale.status !== 'PAID' || !['READY', 'PARTIALLY_RECEIVED'].includes(stop.fulfillment.status)) throw new ConflictError('Registre uma ocorrência somente na entrega em andamento desta parada.');
    const fulfillment = await tx.fulfillment.update({ where: { id: stop.fulfillmentId }, data: { version: { increment: 1 } } });
    await tx.fulfillmentEvent.create({ data: { fulfillmentId: stop.fulfillmentId, version: fulfillment.version, requestKey: `occurrence:${key}`, fingerprint, kind: 'DELIVERY_ISSUE', actorId: actor.userId, details: { runId: id, kind: input.kind, note: input.note } } });
    const updated = await tx.deliveryRun.update({ where: { id }, data: { version: { increment: 1 } } });
    await tx.deliveryRunEvent.create({ data: { runId: id, version: updated.version, requestKey: key, fingerprint, kind: 'DELIVERY_ISSUE', actorId: actor.userId, details: { stopId: stop.id, kind: input.kind, note: input.note } } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: id, action: 'DELIVERY_OCCURRENCE_RECORDED' } });
    return { id, version: updated.version };
  }, { timeout: 15000 });
}
