import { createHash } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import { partnerProgramRuleSchema, partnerPayoutSchema, type PartnerProgramRuleInput, type PartnerPayoutInput } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.util.js';
import { benefitsForBasis } from './partner-finance-math.js';

const PROGRAM_LOCK = 'partner-program:rules';
export async function currentPartnerRule(tx: Pick<Prisma.TransactionClient, 'partnerProgramRule'> = prisma) {
  return tx.partnerProgramRule.findFirst({ orderBy: { version: 'desc' } });
}
export async function savePartnerRule(actorId: string, raw: PartnerProgramRuleInput) {
  const input = partnerProgramRuleSchema.parse(raw);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PROGRAM_LOCK}))`;
    const current = await currentPartnerRule(tx);
    if ((current?.version ?? 0) !== input.expectedVersion) throw new ConflictError('As regras mudaram. Recarregue antes de publicar.');
    const { expectedVersion: _, confirmed: _confirmed, ...values } = input;
    const rule = await tx.partnerProgramRule.create({ data: { ...values, version: (current?.version ?? 0) + 1, actorId } });
    await tx.integrationAudit.create({ data: { actorId, jobId: rule.id, action: 'PARTNER_PROGRAM_RULE_PUBLISHED' } });
    return rule;
  });
}
export async function getOwnPartnerProgram(userId: string) {
  const partner = await prisma.partnerProfile.findUnique({ where: { userId }, select: { id: true, status: true } });
  if (!partner) throw new NotFoundError('Cadastro não encontrado');
  const rule = await currentPartnerRule();
  const accepted = rule ? Boolean(await prisma.partnerProgramAcceptance.findUnique({ where: { partnerId_ruleId: { partnerId: partner.id, ruleId: rule.id } } })) : false;
  return { rule, accepted, approved: partner.status === 'APPROVED' };
}
export async function acceptPartnerRule(userId: string, ruleId: string) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner:${userId}`}))`;
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PROGRAM_LOCK}))`;
    const partner = await tx.partnerProfile.findUnique({ where: { userId } });
    if (partner?.status !== 'APPROVED') throw new ForbiddenError('Seu cadastro precisa estar aprovado.');
    const rule = await currentPartnerRule(tx);
    if (!rule?.enabled || rule.id !== ruleId) throw new ConflictError('As regras não estão disponíveis. Confira a versão atual.');
    return tx.partnerProgramAcceptance.upsert({ where: { partnerId_ruleId: { partnerId: partner.id, ruleId } }, create: { partnerId: partner.id, ruleId }, update: {} });
  });
}
export async function referralRuleSnapshot(tx: Prisma.TransactionClient, partnerId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${PROGRAM_LOCK}))`;
  const current = await currentPartnerRule(tx);
  if (!current?.enabled) return undefined;
  const accepted = await tx.partnerProgramAcceptance.findUnique({ where: { partnerId_ruleId: { partnerId, ruleId: current.id } } });
  return accepted ? current.id : undefined;
}
async function walletLock(tx: Prisma.TransactionClient, partnerId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner-wallet:${partnerId}`}))`;
}
export async function earnPartnerSale(tx: Prisma.TransactionClient, saleId: string) {
  const sale = await tx.sale.findUnique({ where: { id: saleId }, include: { order: { include: { partnerReferral: { include: { rule: true, partner: { include: { user: { select: { isActive: true } } } } } } } } } });
  const referral = sale?.order?.partnerReferral;
  if (sale?.status !== 'PAID' || !referral?.rule || !referral.partner) return;
  await walletLock(tx, referral.partner.id);
  // A paid->pending->paid cycle cannot create another financial event.
  if (await tx.partnerLedgerEntry.findUnique({ where: { eventKey: `sale-earned:${saleId}` } })) return;
  if (referral.partner.status !== 'APPROVED' || !referral.partner.user.isActive || referral.partner.userId === sale.customerId) {
    await tx.partnerLedgerEntry.create({ data: { partnerId: referral.partner.id, saleId, ruleId: referral.rule.id, eventKey: `sale-earned:${saleId}`, kind: 'INELIGIBLE', availableAt: new Date(), reference: sale.referenceCode } });
    return;
  }
  const cents = Math.round(sale.total * 100);
  if (!Number.isSafeInteger(cents) || cents < 0) throw new ValidationError('Valor de venda fora do limite financeiro.');
  const benefits = benefitsForBasis(BigInt(cents), referral.rule.commissionBasisPoints, referral.rule.pointsPerReal);
  await tx.partnerLedgerEntry.create({ data: { partnerId: referral.partner.id, saleId, ruleId: referral.rule.id, eventKey: `sale-earned:${saleId}`, kind: 'EARN', basisCents: BigInt(cents), ...benefits,
    availableAt: new Date(Date.now() + referral.rule.maturityDays * 86400000), reference: sale.referenceCode } });
}
export async function reversePartnerSale(tx: Prisma.TransactionClient, saleId: string, cumulativeRefundCents: bigint, eventKey: string, actorId?: string) {
  const earned = await tx.partnerLedgerEntry.findUnique({ where: { eventKey: `sale-earned:${saleId}` }, include: { rule: true } });
  if (!earned?.partnerId || !earned.rule) return;
  await walletLock(tx, earned.partnerId);
  if (await tx.partnerLedgerEntry.findUnique({ where: { eventKey } })) return;
  const basis = cumulativeRefundCents > earned.basisCents ? earned.basisCents : cumulativeRefundCents;
  const desired = benefitsForBasis(basis, earned.rule.commissionBasisPoints, earned.rule.pointsPerReal);
  const previous = await tx.partnerLedgerEntry.aggregate({ where: { saleId, kind: 'REVERSE' }, _sum: { commissionCents: true, points: true, basisCents: true } });
  const commissionCents = -desired.commissionCents - (previous._sum.commissionCents ?? 0n);
  const points = -desired.points - (previous._sum.points ?? 0n);
  const basisCents = -basis - (previous._sum.basisCents ?? 0n);
  await tx.partnerLedgerEntry.create({ data: { partnerId: earned.partnerId, saleId, ruleId: earned.ruleId, eventKey, kind: 'REVERSE', commissionCents, points, basisCents, availableAt: earned.availableAt, actorId, reference: earned.reference } });
}
export async function holdPartnerPayment(tx: Prisma.TransactionClient, saleId: string, version: number, paid: boolean) {
  const earned = await tx.partnerLedgerEntry.findUnique({ where: { eventKey: `sale-earned:${saleId}` } });
  if (!earned?.partnerId) return;
  await walletLock(tx, earned.partnerId);
  const eventKey = `sale-payment:${saleId}:${version}`;
  if (await tx.partnerLedgerEntry.findUnique({ where: { eventKey } })) return;
  const totals = await tx.partnerLedgerEntry.aggregate({ where: { saleId, ...(paid ? { kind: { in: ['PAYMENT_HOLD', 'HOLD_RELEASE'] } } : {}) }, _sum: { commissionCents: true, points: true } });
  const commissionCents = -(totals._sum.commissionCents ?? 0n); const points = -(totals._sum.points ?? 0n);
  if (!commissionCents && !points) return;
  await tx.partnerLedgerEntry.create({ data: { partnerId: earned.partnerId, saleId, ruleId: earned.ruleId, eventKey, kind: paid ? 'HOLD_RELEASE' : 'PAYMENT_HOLD', commissionCents, points, availableAt: earned.availableAt, reference: earned.reference } });
}
export async function readPartnerWallet(partnerId: string, page: number, tx: Pick<Prisma.TransactionClient, 'partnerLedgerEntry'> = prisma) {
  const now = new Date(); const where = { partnerId };
  const [available, pending, total, entries] = await Promise.all([
    tx.partnerLedgerEntry.aggregate({ where: { ...where, availableAt: { lte: now } }, _sum: { commissionCents: true, points: true } }),
    tx.partnerLedgerEntry.aggregate({ where: { ...where, availableAt: { gt: now } }, _sum: { commissionCents: true, points: true } }),
    tx.partnerLedgerEntry.count({ where }), tx.partnerLedgerEntry.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20, select: { id: true, kind: true, commissionCents: true, points: true, basisCents: true, availableAt: true, reference: true, createdAt: true, rule: { select: { version: true } } } }),
  ]);
  const stringify = (value: bigint | null) => String(value ?? 0n);
  return { availableCents: stringify(available._sum.commissionCents), pendingCents: stringify(pending._sum.commissionCents), availablePoints: stringify(available._sum.points), pendingPoints: stringify(pending._sum.points), page, total, totalPages: Math.ceil(total / 20), entries: entries.map(row => ({ ...row, commissionCents: String(row.commissionCents), points: String(row.points), basisCents: String(row.basisCents) })) };
}
export async function ownPartnerWallet(userId: string, page: number) {
  const profile = await prisma.partnerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) throw new NotFoundError('Cadastro não encontrado');
  return readPartnerWallet(profile.id, page);
}
export async function recordPartnerPayout(partnerId: string, actorId: string, raw: PartnerPayoutInput) {
  const input = partnerPayoutSchema.parse(raw);
  const eventKey = createHash('sha256').update(`partner-payout:${actorId}:${input.requestKey}`).digest('hex');
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner-payout-key:${eventKey}`}))`;
    await walletLock(tx, partnerId);
    const profile = await tx.partnerProfile.findUnique({ where: { id: partnerId } });
    if (!profile) throw new NotFoundError('Cadastro não encontrado');
    const existing = await tx.partnerLedgerEntry.findUnique({ where: { eventKey } });
    if (existing) {
      if (existing.partnerId !== partnerId || existing.commissionCents !== -BigInt(input.amountCents) || existing.reference !== input.reference) throw new ConflictError('Este envio já foi usado para outro registro.');
      return { id: existing.id };
    }
    const wallet = await readPartnerWallet(partnerId, 1, tx);
    const payoutReferenceKey = createHash('sha256').update(`${partnerId}:${input.reference.trim().toLocaleLowerCase('pt-BR')}`).digest('hex');
    if (await tx.partnerLedgerEntry.findUnique({ where: { payoutReferenceKey } })) throw new ConflictError('Este comprovante já foi registrado para o parceiro.');
    if (BigInt(wallet.availableCents) < BigInt(input.amountCents)) throw new ConflictError('Valor maior que a comissão disponível. Recarregue o extrato.');
    const entry = await tx.partnerLedgerEntry.create({ data: { partnerId, eventKey, payoutReferenceKey, kind: 'PAYOUT', commissionCents: -BigInt(input.amountCents), availableAt: new Date(), actorId, reference: input.reference } });
    await tx.integrationAudit.create({ data: { actorId, jobId: entry.id, action: 'PARTNER_PAYOUT_RECORDED' } });
    return { id: entry.id };
  });
}
export async function ownPartnerRuleHistory(userId: string, page: number) {
  const partner = await prisma.partnerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!partner) throw new NotFoundError('Cadastro não encontrado');
  const where = { partnerId: partner.id };
  const [rows, total] = await Promise.all([prisma.partnerProgramAcceptance.findMany({ where, orderBy: [{ acceptedAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20, select: { id: true, acceptedAt: true, rule: { select: { id: true, version: true, commissionBasisPoints: true, pointsPerReal: true, maturityDays: true, terms: true } } } }), prisma.partnerProgramAcceptance.count({ where })]);
  return { rules: rows, total, page, totalPages: Math.ceil(total / 20) };
}
