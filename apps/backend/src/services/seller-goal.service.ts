import { createHash } from 'node:crypto';
import { sellerGoalSchema, type SellerGoalInput } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { ConflictError, ForbiddenError, ValidationError } from '../utils/errors.util.js';

type Actor = { userId: string; role: string };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
export const currentMonthInBrazil = () => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(new Date());
  return `${parts.find(part => part.type === 'year')!.value}-${parts.find(part => part.type === 'month')!.value}`;
};
const serialize = (row: { id: string; sellerId: string; month: string; version: number; targetCents: bigint; createdAt: Date }) => ({
  id: row.id, sellerId: row.sellerId, month: row.month, version: row.version,
  targetCents: row.targetCents.toString(), createdAt: row.createdAt,
});

export async function currentSellerGoal(sellerId: string, month: string) {
  const row = await prisma.sellerGoalRevision.findFirst({ where: { sellerId, month }, orderBy: { version: 'desc' } });
  return row ? serialize(row) : null;
}

export async function setSellerGoal(actor: Actor, raw: SellerGoalInput) {
  const input = sellerGoalSchema.parse(raw);
  const requestKey = hash(`seller-goal:${actor.userId}:${input.requestKey}`);
  const fingerprint = hash(JSON.stringify({ sellerId: input.sellerId, month: input.month,
    targetCents: input.targetCents, expectedVersion: input.expectedVersion, reason: input.reason }));
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`seller-goal:${input.sellerId}:${input.month}`}))`;
    const manager = await tx.user.findUnique({ where: { id: actor.userId }, select: { isActive: true, role: true } });
    if (!manager?.isActive || manager.role !== actor.role || !['ADMIN', 'MANAGER'].includes(manager.role)) throw new ForbiddenError('Seu acesso às metas mudou.');
    const repeated = await tx.sellerGoalRevision.findUnique({ where: { requestKey } });
    if (repeated) {
      if (repeated.fingerprint !== fingerprint) throw new ConflictError('Esta chave de envio já foi usada para outra meta.');
      return serialize(repeated);
    }
    if (input.month <= currentMonthInBrazil()) throw new ValidationError('Escolha um mês futuro para definir a meta.');
    await tx.$queryRaw`SELECT id FROM users WHERE id=${input.sellerId} FOR UPDATE`;
    const seller = await tx.user.findUnique({ where: { id: input.sellerId }, select: { isActive: true, role: true } });
    if (!seller?.isActive || !['SALES', 'ADMIN', 'MANAGER'].includes(seller.role)) throw new ValidationError('Escolha um colaborador comercial ativo.');
    const latest = await tx.sellerGoalRevision.findFirst({ where: { sellerId: input.sellerId, month: input.month }, orderBy: { version: 'desc' } });
    if ((latest?.version ?? 0) !== input.expectedVersion) throw new ConflictError('A meta mudou. Recarregue antes de salvar.');
    const row = await tx.sellerGoalRevision.create({ data: { sellerId: input.sellerId, month: input.month,
      version: input.expectedVersion + 1, targetCents: BigInt(input.targetCents), requestKey, fingerprint,
      actorId: actor.userId, reason: input.reason } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: row.id, action: 'SELLER_GOAL_REVISED' } });
    return serialize(row);
  });
}
