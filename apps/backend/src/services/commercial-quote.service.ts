import { createHash, randomBytes } from 'node:crypto';
import { commercialQuoteSchema, type CommercialQuoteInput } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { assignedScope, requireCommercialAccess, type CommercialActor } from './commercial-access.service.js';
import { ConflictError, ForbiddenError } from '../utils/errors.util.js';
export async function commercialQuoteCustomers(actor: CommercialActor, page: number, search: string) {
  const where = { ...assignedScope(actor), role: 'CUSTOMER' as const, isActive: true, ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { whatsapp: { contains: search } }] } : {}) };
  const [customers, total] = await Promise.all([prisma.user.findMany({ where, orderBy: [{ name: 'asc' }, { id: 'asc' }], skip: (page - 1) * 20, take: 20, select: { id: true, name: true, whatsapp: true, assignmentVersion: true } }), prisma.user.count({ where })]);
  return { customers, page, totalPages: Math.ceil(total / 20) };
}
export async function createCommercialQuote(actor: CommercialActor, raw: CommercialQuoteInput) {
  const input = commercialQuoteSchema.parse(raw); const { requestKey, expectedCustomerVersion, confirmed: _confirmed, ...values } = input;
  const key = createHash('sha256').update(`commercial-quote:${actor.userId}:${requestKey}`).digest('hex');
  const fingerprint = createHash('sha256').update(JSON.stringify(values)).digest('hex');
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`commercial-quote:${key}`}))`;
    // Match the internal-seller -> customer locking order of redistribution.
    await tx.$queryRaw`SELECT id FROM users WHERE id=${actor.userId} FOR UPDATE`;
    const operator = await tx.user.findFirst({ where: { id: actor.userId, isActive: true, role: { in: ['ADMIN', 'MANAGER', 'SALES'] } }, select: { role: true } });
    if (!operator || operator.role !== actor.role) throw new ForbiddenError('Seu acesso mudou. Entre novamente.');
    await tx.$queryRaw`SELECT id FROM users WHERE id=${input.customerId} FOR UPDATE`;
    const customer = await requireCommercialAccess('customer', input.customerId, actor, tx);
    const active = await tx.user.findFirst({ where: { id: customer.id, isActive: true }, select: { id: true } });
    if (!active) throw new ConflictError('Cliente desativado.');
    const repeated = await tx.quoteRequest.findUnique({ where: { commercialCreationKey: key }, select: { id: true, referenceCode: true, commercialCreationFingerprint: true } });
    if (repeated) { if (repeated.commercialCreationFingerprint !== fingerprint) throw new ConflictError('Este envio já foi usado para outra solicitação.'); await requireCommercialAccess('quote', repeated.id, actor, tx); return { id: repeated.id, referenceCode: repeated.referenceCode }; }
    if (customer.assignmentVersion !== expectedCustomerVersion) throw new ConflictError('O responsável pelo cliente mudou. Atualize a seleção.');
    const ids = input.items.flatMap(item => item.productId ? [item.productId] : []);
    const products = await tx.product.findMany({ where: { id: { in: ids }, isActive: true, deletedAt: null }, select: { id: true, name: true } });
    if (products.length !== ids.length) throw new ConflictError('Um produto não está mais ativo. Confira os materiais.');
    const names = new Map(products.map(product => [product.id, product.name]));
    const quote = await tx.quoteRequest.create({ data: { userId: customer.id, assignedSellerId: actor.userId, assignmentVersion: 1, createdById: actor.userId, commercialCreationKey: key, commercialCreationFingerprint: fingerprint, referenceCode: `OR-${randomBytes(12).toString('hex').toUpperCase()}`, title: input.title, customerNote: input.note || null, source: 'seller_assisted', status: 'SUBMITTED', submittedAt: new Date(), ocrStatus: 'SKIPPED', documentUrl: '', items: { create: input.items.map((item, position) => ({ productId: item.productId, name: item.productId ? names.get(item.productId)! : item.name, quantity: item.quantity, unit: item.unit, position })) } }, select: { id: true, referenceCode: true } });
    await tx.commercialAssignmentAudit.create({ data: { resourceKind: 'quote', resourceId: quote.id, previousSellerId: null, nextSellerId: actor.userId, version: 1, actorId: actor.userId, reason: 'Solicitação criada pelo atendimento para cliente identificado' } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: quote.id, action: 'COMMERCIAL_QUOTE_CREATED' } });
    await tx.user.updateMany({ where: { id: customer.id, customerStage: 'NEW', customerStageManual: false }, data: { customerStage: 'QUOTING' } });
    return quote;
  });
}
