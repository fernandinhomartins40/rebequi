import { createHash, randomBytes } from 'node:crypto';
import { commercialOrderSchema, type CommercialOrderInput } from '@rebequi/shared/schemas';
import { isValidWhatsapp, normalizeWhatsapp } from '@rebequi/shared/utils';
import { prisma } from '../lib/prisma.js';
import { requireCommercialAccess, type CommercialActor } from './commercial-access.service.js';
import { ConflictError, ForbiddenError, ValidationError } from '../utils/errors.util.js';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

export async function createCommercialOrder(actor: CommercialActor, raw: CommercialOrderInput) {
  const input = commercialOrderSchema.parse(raw);
  const key = hash(`commercial-order:${actor.userId}:${input.requestKey}`);
  const fingerprint = hash(JSON.stringify({ customerId: input.customerId, note: input.note, items: input.items }));
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`commercial-order:${key}`}))`;
    await tx.$queryRaw`SELECT id FROM users WHERE id=${actor.userId} FOR UPDATE`;
    const operator = await tx.user.findUnique({ where: { id: actor.userId }, select: { role: true, isActive: true } });
    if (!operator?.isActive || operator.role !== actor.role || !['ADMIN', 'MANAGER', 'SALES'].includes(operator.role))
      throw new ForbiddenError('Seu acesso mudou. Entre novamente.');
    await tx.$queryRaw`SELECT id FROM users WHERE id=${input.customerId} FOR UPDATE`;
    const customerAccess = await requireCommercialAccess('customer', input.customerId, actor, tx);
    const customer = await tx.user.findUnique({ where: { id: customerAccess.id },
      select: { id: true, name: true, whatsapp: true, isActive: true, assignmentVersion: true } });
    if (!customer?.isActive) throw new ConflictError('Cliente desativado.');
    const repeated = await tx.customerOrder.findUnique({ where: { commercialCreationKey: key },
      select: { id: true, referenceCode: true, commercialCreationFingerprint: true } });
    if (repeated) {
      if (repeated.commercialCreationFingerprint !== fingerprint) throw new ConflictError('Esta chave de envio já foi usada para outro pedido.');
      await requireCommercialAccess('order', repeated.id, actor, tx);
      return { id: repeated.id, referenceCode: repeated.referenceCode };
    }
    if (customer.assignmentVersion !== input.expectedCustomerVersion)
      throw new ConflictError('O responsável pelo cliente mudou. Atualize a seleção.');
    const whatsapp = normalizeWhatsapp(customer.whatsapp ?? '');
    if (!isValidWhatsapp(whatsapp)) throw new ValidationError('O cliente precisa ter WhatsApp válido antes de criar o pedido.');
    const ids = input.items.map(item => item.productId).sort();
    for (const id of ids) await tx.$queryRaw`SELECT id FROM products WHERE id=${id} FOR UPDATE`;
    const products = await tx.product.findMany({ where: { id: { in: ids } },
      select: { id: true, name: true, slug: true, price: true, originalPrice: true, stock: true,
        reservedStock: true, isActive: true, deletedAt: true, category: { select: { isActive: true, deletedAt: true } },
        images: { where: { isPrimary: true }, take: 1, select: { url: true } } } });
    const byId = new Map(products.map(product => [product.id, product]));
    const items = input.items.map(item => {
      const product = byId.get(item.productId);
      if (!product?.isActive || product.deletedAt || !product.category.isActive || product.category.deletedAt)
        throw new ConflictError('Um produto não está mais disponível. Confira os materiais.');
      if (!Number.isFinite(product.price) || product.price <= 0)
        throw new ValidationError(`O produto ${product.name} precisa ter preço válido.`);
      const currentPriceCents = Math.round(product.price * 100);
      if (!Number.isSafeInteger(currentPriceCents) || String(currentPriceCents) !== item.expectedUnitPriceCents)
        throw new ConflictError(`O preço de ${product.name} mudou. Confira o pedido novamente.`);
      if (item.quantity > product.stock - product.reservedStock)
        throw new ConflictError(`O produto ${product.name} não tem a quantidade disponível.`);
      return { productId: product.id, productNameSnapshot: product.name, productSlugSnapshot: product.slug,
        productImageUrlSnapshot: product.images[0]?.url ?? null, quantity: item.quantity,
        unitPrice: product.price, originalPrice: product.originalPrice };
    });
    const order = await tx.customerOrder.create({ data: {
      commercialCreationKey: key, commercialCreationFingerprint: fingerprint,
      referenceCode: `PED-${randomBytes(10).toString('hex').toUpperCase()}`,
      userId: customer.id, assignedSellerId: actor.userId, assignmentVersion: 1,
      customerNameSnapshot: customer.name, customerWhatsapp: whatsapp, customerNote: input.note || null,
      source: 'seller_assisted', status: 'IN_RECOVERY', items: { create: items },
    }, select: { id: true, referenceCode: true } });
    await tx.commercialAssignmentAudit.create({ data: { resourceKind: 'order', resourceId: order.id,
      previousSellerId: null, nextSellerId: actor.userId, version: 1, actorId: actor.userId,
      reason: 'Pedido criado pelo atendimento para cliente identificado' } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: order.id, action: 'COMMERCIAL_ORDER_CREATED' } });
    await tx.user.updateMany({ where: { id: customer.id, customerStage: 'NEW', customerStageManual: false },
      data: { customerStage: 'QUOTING' } });
    return order;
  });
}
