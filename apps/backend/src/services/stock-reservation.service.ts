import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.util.js';
import { enqueueCatalogChange } from './integration-outbox.service.js';

export async function reserveOrderStock(orderId: string) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM customer_orders WHERE id = ${orderId} FOR UPDATE`;
    const order = await tx.customerOrder.findUnique({ where: { id: orderId }, include: { items: true, reservations: true, sale: true } });
    if (!order) throw new NotFoundError('Pedido não encontrado');
    if (order.sale || ['COMPLETED', 'CANCELED'].includes(order.status)) throw new ValidationError('Pedido encerrado não pode reservar estoque');
    if (order.reservations.some(r => r.status === 'ACTIVE' && r.expiresAt <= new Date())) await releaseOrderReservations(tx, orderId, 'EXPIRED');
    const active = order.reservations.find(r => r.status === 'ACTIVE' && r.expiresAt > new Date());
    if (active) return { expiresAt: active.expiresAt, reserved: true };
    const quantities = new Map<string, number>();
    for (const item of order.items) {
      if (!item.productId) throw new ValidationError('Vincule todos os itens a produtos antes de reservar');
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    }
    if (!quantities.size) throw new ValidationError('Pedido sem itens');
    const expiresAt = new Date(Date.now() + 30 * 60_000);
    for (const [productId, quantity] of [...quantities].sort(([a], [b]) => a.localeCompare(b))) {
      await tx.$queryRaw`SELECT id FROM products WHERE id = ${productId} FOR UPDATE`;
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product?.isActive || product.deletedAt || product.stock - product.reservedStock < quantity) throw new ConflictError('Estoque insuficiente para reservar todos os itens');
      await tx.product.update({ where: { id: productId }, data: { reservedStock: { increment: quantity } } });
      await tx.stockReservation.upsert({ where: { orderId_productId: { orderId, productId } },
        create: { orderId, productId, quantity, expiresAt }, update: { quantity, expiresAt, status: 'ACTIVE' } });
      await enqueueCatalogChange(tx, productId);
    }
    return { expiresAt, reserved: true };
  });
}

// Call only while holding the order lock, before locking its products.
export async function releaseOrderReservations(tx: Prisma.TransactionClient, orderId: string, status = 'RELEASED') {
  const reservations = await tx.stockReservation.findMany({ where: { orderId, status: 'ACTIVE' }, orderBy: { productId: 'asc' } });
  for (const reservation of reservations) {
    await tx.product.update({ where: { id: reservation.productId }, data: { reservedStock: { decrement: reservation.quantity } } });
    await tx.stockReservation.update({ where: { id: reservation.id }, data: { status } });
    await enqueueCatalogChange(tx, reservation.productId);
  }
}

let expiring = false;
export async function expireStockReservations() {
  if (expiring) return;
  expiring = true;
  try {
    const orders = await prisma.stockReservation.findMany({ where: { status: 'ACTIVE', expiresAt: { lte: new Date() } }, distinct: ['orderId'], take: 20, select: { orderId: true } });
    for (const { orderId } of orders) await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM customer_orders WHERE id = ${orderId} FOR UPDATE`;
      const expired = await tx.stockReservation.findFirst({ where: { orderId, status: 'ACTIVE', expiresAt: { lte: new Date() } } });
      if (expired) await releaseOrderReservations(tx, orderId, 'EXPIRED');
    });
  } finally { expiring = false; }
}
