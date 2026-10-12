import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { saleReturnSchema, saleReturnPreviewSchema, type SaleReturnInput, type SaleReturnPreviewInput } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.util.js';
import { allocateDiscountedLines, cumulativeReturnCents } from './partner-finance-math.js';
import { reversePartnerSale } from './partner-program.service.js';
import { enqueueCatalogChange } from './integration-outbox.service.js';

const serialize = <T extends { refundCents: bigint; items: { refundCents: bigint }[] }>(row: T) => ({ ...row, refundCents: String(row.refundCents), items: row.items.map(item => ({ ...item, refundCents: String(item.refundCents) })) });
export async function listSaleReturns(saleId: string, page: number) {
  const sale = await prisma.sale.findUnique({ where: { id: saleId }, select: { id: true, returnVersion: true } });
  if (!sale) throw new NotFoundError('Venda não encontrada');
  const [returns, total] = await Promise.all([prisma.saleReturn.findMany({ where: { saleId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20, include: { items: true } }), prisma.saleReturn.count({ where: { saleId } })]);
  const quantities = await prisma.saleReturnItem.groupBy({ by: ['saleItemId'], where: { return: { saleId } }, _sum: { quantity: true } });
  return { version: sale.returnVersion, returns: returns.map(serialize), total, page, totalPages: Math.ceil(total / 20), quantities: quantities.map(row => ({ saleItemId: row.saleItemId, quantity: row._sum.quantity ?? 0 })) };
}
async function prepareSaleReturn(tx: Prisma.TransactionClient, saleId: string, input: SaleReturnPreviewInput) {
    const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { items: true } });
    if (!sale) throw new NotFoundError('Venda não encontrada');
    if (sale.returnVersion !== input.expectedVersion) throw new ConflictError('As devoluções mudaram. Recarregue e confira novamente.');
    if (sale.status !== 'PAID') throw new ConflictError('Devolução parcial exige venda paga. Confira o atendimento antes de registrar.');
    const totalCents = Math.round(sale.total * 100);
    if (!Number.isSafeInteger(totalCents) || totalCents < 0) throw new ValidationError('Valor de venda fora do limite.');
    const allocations = allocateDiscountedLines(sale.items.map(item => {
      const cents = Math.round(item.unitPrice * 100);
      if (!Number.isSafeInteger(cents) || cents < 0) throw new ValidationError('Preço de item fora do limite.');
      return { id: item.id, cents: BigInt(cents) * BigInt(item.quantity) };
    }), BigInt(totalCents));
    const quantities = await tx.saleReturnItem.groupBy({ by: ['saleItemId'], where: { return: { saleId } }, _sum: { quantity: true } });
    const returned = new Map(quantities.map(row => [row.saleItemId, row._sum.quantity ?? 0]));
    const items = input.items.map(line => {
      const item = sale.items.find(candidate => candidate.id === line.saleItemId);
      if (!item) throw new ValidationError('Item não pertence à venda.');
      const already = returned.get(item.id) ?? 0;
      if (already + line.quantity > item.quantity) throw new ConflictError('Quantidade maior que o saldo vendido. Recarregue as devoluções.');
      if (line.restock && !item.productId) throw new ValidationError('Produto indisponível para retorno ao estoque.');
      const net = allocations.get(item.id)!;
      const refundCents = cumulativeReturnCents(net, item.quantity, already + line.quantity) - cumulativeReturnCents(net, item.quantity, already);
      return { ...line, productId: item.productId, refundCents };
    });
    const refundCents = items.reduce((sum, item) => sum + item.refundCents, 0n);
    return { sale, items, refundCents };
}
export async function previewSaleReturn(saleId: string, raw: SaleReturnPreviewInput) {
  const input = saleReturnPreviewSchema.parse(raw);
  return prisma.$transaction(async tx => {
    const { items, refundCents, sale } = await prepareSaleReturn(tx, saleId, input);
    return { version: sale.returnVersion, refundCents: String(refundCents), items: items.map(item => ({ saleItemId: item.saleItemId, quantity: item.quantity, restock: item.restock, refundCents: String(item.refundCents) })) };
  }, { isolationLevel: 'RepeatableRead' });
}
export async function createSaleReturn(saleId: string, actorId: string, raw: SaleReturnInput) {
  const input = saleReturnSchema.parse(raw);
  const requestKey = createHash('sha256').update(`${actorId}:${input.requestKey}`).digest('hex');
  const fingerprint = createHash('sha256').update(JSON.stringify({ saleId, reason: input.reason, items: [...input.items].sort((a, b) => a.saleItemId.localeCompare(b.saleItemId)) })).digest('hex');
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`sale-return:${requestKey}`}))`;
    const previous = await tx.saleReturn.findUnique({ where: { requestKey }, include: { items: true } });
    if (previous) { if (previous.fingerprint !== fingerprint) throw new ConflictError('Este envio já foi usado para outra devolução.'); return serialize(previous); }
    await tx.$queryRaw`SELECT id FROM sales WHERE id = ${saleId} FOR UPDATE`;
    const { items, refundCents, sale } = await prepareSaleReturn(tx, saleId, input);
    const result = await tx.saleReturn.create({ data: { saleId, requestKey, fingerprint, actorId, reason: input.reason, refundCents, items: { create: items.map(({ productId: _, ...item }) => item) } }, include: { items: true } });
    for (const item of [...items].sort((a, b) => (a.productId ?? '').localeCompare(b.productId ?? ''))) {
      if (!item.restock || !item.productId) continue;
      await tx.$queryRaw`SELECT id FROM products WHERE id = ${item.productId} FOR UPDATE`;
      const product = await tx.product.findUniqueOrThrow({ where: { id: item.productId } });
      if (product.deletedAt) throw new ValidationError('Produto excluído. Registre a devolução sem retorno ao estoque.');
      const updated = await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
      await tx.stockMovement.create({ data: { productId: item.productId, saleId, type: 'RETURN', quantity: item.quantity, stockBefore: product.stock, stockAfter: updated.stock, reason: `Devolução ${sale.referenceCode} · ${result.id}` } });
      await enqueueCatalogChange(tx, item.productId);
    }
    const refunds = await tx.saleReturn.aggregate({ where: { saleId }, _sum: { refundCents: true } });
    await reversePartnerSale(tx, saleId, refunds._sum.refundCents ?? 0n, `sale-return:${result.id}`, actorId);
    await tx.integrationAudit.create({ data: { actorId, jobId: result.id, action: 'SALE_RETURN_RECORDED' } });
    await tx.sale.update({ where: { id: saleId }, data: { returnVersion: { increment: 1 } } });
    return serialize(result);
  });
}
