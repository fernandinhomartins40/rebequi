import { createHash } from 'node:crypto';
import { hasMerchantPermission } from '@rebequi/shared/constants';
import { deliveryReceiptSchema, type DeliveryReceiptInput } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.util.js';

export async function recordDeliveryReceipt(id: string, actor: { userId: string; role: string }, raw: DeliveryReceiptInput) {
  const input = deliveryReceiptSchema.parse(raw);
  const key = createHash('sha256').update(`delivery-receipt:${actor.userId}:${input.requestKey}`).digest('hex');
  const values = { id, stopId: input.stopId, receiverName: input.receiverName, note: input.note, items: [...input.items].sort((a, b) => a.id.localeCompare(b.id)) };
  const fingerprint = createHash('sha256').update(JSON.stringify(values)).digest('hex');
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`delivery-receipt:${key}`}))`;
    const identity = await tx.deliveryRun.findUnique({ where: { id }, select: { driverId: true, stops: { select: { fulfillmentId: true, fulfillment: { select: { saleId: true } } } } } });
    if (!identity || actor.role === 'DRIVER' && identity.driverId !== actor.userId) throw new NotFoundError('Romaneio não encontrado.');
    for (const saleId of identity.stops.map(stop => stop.fulfillment.saleId).sort()) await tx.$queryRaw`SELECT id FROM sales WHERE id=${saleId} FOR UPDATE`;
    for (const fulfillmentId of identity.stops.map(stop => stop.fulfillmentId).sort()) await tx.$queryRaw`SELECT id FROM fulfillments WHERE id=${fulfillmentId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM delivery_runs WHERE id=${id} FOR UPDATE`;
    const operator = await tx.user.findFirst({ where: { id: actor.userId, isActive: true }, select: { role: true } });
    if (!operator || operator.role !== actor.role || !(hasMerchantPermission(operator.role, 'logistics:fleet') || operator.role === 'DRIVER' && identity.driverId === actor.userId)) throw new ForbiddenError('Seu perfil não pode registrar este recebimento.');
    const repeated = await tx.deliveryRunEvent.findUnique({ where: { requestKey: key } });
    if (repeated) { if (repeated.fingerprint !== fingerprint) throw new ConflictError('Este envio já foi usado para outra entrega.'); return { id, version: repeated.version }; }
    const run = await tx.deliveryRun.findUniqueOrThrow({ where: { id }, include: { stops: { include: { items: true, fulfillment: { include: { items: true, sale: { select: { status: true } } } } } } } });
    if (run.version !== input.expectedVersion) throw new ConflictError('O romaneio mudou. Recarregue e confira a entrega.');
    const stop = run.stops.find(item => item.id === input.stopId);
    if (run.status !== 'IN_TRANSIT' || !stop?.active || stop.fulfillment.mode !== 'DELIVERY' || stop.fulfillment.driverId !== run.driverId || stop.fulfillment.sale.status !== 'PAID' || !['READY', 'PARTIALLY_RECEIVED'].includes(stop.fulfillment.status)) throw new ConflictError('Registre somente materiais de uma parada liberada, após a saída e entrega física ao recebedor.');
    const returns = await tx.saleReturnItem.groupBy({ by: ['saleItemId'], where: { return: { saleId: stop.fulfillment.saleId } }, _sum: { quantity: true } });
    const refunded = new Map(returns.map(item => [item.saleItemId, item._sum.quantity ?? 0]));
    const snapshots = [];
    for (const line of values.items) {
      const allocation = stop.items.find(item => item.id === line.id);
      const material = allocation && stop.fulfillment.items.find(item => item.id === allocation.fulfillmentItemId);
      if (!allocation || !material || line.quantity > allocation.loaded - allocation.delivered - allocation.returnedToWarehouse || line.quantity > Math.min(material.checked, material.quantity - (refunded.get(material.saleItemId) ?? 0)) - material.delivered) throw new ConflictError('Quantidade maior que o material carregado ainda não recebido nesta parada.');
      snapshots.push({ id: material.id, runItemId: allocation.id, name: material.nameSnapshot, quantity: line.quantity, previousReceived: material.delivered, receivedQuantity: material.delivered + line.quantity });
      await tx.deliveryRunItem.update({ where: { id: allocation.id }, data: { delivered: { increment: line.quantity } } });
      allocation.delivered += line.quantity;
      material.delivered += line.quantity;
    }
    const status = stop.fulfillment.items.every(item => item.delivered === item.quantity - (refunded.get(item.saleItemId) ?? 0)) ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
    // The immutable event authorizes only these exact quantity transitions in the database guards.
    await tx.fulfillmentEvent.create({ data: { fulfillmentId: stop.fulfillmentId, version: stop.fulfillment.version + 1, requestKey: `delivery:${key}`, fingerprint, kind: 'DELIVERY_RECEIVED', actorId: actor.userId, details: { runId: id, runVersion: run.version + 1, receiverName: input.receiverName, note: input.note, items: snapshots, status } } });
    for (const line of snapshots) await tx.fulfillmentItem.update({ where: { id: line.id }, data: { delivered: line.receivedQuantity } });
    await tx.fulfillment.update({ where: { id: stop.fulfillmentId }, data: { status, version: { increment: 1 } } });
    const complete = run.stops.every(item => item.items.every(material => material.loaded === material.delivered + material.returnedToWarehouse));
    const updated = await tx.deliveryRun.update({ where: { id }, data: { status: complete ? 'CLOSED' : 'IN_TRANSIT', version: { increment: 1 } } });
    if (complete) await tx.deliveryRunStop.updateMany({ where: { runId: id, active: true }, data: { active: false } });
    await tx.deliveryRunEvent.create({ data: { runId: id, version: updated.version, requestKey: key, fingerprint, kind: 'DELIVERY_RECEIVED', actorId: actor.userId, details: { stopId: stop.id, receiverName: input.receiverName, note: input.note, items: snapshots, complete } } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: id, action: 'DELIVERY_RECEIPT_RECORDED' } });
    return { id, version: updated.version };
  }, { timeout: 15000 });
}
