import { createHash, randomBytes } from 'node:crypto';
import type { ProposalInput } from '@rebequi/shared/schemas';
import { hasMerchantPermission } from '@rebequi/shared/constants';
import { isValidWhatsapp, normalizeWhatsapp } from '@rebequi/shared/utils';
import { prisma } from '../lib/prisma.js';
import { env } from '../config/env.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.util.js';
import { assignedScope, requireCommercialAccess, type CommercialActor } from './commercial-access.service.js';

type ProposalItem = { productId: string; productName: string; productSlug: string; imageUrl: string | null; quantity: number; unitPriceCents: number; referencePriceCents: number; totalCents: number };
export async function listQuoteProposals(quoteId: string, userId: string, role: string, page: number) {
  const quote = await prisma.quoteRequest.findFirst({ where: { id: quoteId, ...(hasMerchantPermission(role, 'quotes:manage') ? assignedScope({ userId, role }) : { userId }) },
    select: { id: true, proposalOrderId: true, acceptedProposalVersion: true, status: true } });
  if (!quote) throw new NotFoundError('Orçamento não encontrado');
  const [proposals, total] = await Promise.all([prisma.quoteProposal.findMany({ where: { quoteId }, skip: (page - 1) * 20, take: 20, orderBy: { version: 'desc' },
    select: { id: true, quoteId: true, version: true, items: true, notes: true, totalCents: true, validUntil: true, createdAt: true } }), prisma.quoteProposal.count({ where: { quoteId } })]);
  return { ...quote, proposals: proposals.map(proposal => ({ ...proposal, totalCents: Number(proposal.totalCents) })), total, page, totalPages: Math.ceil(total / 20) };
}
export async function createQuoteProposal(quoteId: string, actorId: string, input: ProposalInput, actor?: CommercialActor) {
  const { requestKey: suppliedKey, expectedLatestVersion, ...values } = input;
  const requestKey = createHash('sha256').update(`${actorId}:${suppliedKey}`).digest('hex');
  const fingerprint = createHash('sha256').update(JSON.stringify({ quoteId, ...values })).digest('hex');
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`proposal-request:${requestKey}`}))`;
    await tx.$queryRaw`SELECT id FROM quote_requests WHERE id = ${quoteId} FOR UPDATE`;
    await requireCommercialAccess('quote', quoteId, actor, tx);
    const quote = await tx.quoteRequest.findUnique({ where: { id: quoteId } });
    if (!quote || !quote.userId) throw new NotFoundError('Orçamento de cliente não encontrado');
    const existing = await tx.quoteProposal.findUnique({ where: { requestKey } });
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new ConflictError('Este envio já publicou outra proposta.');
      return { proposalId: existing.id, version: existing.version };
    }
    if (['DRAFT', 'ARCHIVED'].includes(quote.status) || quote.proposalOrderId) throw new ValidationError('Este orçamento não permite nova proposta.');
    const latest = await tx.quoteProposal.findFirst({ where: { quoteId }, orderBy: { version: 'desc' }, select: { version: true } });
    if ((latest?.version ?? 0) !== expectedLatestVersion) throw new ConflictError('A proposta mudou. Recarregue antes de publicar.');
    const products = await tx.product.findMany({ where: { id: { in: input.items.map(item => item.productId) }, isActive: true, deletedAt: null }, include: { images: { where: { isPrimary: true }, take: 1 } } });
    const items: ProposalItem[] = input.items.map(item => {
      const product = products.find(product => product.id === item.productId);
      if (!product || !Number.isFinite(product.price) || product.price < 0) throw new ValidationError('Associe cada item a um produto ativo do catálogo.');
      return { ...item, productName: product.name, productSlug: product.slug, imageUrl: product.images[0]?.url ?? null, referencePriceCents: Math.round(product.price * 100), totalCents: item.quantity * item.unitPriceCents };
    });
    const totalCents = items.reduce((total, item) => total + item.totalCents, 0);
    if (!Number.isSafeInteger(totalCents)) throw new ValidationError('Valor acima do limite permitido');
    const proposal = await tx.quoteProposal.create({ data: { quoteId, version: expectedLatestVersion + 1, requestKey, fingerprint, createdById: actorId,
      items, notes: input.notes, totalCents: BigInt(totalCents), validUntil: new Date(Date.now() + input.validityDays * 86400000) } });
    await tx.quoteRequest.update({ where: { id: quoteId }, data: { status: 'RESPONDED', reviewedAt: new Date() } });
    await tx.integrationAudit.create({ data: { actorId, jobId: `quote:${quoteId}`, action: `PROPOSAL_PUBLISHED_V${proposal.version}` } });
    return { proposalId: proposal.id, version: proposal.version };
  });
}
export async function acceptQuoteProposal(quoteId: string, userId: string, version: number) {
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM quote_requests WHERE id = ${quoteId} FOR UPDATE`;
    const quote = await tx.quoteRequest.findFirst({ where: { id: quoteId, userId } });
    if (!quote) throw new NotFoundError('Orçamento não encontrado');
    if (quote.proposalOrderId) {
      if (quote.acceptedProposalVersion !== version) throw new ConflictError('Este orçamento já foi aceito em outra versão.');
      return { orderId: quote.proposalOrderId };
    }
    if (quote.status !== 'RESPONDED') throw new ConflictError('A proposta não está disponível para aceite.');
    const proposal = await tx.quoteProposal.findFirst({ where: { quoteId }, orderBy: { version: 'desc' } });
    if (!proposal || proposal.version !== version || proposal.validUntil <= new Date()) throw new ConflictError('A proposta mudou ou venceu. Solicite uma nova cotação.');
    const customer = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, whatsapp: true, isActive: true } });
    if (!customer.isActive || !customer.whatsapp || !isValidWhatsapp(customer.whatsapp)) throw new ValidationError('Confira seu WhatsApp na conta antes de aceitar.');
    const items = proposal.items as unknown as ProposalItem[];
    // Product locks follow the same order as stock reservations/sales.
    for (const item of [...items].sort((a, b) => a.productId.localeCompare(b.productId))) {
      await tx.$queryRaw`SELECT id FROM products WHERE id = ${item.productId} FOR UPDATE`;
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product?.isActive || product.deletedAt || product.stock - product.reservedStock < item.quantity) throw new ConflictError('Estoque mudou. Peça à loja para revisar a proposta.');
      if (Math.round(product.price * 100) !== item.referencePriceCents) throw new ConflictError('Preço de referência mudou. Peça à loja para confirmar uma nova versão.');
    }
    const referenceCode = `PED-${randomBytes(6).toString('hex').toUpperCase()}`;
    const whatsappMessage = [`Pedido ${referenceCode}`, `Proposta ${quote.referenceCode}, versão ${version}, aceita por ${customer.name}.`,
      ...items.map(item => `${item.quantity} × ${item.productName}`), `Materiais: ${(Number(proposal.totalCents) / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. Confirmar atendimento; sem pagamento ou reserva automática.`].join('\n');
    const storeWhatsapp = normalizeWhatsapp(env.STORE_WHATSAPP);
    const whatsappUrl = isValidWhatsapp(storeWhatsapp) ? `https://wa.me/55${storeWhatsapp}?text=${encodeURIComponent(whatsappMessage)}` : null;
    const order = await tx.customerOrder.create({ data: { referenceCode, userId, whatsappMessage, whatsappUrl, assignedSellerId: quote.assignedSellerId,
      status: 'PENDING_WHATSAPP', source: 'quote_proposal', customerNameSnapshot: customer.name, customerWhatsapp: customer.whatsapp,
      customerNote: `Proposta ${quote.referenceCode} — versão ${version}. ${proposal.notes}`, items: { create: items.map(item => ({ productId: item.productId,
        productNameSnapshot: item.productName, productSlugSnapshot: item.productSlug, productImageUrlSnapshot: item.imageUrl, quantity: item.quantity,
        unitPrice: item.unitPriceCents / 100, originalPrice: item.referencePriceCents / 100 })) } } });
    await tx.quoteRequest.update({ where: { id: quoteId }, data: { proposalOrderId: order.id, acceptedProposalVersion: version, proposalAcceptedAt: new Date() } });
    await tx.integrationAudit.create({ data: { actorId: userId, jobId: `quote:${quoteId}`, action: `PROPOSAL_ACCEPTED_V${version}` } });
    return { orderId: order.id };
  });
}
