import { createHash } from 'node:crypto';
import { sellerCommissionDraftSchema, type SellerCommissionDraftInput } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { ConflictError, ForbiddenError, ValidationError } from '../utils/errors.util.js';
import { currentMonthInBrazil } from './seller-goal.service.js';

type Actor = { userId: string; role: string };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const serialize = (row: { id: string; version: number; effectiveMonth: string; basis: string; eligibleRole: string; basisPoints: number; maturityDays: number; reason: string; createdAt: Date }) => ({
  id: row.id, version: row.version, effectiveMonth: row.effectiveMonth, basisPoints: row.basisPoints,
  basis: row.basis, eligibleRole: row.eligibleRole, maturityDays: row.maturityDays, reason: row.reason, createdAt: row.createdAt, active: false as const,
});

export async function latestSellerCommissionDraft() {
  const row = await prisma.sellerCommissionDraft.findFirst({ orderBy: { version: 'desc' } });
  return row ? serialize(row) : null;
}

export async function saveSellerCommissionDraft(actor: Actor, raw: SellerCommissionDraftInput) {
  const input = sellerCommissionDraftSchema.parse(raw);
  const requestKey = hash(`seller-commission-draft:${actor.userId}:${input.requestKey}`);
  const fingerprint = hash(JSON.stringify({ expectedVersion: input.expectedVersion, effectiveMonth: input.effectiveMonth, basis: input.basis, eligibleRole: input.eligibleRole,
    basisPoints: input.basisPoints, maturityDays: input.maturityDays, reason: input.reason }));
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('seller-commission-draft'))`;
    const manager = await tx.user.findUnique({ where: { id: actor.userId }, select: { isActive: true, role: true } });
    if (!manager?.isActive || manager.role !== actor.role || !['ADMIN', 'MANAGER'].includes(manager.role)) throw new ForbiddenError('Seu acesso às regras mudou.');
    const repeated = await tx.sellerCommissionDraft.findUnique({ where: { requestKey } });
    if (repeated) {
      if (repeated.fingerprint !== fingerprint) throw new ConflictError('Esta chave de envio já foi usada para outro rascunho.');
      return serialize(repeated);
    }
    if (input.effectiveMonth <= currentMonthInBrazil()) throw new ValidationError('A política precisa começar em um mês futuro.');
    const previous = await tx.sellerCommissionDraft.findFirst({ orderBy: { version: 'desc' } });
    if ((previous?.version ?? 0) !== input.expectedVersion) throw new ConflictError('O rascunho mudou. Recarregue antes de salvar.');
    const row = await tx.sellerCommissionDraft.create({ data: { version: input.expectedVersion + 1,
      requestKey, fingerprint, effectiveMonth: input.effectiveMonth, basis: input.basis, eligibleRole: input.eligibleRole, basisPoints: input.basisPoints,
      maturityDays: input.maturityDays, actorId: actor.userId, reason: input.reason } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: row.id, action: 'SELLER_COMMISSION_DRAFT_SAVED' } });
    return serialize(row);
  });
}
