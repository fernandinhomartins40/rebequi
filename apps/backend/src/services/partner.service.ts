import { randomBytes } from 'node:crypto';
import type { PartnerFiltersInput, PartnerProfileInput, ReviewPartnerInput } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.util.js';

const fields = { id: true, userId: true, referralCode: true, specialties: true, city: true, region: true, services: true,
  experienceYears: true, status: true, reviewReason: true, reviewedAt: true, acceptedTermsVersion: true,
  version: true, createdAt: true, updatedAt: true } as const;

export async function getPartnerProfile(userId: string) {
  return prisma.partnerProfile.findUnique({ where: { userId }, select: fields });
}
export async function savePartnerProfile(userId: string, input: PartnerProfileInput) {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner:${userId}`}))`;
    const existing = await tx.partnerProfile.findUnique({ where: { userId } });
    if ((existing?.version ?? 0) !== input.expectedVersion) throw new ConflictError('O perfil foi atualizado. Recarregue e confira antes de salvar.');
    const { expectedVersion: _version, ...profile } = input;
    const status = existing?.status === 'REJECTED' ? 'PENDING' : existing?.status ?? 'PENDING';
    const saved = existing
      ? await tx.partnerProfile.update({ where: { id: existing.id }, data: { ...profile, status, version: { increment: 1 } }, select: fields })
      : await tx.partnerProfile.create({ data: { ...profile, userId, referralCode: `RB${randomBytes(8).toString('hex').toUpperCase()}` }, select: fields });
    await tx.partnerProfileAudit.create({ data: { partnerId: saved.id, actorId: userId,
      action: existing ? 'PROFILE_UPDATED' : 'PROFILE_SUBMITTED', fromStatus: existing?.status, toStatus: status } });
    return saved;
  });
}
export async function listPartners(input: PartnerFiltersInput) {
  const where = input.status ? { status: input.status } : {};
  const [partners, total] = await Promise.all([
    prisma.partnerProfile.findMany({ where, skip: (input.page - 1) * input.limit, take: input.limit, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { ...fields, user: { select: { id: true, name: true, whatsapp: true, isActive: true } } } }),
    prisma.partnerProfile.count({ where }),
  ]);
  return { partners, total, page: input.page, limit: input.limit, totalPages: Math.ceil(total / input.limit) };
}
export async function reviewPartner(partnerId: string, actorId: string, input: ReviewPartnerInput) {
  return prisma.$transaction(async tx => {
    const identity = await tx.partnerProfile.findUnique({ where: { id: partnerId }, select: { userId: true } });
    if (!identity) throw new NotFoundError('Parceiro não encontrado');
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`partner:${identity.userId}`}))`;
    const partner = await tx.partnerProfile.findUniqueOrThrow({ where: { id: partnerId } });
    if (input.status === 'APPROVED' && !(await tx.user.findUnique({ where: { id: partner.userId }, select: { isActive: true } }))?.isActive) throw new ValidationError('A conta do cliente está desativada.');
    const changed = await tx.partnerProfile.updateMany({ where: { id: partnerId, version: input.expectedVersion }, data: {
      status: input.status, reviewReason: input.reason, reviewedById: actorId, reviewedAt: new Date(), version: { increment: 1 },
    } });
    if (!changed.count) throw new ConflictError('O cadastro mudou. Recarregue antes de revisar.');
    await tx.partnerProfileAudit.create({ data: { partnerId, actorId, action: 'PROFILE_REVIEWED', fromStatus: partner.status, toStatus: input.status, reason: input.reason } });
    return tx.partnerProfile.findUniqueOrThrow({ where: { id: partnerId }, select: fields });
  });
}
