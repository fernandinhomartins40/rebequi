import { createHash } from 'node:crypto';
import { saveCommercialUnitPolicySchema, type SaveCommercialUnitPolicyInput } from '@rebequi/shared/schemas';
import { formatCommercialQuantity, parseCommercialQuantity } from '@rebequi/shared/utils';
import { hasMerchantPermission } from '@rebequi/shared/constants';
import type { ProductUnitPolicy } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.util.js';
function serialize(row: ProductUnitPolicy) {
  return { id: row.id, version: row.version, commercialUnit: row.commercialUnit, stockUnit: row.stockUnit,
    stockPerCommercialUnit: row.stockPerCommercialUnit.toString(), quantityStep: row.quantityStep.toString(), reason: row.reason, createdAt: row.createdAt };
}
export async function getProductUnitPolicy(productId: string) {
  return prisma.$transaction(async tx => {
    if (!await tx.product.count({ where: { id: productId, deletedAt: null } })) throw new NotFoundError('Produto não encontrado.');
    const row = await tx.productUnitPolicy.findFirst({ where: { productId }, orderBy: { version: 'desc' } });
    return { policy: row ? serialize(row) : null, operational: false };
  }, { isolationLevel: 'RepeatableRead' });
}
export async function saveProductUnitPolicy(productId: string, actor: { userId: string; role: string }, raw: SaveCommercialUnitPolicyInput) {
  const input = saveCommercialUnitPolicySchema.parse(raw);
  const key = createHash('sha256').update(`product-unit:${actor.userId}:${input.requestKey}`).digest('hex');
  const policy = { ...input.policy, stockPerCommercialUnit: formatCommercialQuantity(parseCommercialQuantity(input.policy.stockPerCommercialUnit)), quantityStep: formatCommercialQuantity(parseCommercialQuantity(input.policy.quantityStep)) };
  const fingerprint = createHash('sha256').update(JSON.stringify({ productId, policy, reason: input.reason })).digest('hex');
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`product-unit:${key}`}))`;
    await tx.$queryRaw`SELECT id FROM products WHERE id=${productId} FOR UPDATE`;
    const operator = await tx.user.findFirst({ where: { id: actor.userId, isActive: true }, select: { role: true } });
    if (!operator || operator.role !== actor.role || !hasMerchantPermission(operator.role, 'catalog:manage')) throw new ForbiddenError('Seu acesso ao catálogo mudou.');
    if (!await tx.product.count({ where: { id: productId, deletedAt: null } })) throw new NotFoundError('Produto não encontrado.');
    const repeated = await tx.productUnitPolicy.findUnique({ where: { requestKey: key } });
    if (repeated) {
      if (repeated.fingerprint !== fingerprint) throw new ConflictError('Este envio já foi usado para outra política.');
      return { policy: serialize(repeated), operational: false };
    }
    const previous = await tx.productUnitPolicy.findFirst({ where: { productId }, orderBy: { version: 'desc' }, select: { version: true } });
    if ((previous?.version ?? 0) !== input.expectedVersion) throw new ConflictError('A política mudou. Recarregue antes de confirmar.');
    const { confirmed: _confirmed, ...fields } = policy;
    const row = await tx.productUnitPolicy.create({ data: { ...fields, productId, version: input.expectedVersion + 1, requestKey: key, fingerprint, actorId: actor.userId, reason: input.reason } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: row.id, action: 'PRODUCT_UNIT_POLICY_RECORDED' } });
    // Recording a verified policy never reinterprets legacy stock or activates decimals.
    return { policy: serialize(row), operational: false };
  });
}
