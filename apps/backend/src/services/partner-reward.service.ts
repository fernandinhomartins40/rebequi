import { createHash } from 'node:crypto';
import { partnerRewardSchema, partnerRedemptionSchema, partnerRedemptionReviewSchema, type PartnerRewardInput, type PartnerRedemptionInput, type PartnerRedemptionReviewInput } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.util.js';
import { currentPartnerRule, readPartnerWallet } from './partner-program.service.js';

export async function listPartnerRewards(page: number, admin = false) {
  const where = admin ? {} : { enabled: true, OR: [{ endsAt: null }, { endsAt: { gt: new Date() } }] };
  const [rows, total] = await Promise.all([prisma.partnerReward.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20 }), prisma.partnerReward.count({ where })]);
  return { rewards: rows.map(({ reserved, fulfilled, capacity, ...row }) => ({ ...row, available: capacity - reserved - fulfilled, ...(admin ? { reserved, fulfilled, capacity } : {}) })), total, page, totalPages: Math.ceil(total / 20) };
}
export async function savePartnerReward(actorId: string, rewardId: string | undefined, raw: PartnerRewardInput) {
  const input = partnerRewardSchema.parse(raw);
  if (input.enabled && input.endsAt && new Date(input.endsAt) <= new Date()) throw new ValidationError('A validade precisa estar no futuro.');
  return prisma.$transaction(async tx => {
    if (rewardId) await tx.$queryRaw`SELECT id FROM partner_rewards WHERE id=${rewardId} FOR UPDATE`;
    const existing = rewardId ? await tx.partnerReward.findUnique({ where: { id: rewardId } }) : null;
    if (rewardId && !existing) throw new NotFoundError('Recompensa não encontrada');
    if ((existing?.version ?? 0) !== input.expectedVersion) throw new ConflictError('A recompensa mudou. Recarregue.');
    if (input.capacity < (existing?.reserved ?? 0) + (existing?.fulfilled ?? 0)) throw new ConflictError('A quantidade não pode ser menor que os resgates reservados e entregues.');
    const { expectedVersion: _, confirmed: _confirmed, ...configuration } = input;
    const values = { ...configuration, endsAt: input.endsAt ? new Date(input.endsAt) : null, version: (existing?.version ?? 0) + 1 };
    const reward = existing ? await tx.partnerReward.update({ where: { id: existing.id }, data: values }) : await tx.partnerReward.create({ data: values });
    await tx.partnerRewardRevision.create({ data: { rewardId: reward.id, version: reward.version, configuration, actorId } });
    await tx.integrationAudit.create({ data: { actorId, jobId: reward.id, action: 'PARTNER_REWARD_PUBLISHED' } });
    return reward;
  });
}
export async function requestPartnerRedemption(userId: string, raw: PartnerRedemptionInput) {
  const input = partnerRedemptionSchema.parse(raw);
  const requestKey = createHash('sha256').update(`partner-redemption:${userId}:${input.requestKey}`).digest('hex');
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner:${userId}`}))`;
    const partner = await tx.partnerProfile.findUnique({ where: { userId } });
    if (!partner) throw new NotFoundError('Cadastro não encontrado');
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner-wallet:${partner.id}`}))`;
    const existing = await tx.partnerRedemption.findUnique({ where: { requestKey } });
    if (existing) {
      if (existing.rewardId !== input.rewardId || existing.rewardVersion !== input.rewardVersion) throw new ConflictError('Este envio já foi usado para outra recompensa.');
      return existing;
    }
    if (partner.status !== 'APPROVED') throw new ForbiddenError('Seu cadastro precisa estar aprovado.');
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'partner-program:rules'}))`;
    const rule = await currentPartnerRule(tx);
    if (!rule?.enabled || !await tx.partnerProgramAcceptance.findUnique({ where: { partnerId_ruleId: { partnerId: partner.id, ruleId: rule.id } } })) throw new ConflictError('Confira e aceite as regras atuais antes de resgatar.');
    await tx.$queryRaw`SELECT id FROM partner_rewards WHERE id=${input.rewardId} FOR UPDATE`;
    const reward = await tx.partnerReward.findUnique({ where: { id: input.rewardId } });
    if (!reward) throw new NotFoundError('Recompensa não encontrada');
    if (!reward.enabled || reward.version !== input.rewardVersion || (reward.endsAt && reward.endsAt <= new Date())) throw new ConflictError('A recompensa mudou ou não está disponível. Confira o catálogo.');
    if (reward.capacity <= reward.reserved + reward.fulfilled) throw new ConflictError('Todas as unidades já foram reservadas.');
    const wallet = await readPartnerWallet(partner.id, 1, tx);
    if (BigInt(wallet.availablePoints) < BigInt(reward.points)) throw new ConflictError('Pontos disponíveis insuficientes. Confira seu extrato.');
    const redemption = await tx.partnerRedemption.create({ data: { partnerId: partner.id, rewardId: reward.id, requestKey, rewardVersion: reward.version, nameSnapshot: reward.name, descriptionSnapshot: reward.description, points: reward.points } });
    await tx.partnerLedgerEntry.create({ data: { partnerId: partner.id, ruleId: rule.id, eventKey: `redemption-hold:${redemption.id}`, kind: 'REDEMPTION_HOLD', points: -BigInt(reward.points), availableAt: new Date(), reference: reward.name, actorId: userId } });
    await tx.partnerReward.update({ where: { id: reward.id }, data: { reserved: { increment: 1 } } });
    await tx.integrationAudit.create({ data: { actorId: userId, jobId: redemption.id, action: 'PARTNER_REDEMPTION_REQUESTED' } });
    return redemption;
  });
}
export async function listPartnerRedemptions(page: number, userId?: string) {
  const partner = userId ? await prisma.partnerProfile.findUnique({ where: { userId }, select: { id: true } }) : null;
  if (userId && !partner) throw new NotFoundError('Cadastro não encontrado');
  const where = partner ? { partnerId: partner.id } : {};
  const [rows, total] = await Promise.all([prisma.partnerRedemption.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20, select: { id: true, partnerId: true, rewardId: true, rewardVersion: true, nameSnapshot: true, descriptionSnapshot: true, points: true, status: true, version: true, reason: true, createdAt: true, ...(userId ? {} : { partner: { select: { user: { select: { name: true } } } } }) } }), prisma.partnerRedemption.count({ where })]);
  return { redemptions: rows, total, page, totalPages: Math.ceil(total / 20) };
}
export async function reviewPartnerRedemption(id: string, actorId: string, raw: PartnerRedemptionReviewInput, customer = false) {
  const input = partnerRedemptionReviewSchema.parse(raw);
  if (customer && input.status !== 'CANCELED') throw new ForbiddenError('Você pode apenas cancelar seu próprio resgate.');
  return prisma.$transaction(async tx => {
    const identity = await tx.partnerRedemption.findUnique({ where: { id }, select: { partner: { select: { userId: true } } } });
    if (identity?.partner) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner:${identity.partner.userId}`}))`;
    await tx.$queryRaw`SELECT id FROM partner_redemptions WHERE id=${id} FOR UPDATE`;
    const redemption = await tx.partnerRedemption.findUnique({ where: { id }, include: { partner: { select: { userId: true, status: true, user: { select: { isActive: true } } } } } });
    if (!redemption) throw new NotFoundError('Resgate não encontrado');
    if (customer && redemption.partner?.userId !== actorId) throw new NotFoundError('Resgate não encontrado');
    if (redemption.version !== input.expectedVersion) throw new ConflictError('O resgate mudou. Recarregue antes de continuar.');
    if (!['PENDING', 'APPROVED'].includes(redemption.status) || (input.status === 'APPROVED' && redemption.status !== 'PENDING') || (input.status === 'FULFILLED' && redemption.status !== 'APPROVED')) throw new ConflictError('Esta alteração não está disponível para o estado atual.');
    if (redemption.partnerId) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner-wallet:${redemption.partnerId}`}))`;
    await tx.$queryRaw`SELECT id FROM partner_rewards WHERE id=${redemption.rewardId} FOR UPDATE`;
    if (input.status === 'FULFILLED') {
      if (!redemption.partnerId) throw new ConflictError('O cadastro foi removido. Cancele o resgate para liberar a unidade.');
      if (redemption.partner?.status !== 'APPROVED' || !redemption.partner.user.isActive) throw new ConflictError('O cadastro precisa estar aprovado e ativo antes da entrega.');
      const wallet = await readPartnerWallet(redemption.partnerId, 1, tx);
      if (BigInt(wallet.availablePoints) < 0n) throw new ConflictError('Há ajuste de pontos pendente. Confira o extrato antes da entrega.');
      await tx.partnerReward.update({ where: { id: redemption.rewardId }, data: { reserved: { decrement: 1 }, fulfilled: { increment: 1 } } });
    } else if (['CANCELED', 'REJECTED'].includes(input.status)) {
      const hold = await tx.partnerLedgerEntry.findUniqueOrThrow({ where: { eventKey: `redemption-hold:${id}` } });
      await tx.partnerLedgerEntry.create({ data: { partnerId: redemption.partnerId, ruleId: hold.ruleId, eventKey: `redemption-release:${id}`, kind: 'REDEMPTION_RELEASE', points: BigInt(redemption.points), availableAt: new Date(), actorId, reference: redemption.nameSnapshot } });
      await tx.partnerReward.update({ where: { id: redemption.rewardId }, data: { reserved: { decrement: 1 } } });
    }
    const result = await tx.partnerRedemption.update({ where: { id }, data: { status: input.status, version: { increment: 1 }, reason: input.reason, actorId } });
    await tx.integrationAudit.create({ data: { actorId, jobId: id, action: `PARTNER_REDEMPTION_${input.status}` } });
    return result;
  });
}
