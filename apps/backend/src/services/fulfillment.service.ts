import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { fulfillmentDetailsSchema, fulfillmentOperationSchema, type FulfillmentDetailsInput, type FulfillmentOperationInput } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.util.js';

export async function ensureSaleFulfillment(tx: Prisma.TransactionClient, saleId: string, actorId?: string) {
  const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { items: true } });
  if (sale?.status !== 'PAID') return undefined;
  const existing = await tx.fulfillment.findUnique({ where: { saleId } });
  if (existing) return existing;
  return tx.fulfillment.create({ data: { saleId, items: { create: sale.items.map(item => ({ saleItemId: item.id, nameSnapshot: item.productNameSnapshot, quantity: item.quantity })) }, events: { create: { requestKey: `fulfillment-created:${saleId}`, fingerprint: saleId, version: 1, kind: 'CREATED', actorId: actorId ?? sale.registeredById ?? 'system', details: { status: 'AWAITING_DETAILS' } } } } });
}
export async function cancelSaleFulfillment(tx: Prisma.TransactionClient, saleId: string, actorId?: string) {
  const fulfillment = await tx.fulfillment.findUnique({ where: { saleId }, include: { items: true } });
  if (!fulfillment || fulfillment.status === 'CANCELED') return;
  await tx.$queryRaw`SELECT id FROM fulfillments WHERE id=${fulfillment.id} FOR UPDATE`;
  if (await tx.deliveryRunStop.count({ where: { fulfillmentId: fulfillment.id, active: true } })) throw new ConflictError('Cancele o planejamento do romaneio antes de cancelar esta venda.');
  if (fulfillment.items.some(item => item.delivered > 0)) throw new ConflictError('Há material entregue. Registre a devolução física e confira a logística antes de cancelar.');
  await tx.fulfillment.update({ where: { id: fulfillment.id }, data: { status: 'CANCELED', version: { increment: 1 } } });
  await tx.fulfillmentEvent.create({ data: { fulfillmentId: fulfillment.id, version: fulfillment.version + 1, requestKey: `fulfillment-canceled:${saleId}`, fingerprint: saleId, kind: 'SALE_CANCELED', actorId: actorId ?? 'system', details: { status: 'CANCELED' } } });
}
export async function reviseFulfillmentAfterReturn(tx: Prisma.TransactionClient, saleId: string, returnId: string, actorId: string) {
  const row = await tx.fulfillment.findUnique({ where: { saleId } });
  if (!row || row.status === 'CANCELED') return;
  await tx.$queryRaw`SELECT id FROM fulfillments WHERE id=${row.id} FOR UPDATE`;
  if (await tx.deliveryRunStop.count({ where: { fulfillmentId: row.id, active: true } })) throw new ConflictError('Cancele o planejamento do romaneio antes de registrar a devolução.');
  const materials = await tx.fulfillmentItem.findMany({ where: { fulfillmentId: row.id } });
  const returnedItems = await tx.saleReturnItem.findMany({ where: { returnId }, select: { saleItemId: true, quantity: true, physicalOrigin: true } });
  const returnedByItem = new Map(returnedItems.filter(item => item.physicalOrigin === 'RECEIVED_FROM_CUSTOMER').map(item => [item.saleItemId, item.quantity]));
  await tx.fulfillmentItem.updateMany({ where: { fulfillmentId: row.id, delivered: 0 }, data: { checked: 0 } });
  for (const material of materials.filter(item => item.delivered > 0)) {
    const received = material.delivered - (returnedByItem.get(material.saleItemId) ?? 0);
    if (received < 0) throw new ConflictError('Saldo recebido mudou. Confira novamente os materiais devolvidos.');
    await tx.fulfillmentItem.update({ where: { id: material.id }, data: { delivered: received, checked: received } });
  }
  const balances = await tx.saleReturnItem.groupBy({ by: ['saleItemId'], where: { return: { saleId } }, _sum: { quantity: true } });
  const refunds = new Map(balances.map(item => [item.saleItemId, item._sum.quantity ?? 0]));
  const remaining = materials.map(item => ({ remaining: item.quantity - (refunds.get(item.saleItemId) ?? 0), received: item.delivered - (returnedByItem.get(item.saleItemId) ?? 0) }));
  const status = remaining.every(item => item.remaining === 0) ? 'CANCELED' : remaining.every(item => item.received === item.remaining) ? 'RECEIVED' : row.mode === 'UNDEFINED' ? 'AWAITING_DETAILS' : 'CHECKING';
  const updated = await tx.fulfillment.update({ where: { id: row.id }, data: { status, version: { increment: 1 } } });
  await tx.fulfillmentEvent.create({ data: { fulfillmentId: row.id, version: updated.version, requestKey: `fulfillment-return:${returnId}`, fingerprint: returnId, kind: ['CANCELED', 'RECEIVED'].includes(status) ? 'RETURN_RECONCILED' : 'RETURN_REQUIRES_RECHECK', actorId, details: { returnId, status: updated.status } } });
}
export async function listFulfillments(page: number, status?: string) {
  const where = status ? { status } : { status: { notIn: ['CANCELED', 'RECEIVED'] } };
  const [rows, total] = await Promise.all([prisma.fulfillment.findMany({ where, orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }], skip: (page - 1) * 20, take: 20, select: { id: true, priority: true, saleId: true, status: true, mode: true, version: true, region: true, scheduledAt: true, createdAt: true, sale: { select: { referenceCode: true, status: true, customerNameSnapshot: true } }, _count: { select: { items: true } } } }), prisma.fulfillment.count({ where })]);
  return { fulfillments: rows, total, page, totalPages: Math.ceil(total / 20) };
}
export async function getFulfillment(id: string) {
  const row = await prisma.fulfillment.findUnique({ where: { id }, include: { items: true, sale: { select: { id: true, status: true, referenceCode: true, customerNameSnapshot: true } }, events: { orderBy: { version: 'desc' }, take: 20, select: { id: true, version: true, kind: true, details: true, createdAt: true } } } });
  if (!row) throw new NotFoundError('Separação não encontrada');
  const returned = await prisma.saleReturnItem.groupBy({ by: ['saleItemId'], where: { return: { saleId: row.saleId } }, _sum: { quantity: true } });
  const quantities = new Map(returned.map(item => [item.saleItemId, item._sum.quantity ?? 0]));
  return { ...row, items: row.items.map(item => ({ ...item, remainingQuantity: item.quantity - (quantities.get(item.saleItemId) ?? 0) })) };
}
export async function listFulfillmentHistory(id: string, page: number) {
  if (!await prisma.fulfillment.findUnique({ where: { id }, select: { id: true } })) throw new NotFoundError('Separação não encontrada');
  const where = { fulfillmentId: id };
  const [events, total] = await Promise.all([
    prisma.fulfillmentEvent.findMany({ where, orderBy: { version: 'desc' }, skip: (page - 1) * 20, take: 20, select: { id: true, version: true, kind: true, details: true, createdAt: true } }),
    prisma.fulfillmentEvent.count({ where }),
  ]);
  return { events, total, page, totalPages: Math.ceil(total / 20) };
}
async function mutateFulfillment(id: string, actorId: string, input: FulfillmentDetailsInput | FulfillmentOperationInput, details: boolean) {
  const key = createHash('sha256').update(`fulfillment:${actorId}:${input.requestKey}`).digest('hex');
  const { requestKey: _, expectedVersion: _version, confirmed: _confirmed, ...values } = input;
  const fingerprint = createHash('sha256').update(JSON.stringify({ id, details, ...values })).digest('hex');
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`fulfillment-request:${key}`}))`;
    const identity = await tx.fulfillment.findUnique({ where: { id }, select: { saleId: true } });
    if (!identity) throw new NotFoundError('Separação não encontrada');
    // Sale transitions/returns and warehouse operations use the same lock order.
    await tx.$queryRaw`SELECT id FROM sales WHERE id=${identity.saleId} FOR UPDATE`;
    await tx.$queryRaw`SELECT id FROM fulfillments WHERE id=${id} FOR UPDATE`;
    const existing = await tx.fulfillmentEvent.findUnique({ where: { requestKey: key } });
    if (existing) { if (existing.fingerprint !== fingerprint) throw new ConflictError('Este envio já foi usado para outra operação.'); return { id, version: existing.version }; }
    const row = await tx.fulfillment.findUniqueOrThrow({ where: { id }, include: { items: true, sale: { select: { status: true } } } });
    if (row.version !== input.expectedVersion) throw new ConflictError('A separação mudou. Recarregue e confira os materiais.');
    if (row.sale.status !== 'PAID') throw new ConflictError('A venda precisa estar paga para liberar a operação do depósito.');
    if (row.status === 'CANCELED') throw new ConflictError('Separação cancelada.');
    if ((details || (input as FulfillmentOperationInput).action !== 'ISSUE') && await tx.deliveryRunStop.count({ where: { fulfillmentId: id, active: true } })) throw new ConflictError('Entrega vinculada a um romaneio ativo. Cancele o planejamento antes de alterar os materiais ou dados.');
    const returned = await tx.saleReturnItem.groupBy({ by: ['saleItemId'], where: { return: { saleId: row.saleId } }, _sum: { quantity: true } });
    const refunds = new Map(returned.map(item => [item.saleItemId, item._sum.quantity ?? 0]));
    let nextStatus = row.status;
    if (details) {
      if (!['AWAITING_DETAILS', 'PICKING', 'CHECKING', 'READY'].includes(row.status)) throw new ConflictError('Esta etapa não permite alterar os dados de retirada/entrega.');
      const configuration = input as FulfillmentDetailsInput;
      if (row.driverId && configuration.mode !== row.mode) throw new ConflictError('Remova a atribuição do motorista antes de mudar para retirada.');
      await tx.fulfillment.update({ where: { id }, data: { ...(configuration.priority ? { priority: { LOW: 0, NORMAL: 1, HIGH: 2 }[configuration.priority] } : {}), mode: configuration.mode, address: configuration.mode === 'DELIVERY' ? configuration.address : null, region: configuration.region, scheduledAt: configuration.scheduledAt ? new Date(configuration.scheduledAt) : null, notes: configuration.notes } });
      if (row.status === 'AWAITING_DETAILS') nextStatus = 'PICKING';
    } else {
      if (row.status === 'AWAITING_DETAILS') throw new ConflictError('Confira primeiro se o cliente retira ou recebe os materiais.');
      const operation = input as FulfillmentOperationInput;
      if (['PICK', 'CHECK'].includes(operation.action)) {
        if (!['PICKING', 'CHECKING', 'READY'].includes(row.status)) throw new ConflictError('Separação encerrada para edição.');
        if (!operation.items.length) throw new ValidationError('Informe as quantidades dos materiais.');
        for (const line of operation.items) {
          const item = row.items.find(candidate => candidate.id === line.id);
          if (!item) throw new ValidationError('Material não pertence à separação.');
          if (line.quantity < item.delivered) throw new ConflictError('A quantidade não pode ficar abaixo dos materiais já recebidos pelo cliente.');
          const remaining = item.quantity - (refunds.get(item.saleItemId) ?? 0);
          if (line.quantity > remaining || (operation.action === 'CHECK' && line.quantity > item.picked)) throw new ConflictError('Quantidade maior que o saldo vendido ou separado. Confira as devoluções.');
          if (operation.action === 'PICK' && line.quantity < item.checked) throw new ConflictError('A quantidade já conferida não pode ficar maior que a separada. Corrija a conferência primeiro.');
          await tx.fulfillmentItem.update({ where: { id: item.id }, data: { ...(operation.action === 'PICK' ? { picked: line.quantity } : { checked: line.quantity }), ...(line.location !== undefined ? { location: line.location } : {}) } });
        }
        nextStatus = 'CHECKING';
      } else if (operation.action === 'READY') {
        if (!['PICKING', 'CHECKING', 'READY'].includes(row.status)) throw new ConflictError('Esta etapa não permite liberar materiais para expedição.');
        const items = await tx.fulfillmentItem.findMany({ where: { fulfillmentId: id } });
        if (!items.length || items.some(item => item.checked !== item.quantity - (refunds.get(item.saleItemId) ?? 0))) throw new ConflictError('Confira todo o saldo dos materiais antes de liberar para expedição.');
        if (items.every(item => item.quantity - (refunds.get(item.saleItemId) ?? 0) === 0)) throw new ConflictError('Não há materiais pendentes após as devoluções.');
        nextStatus = 'READY';
      }
    }
    const updated = await tx.fulfillment.update({ where: { id }, data: { status: nextStatus, version: { increment: 1 } } });
    await tx.fulfillmentEvent.create({ data: { fulfillmentId: id, version: updated.version, requestKey: key, fingerprint, actorId, kind: details ? 'DETAILS_CONFIRMED' : (input as FulfillmentOperationInput).action, details: values } });
    await tx.integrationAudit.create({ data: { actorId, jobId: id, action: details ? 'FULFILLMENT_CONFIGURED' : `FULFILLMENT_${(input as FulfillmentOperationInput).action}` } });
    return { id, version: updated.version };
  });
}
export const configureFulfillment = (id: string, actorId: string, raw: FulfillmentDetailsInput) => mutateFulfillment(id, actorId, fulfillmentDetailsSchema.parse(raw), true);
export const operateFulfillment = (id: string, actorId: string, raw: FulfillmentOperationInput) => mutateFulfillment(id, actorId, fulfillmentOperationSchema.parse(raw), false);
