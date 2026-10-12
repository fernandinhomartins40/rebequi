import { createHash, randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { createEstimateSchema, materialInputSchema, technicalParametersSchema, type CreateEstimateInput, type ProjectInput, type TechnicalSpecInput, type LaborQuoteInput } from '@rebequi/shared/schemas';
import { calculateMaterials, isValidWhatsapp, priceLaborQuote } from '@rebequi/shared/utils';
import { prisma } from '../lib/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.util.js';

async function writablePartner(tx: Prisma.TransactionClient, userId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner:${userId}`}))`;
  const partner = await tx.partnerProfile.findUnique({ where: { userId } });
  if (partner?.status !== 'APPROVED') throw new ForbiddenError('Aguarde a aprovação do cadastro para criar obras e estimativas.');
  return partner;
}
export async function listPartnerProjects(userId: string, page: number) {
  const where = { partner: { userId } };
  const [projects, total] = await Promise.all([prisma.partnerProject.findMany({ where, skip: (page - 1) * 20, take: 20, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    include: { estimates: { take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, result: true, quoteId: true, createdAt: true } } } }), prisma.partnerProject.count({ where })]);
  return { projects, total, page, totalPages: Math.ceil(total / 20) };
}
export async function getPartnerProject(userId: string, projectId: string) {
  const project = await prisma.partnerProject.findFirst({ where: { id: projectId, partner: { userId } },
    include: { estimates: { take: 5, orderBy: { createdAt: 'desc' }, select: { id: true, result: true, quoteId: true, createdAt: true } } } });
  if (!project) throw new NotFoundError('Obra não encontrada');
  return project;
}
export async function savePartnerProject(userId: string, projectId: string | undefined, input: ProjectInput) {
  return prisma.$transaction(async tx => {
    const partner = await writablePartner(tx, userId);
    const { expectedVersion, requestKey: suppliedKey, ...values } = input;
    if (!projectId) {
      if (expectedVersion !== 0 || input.archived || !suppliedKey) throw new ValidationError('Nova obra inválida');
      const requestKey = createHash('sha256').update(`${userId}:${suppliedKey}`).digest('hex');
      const fingerprint = createHash('sha256').update(JSON.stringify(values)).digest('hex');
      const previous = await tx.partnerProject.findUnique({ where: { requestKey } });
      if (previous) {
        if (previous.fingerprint !== fingerprint) throw new ConflictError('Este envio já criou uma obra com outros dados.');
        return previous;
      }
      return tx.partnerProject.create({ data: { ...values, partnerId: partner.id, requestKey, fingerprint } });
    }
    const updated = await tx.partnerProject.updateMany({ where: { id: projectId, partnerId: partner.id, version: expectedVersion }, data: { ...values, version: { increment: 1 } } });
    if (!updated.count) throw new ConflictError('A obra mudou ou não está disponível. Recarregue antes de salvar.');
    return tx.partnerProject.findUniqueOrThrow({ where: { id: projectId } });
  });
}
export async function getTechnicalSpec(productId: string) {
  return prisma.productTechnicalSpec.findUnique({ where: { productId } });
}
export async function saveTechnicalSpec(productId: string, actorId: string, input: TechnicalSpecInput) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`technical:${productId}`}))`;
    if (!await tx.product.findFirst({ where: { id: productId, deletedAt: null }, select: { id: true } })) throw new NotFoundError('Produto não encontrado');
    const current = await tx.productTechnicalSpec.findUnique({ where: { productId } });
    if ((current?.version ?? 0) !== input.expectedVersion) throw new ConflictError('A ficha técnica mudou. Recarregue antes de salvar.');
    const data = { parameters: input.parameters, sourceUrl: input.sourceUrl, checkedById: actorId, checkedAt: new Date() };
    const spec = current ? await tx.productTechnicalSpec.update({ where: { productId }, data: { ...data, version: { increment: 1 } } }) : await tx.productTechnicalSpec.create({ data: { ...data, productId } });
    await tx.integrationAudit.create({ data: { actorId, jobId: `technical:${productId}`, action: 'TECHNICAL_SPEC_CONFIRMED' } });
    return spec;
  });
}
export async function getCalculationCatalog(service: 'PAINT' | 'TILE') {
  const products = await prisma.product.findMany({ where: { isActive: true, deletedAt: null, technicalSpec: { is: { parameters: { path: ['kind'], equals: service } } } }, take: 100, orderBy: { name: 'asc' },
    select: { id: true, name: true, price: true, stock: true, reservedStock: true, technicalSpec: { select: { parameters: true, sourceUrl: true, version: true } } } });
  return products.flatMap(product => {
    const spec = technicalParametersSchema.safeParse(product.technicalSpec?.parameters);
    if (!spec.success || spec.data.kind !== service) return [];
    return [{ id: product.id, name: product.name, price: product.price, availableStock: Math.max(0, product.stock - product.reservedStock), technicalSpec: { parameters: spec.data, sourceUrl: product.technicalSpec!.sourceUrl, version: product.technicalSpec!.version } }];
  });
}
export async function saveMaterialEstimate(userId: string, input: CreateEstimateInput) {
  const validated = createEstimateSchema.parse(input);
  const fingerprint = createHash('sha256').update(JSON.stringify({ projectId: validated.projectId, productId: validated.productId, input: validated.input })).digest('hex');
  const requestKey = createHash('sha256').update(`${userId}:${validated.requestKey}`).digest('hex');
  return prisma.$transaction(async tx => {
    const partner = await writablePartner(tx, userId);
    const existing = await tx.materialEstimate.findUnique({ where: { requestKey } });
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new ConflictError('Este envio já foi usado para outra estimativa.');
      return existing;
    }
    const project = await tx.partnerProject.findFirst({ where: { id: input.projectId, partnerId: partner.id, archived: false } });
    if (!project) throw new NotFoundError('Obra não encontrada ou arquivada');
    if (project.service !== input.input.service) throw new ValidationError('O serviço não corresponde à obra selecionada.');
    const product = await tx.product.findFirst({ where: { id: input.productId, isActive: true, deletedAt: null }, include: { technicalSpec: true } });
    const spec = technicalParametersSchema.safeParse(product?.technicalSpec?.parameters);
    if (!product?.technicalSpec || !spec.success || spec.data.kind !== input.input.service) throw new ValidationError('Escolha um produto com ficha técnica validada para este serviço.');
    const calculated = calculateMaterials(input.input, spec.data);
    return tx.materialEstimate.create({ data: { projectId: project.id, requestKey, fingerprint,
      input: { ...input.input, productId: product.id }, result: { ...calculated, productId: product.id, productName: product.name,
        specVersion: product.technicalSpec.version, sourceUrl: product.technicalSpec.sourceUrl, parameters: spec.data,
        unitPriceAtCalculation: product.price, availableStockAtCalculation: Math.max(0, product.stock - product.reservedStock), checkedAt: new Date().toISOString() } } });
  });
}
export async function requestMaterialQuote(userId: string, estimateId: string, quantity: number) {
  return prisma.$transaction(async tx => {
    const partner = await writablePartner(tx, userId);
    const estimate = await tx.materialEstimate.findFirst({ where: { id: estimateId, project: { partnerId: partner.id } }, include: { project: true } });
    if (!estimate) throw new NotFoundError('Estimativa não encontrada');
    if (estimate.quoteId) {
      const previous = await tx.quoteItem.findFirst({ where: { quoteRequestId: estimate.quoteId }, select: { quantity: true } });
      if (previous?.quantity !== quantity) throw new ConflictError('Esta lista já foi enviada com outra quantidade. Confira o orçamento existente.');
      return { quoteId: estimate.quoteId };
    }
    if (estimate.project.archived) throw new ValidationError('Reabra a obra antes de solicitar cotação.');
    const savedInput = materialInputSchema.parse(Object.fromEntries(Object.entries(estimate.input as Record<string, unknown>).filter(([key]) => key !== 'productId')));
    const productId = (estimate.input as { productId: string }).productId;
    const product = await tx.product.findFirst({ where: { id: productId, isActive: true, deletedAt: null }, include: { technicalSpec: true } });
    if (!product?.technicalSpec || product.technicalSpec.version !== (estimate.result as { specVersion: number }).specVersion) throw new ConflictError('A ficha ou o produto mudou. Calcule novamente antes de enviar.');
    calculateMaterials(savedInput, technicalParametersSchema.parse(product.technicalSpec.parameters));
    const customer = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { whatsapp: true } });
    if (!customer.whatsapp || !isValidWhatsapp(customer.whatsapp)) throw new ValidationError('Informe um WhatsApp válido na sua conta antes de solicitar cotação.');
    const quote = await tx.quoteRequest.create({ data: { referenceCode: `ORC-${randomBytes(6).toString('hex').toUpperCase()}`, userId,
      status: 'SUBMITTED', source: 'partner_estimate', title: estimate.project.title,
      customerNote: 'Lista estimada pelo profissional e conferida antes do envio. Cotação de produtos; mão de obra não incluída.',
      ocrStatus: 'SKIPPED', documentUrl: '', submittedAt: new Date(),
      items: { create: [{ productId: product.id, name: product.name, quantity, unit: 'embalagem', position: 0 }] } } });
    await tx.materialEstimate.update({ where: { id: estimate.id }, data: { quoteId: quote.id } });
    await tx.user.updateMany({ where: { id: userId, customerStage: 'NEW', customerStageManual: false }, data: { customerStage: 'QUOTING' } });
    return { quoteId: quote.id };
  });
}

export async function listLaborQuotes(userId: string, projectId: string, page: number) {
  await getPartnerProject(userId, projectId);
  const [quotes, total] = await Promise.all([prisma.partnerLaborQuote.findMany({ where: { projectId }, skip: (page - 1) * 20, take: 20, orderBy: { version: 'desc' } }), prisma.partnerLaborQuote.count({ where: { projectId } })]);
  return { quotes: quotes.map(quote => ({ ...quote, totalCents: Number(quote.totalCents), fingerprint: undefined, requestKey: undefined })), page, total, totalPages: Math.ceil(total / 20) };
}
export async function saveLaborQuote(userId: string, input: LaborQuoteInput) {
  const { requestKey: suppliedKey, expectedLatestVersion, ...values } = input;
  const requestKey = createHash('sha256').update(`${userId}:${suppliedKey}`).digest('hex');
  const fingerprint = createHash('sha256').update(JSON.stringify(values)).digest('hex');
  return prisma.$transaction(async tx => {
    const partner = await writablePartner(tx, userId);
    const existing = await tx.partnerLaborQuote.findUnique({ where: { requestKey } });
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new ConflictError('Este envio já foi usado para outro orçamento.');
      return { ...existing, totalCents: Number(existing.totalCents), fingerprint: undefined, requestKey: undefined };
    }
    const project = await tx.partnerProject.findFirst({ where: { id: input.projectId, partnerId: partner.id, archived: false } });
    if (!project) throw new NotFoundError('Obra não encontrada ou arquivada');
    const latest = await tx.partnerLaborQuote.findFirst({ where: { projectId: project.id }, orderBy: { version: 'desc' }, select: { version: true } });
    if ((latest?.version ?? 0) !== expectedLatestVersion) throw new ConflictError('Já existe uma versão mais recente. Recarregue antes de criar outra.');
    const priced = priceLaborQuote(input.items);
    const professional = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true } });
    const validUntil = new Date(Date.now() + input.validityDays * 86400000);
    const quote = await tx.partnerLaborQuote.create({ data: { projectId: project.id, requestKey, fingerprint, title: input.title,
      projectTitleSnapshot: project.title, professionalNameSnapshot: professional.name, clientNameSnapshot: project.clientName,
      items: input.items.map((item, index) => ({ ...item, totalCents: priced.lineTotals[index] })), notes: input.notes,
      totalCents: BigInt(priced.totalCents), version: expectedLatestVersion + 1, validUntil } });
    return { ...quote, totalCents: priced.totalCents, fingerprint: undefined, requestKey: undefined };
  });
}
