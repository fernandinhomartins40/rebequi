import { createHash } from 'node:crypto';
import { hasMerchantPermission } from '@rebequi/shared/constants';
import { pickupReceiptSchema, type PickupReceiptInput } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.util.js';
export async function recordPickupReceipt(id: string, actor: { userId: string; role: string }, raw: PickupReceiptInput) {
  const input = pickupReceiptSchema.parse(raw);
  const key = createHash('sha256').update(`pickup-receipt:${actor.userId}:${input.requestKey}`).digest('hex');
  const values = { id, receiverName: input.receiverName, note: input.note, items: [...input.items].sort((a, b) => a.id.localeCompare(b.id)) };
  const fingerprint = createHash('sha256').update(JSON.stringify(values)).digest('hex');
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`pickup-receipt:${key}`}))`;
    const identity = await tx.fulfillment.findUnique({ where: { id }, select: { saleId: true } });
    if (!identity) throw new NotFoundError('Retirada não encontrada.');
    await tx.$queryRaw`SELECT id FROM sales WHERE id=${identity.saleId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM fulfillments WHERE id=${id} FOR UPDATE`;
    const operator = await tx.user.findFirst({ where: { id: actor.userId, isActive: true }, select: { role: true } });
    if (!operator || operator.role !== actor.role || !hasMerchantPermission(operator.role, 'logistics:manage')) throw new ForbiddenError('Seu acesso mudou. Entre novamente.');
    const repeated = await tx.fulfillmentEvent.findUnique({ where: { requestKey: key } });
    if (repeated) { if (repeated.fingerprint !== fingerprint) throw new ConflictError('Este envio já foi usado para outra retirada.'); return { id, version: repeated.version }; }
    const row = await tx.fulfillment.findUniqueOrThrow({ where: { id }, include: { items: true, sale: { select: { status: true } } } });
    if (row.version !== input.expectedVersion) throw new ConflictError('A retirada mudou. Recarregue e confira os materiais.');
    if (row.mode !== 'PICKUP' || row.sale.status !== 'PAID' || !['READY', 'PARTIALLY_RECEIVED'].includes(row.status)) throw new ConflictError('Registre somente retirada paga e liberada, após a entrega física ao recebedor.');
    if (await tx.deliveryRunStop.count({ where: { fulfillmentId: id, active: true } })) throw new ConflictError('Material vinculado a romaneio ativo.');
    const returned = await tx.saleReturnItem.groupBy({ by: ['saleItemId'], where: { return: { saleId: row.saleId } }, _sum: { quantity: true } });
    const refunds = new Map(returned.map(item => [item.saleItemId, item._sum.quantity ?? 0]));
    const materials = new Map(row.items.map(item => [item.id, item]));
    const snapshots = [];
    for (const line of values.items) {
      const material = materials.get(line.id);
      if (!material || line.quantity > Math.min(material.quantity - (refunds.get(material.saleItemId) ?? 0), material.checked) - material.delivered) throw new ConflictError('Quantidade maior que o saldo conferido ainda não recebido.');
      await tx.fulfillmentItem.update({ where: { id: material.id }, data: { delivered: { increment: line.quantity } } });
      material.delivered += line.quantity;
      snapshots.push({ id: material.id, saleItemId: material.saleItemId, name: material.nameSnapshot, quantity: line.quantity });
    }
    const status = row.items.every(item => item.delivered === item.quantity - (refunds.get(item.saleItemId) ?? 0)) ? 'RECEIVED' : 'PARTIALLY_RECEIVED';
    const updated = await tx.fulfillment.update({ where: { id }, data: { status, version: { increment: 1 } } });
    await tx.fulfillmentEvent.create({ data: { fulfillmentId: id, version: updated.version, requestKey: key, fingerprint, kind: 'PICKUP_RECEIVED', actorId: actor.userId, details: { receiverName: input.receiverName, note: input.note, items: snapshots, status, recordedAt: new Date().toISOString() } } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: id, action: 'PICKUP_RECEIPT_RECORDED' } });
    return { id, version: updated.version };
  });
}
