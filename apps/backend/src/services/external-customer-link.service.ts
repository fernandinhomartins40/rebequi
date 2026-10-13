import { createHash } from 'node:crypto';
import { linkExternalCustomerSchema, revokeExternalCustomerLinkSchema } from '@rebequi/shared/schemas';
import { normalizeWhatsapp } from '@rebequi/shared/utils';
import type { z } from 'zod';
import type { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../utils/errors.util.js';

type Actor = { userId: string; role: string };
const hash = (text: string) => createHash('sha256').update(text).digest('hex');
async function requireManager(tx: Prisma.TransactionClient, actor: Actor) {
  const user = await tx.user.findUnique({ where: { id: actor.userId }, select: { role: true, isActive: true } });
  if (!user?.isActive || user.role !== actor.role || !['ADMIN', 'MANAGER'].includes(user.role)) {
    throw new ForbiddenError('Seu acesso às integrações mudou.');
  }
}

export async function createExternalCustomerLink(actor: Actor, raw: z.infer<typeof linkExternalCustomerSchema>) {
  const input = linkExternalCustomerSchema.parse(raw);
  const requestKey = hash(`external-customer-link:${actor.userId}:${input.requestKey}`);
  const fingerprint = hash(JSON.stringify({ source: input.source, externalId: input.externalId,
    customerId: input.customerId, expectedEmail: input.expectedEmail, expectedWhatsapp: input.expectedWhatsapp }));
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`external-customer-link:${input.source}:${input.externalId}`}))`;
    await tx.$queryRaw`SELECT id FROM users WHERE id=${input.customerId} FOR UPDATE`;
    await requireManager(tx, actor);
    const repeated = await tx.externalCustomerLink.findUnique({ where: { requestKey } });
    if (repeated) {
      if (repeated.fingerprint !== fingerprint) throw new ConflictError('Esta chave de envio já foi usada para outro vínculo.');
      if (repeated.revokedAt) throw new ConflictError('Este vínculo foi revogado. Confira o cliente novamente.');
      return { id: repeated.id, source: repeated.source, externalId: repeated.externalId,
        customerId: repeated.customerId, createdAt: repeated.createdAt };
    }
    const customer = await tx.user.findFirst({ where: { id: input.customerId, role: 'CUSTOMER', isActive: true },
      select: { id: true, email: true, whatsapp: true } });
    if (!customer) throw new NotFoundError('Cliente local ativo não encontrado.');
    if (input.expectedEmail && customer.email.toLowerCase() !== input.expectedEmail) {
      throw new ConflictError('O e-mail do cliente mudou. Confira o cadastro novamente.');
    }
    if (input.expectedWhatsapp && normalizeWhatsapp(customer.whatsapp ?? customer.email) !== input.expectedWhatsapp) {
      throw new ConflictError('O WhatsApp do cliente mudou. Confira o cadastro novamente.');
    }
    const matchingUsers = await tx.user.findMany({ where: { OR: [
      ...(input.expectedEmail ? [{ email: { equals: input.expectedEmail, mode: 'insensitive' as const } }] : []),
      ...(input.expectedWhatsapp ? [{ whatsapp: input.expectedWhatsapp }, { email: input.expectedWhatsapp }] : []),
    ] }, select: { id: true } });
    if (matchingUsers.length !== 1 || matchingUsers[0].id !== customer.id) {
      throw new ConflictError('Os contatos informados pertencem a contas diferentes.');
    }
    const active = await tx.externalCustomerLink.findFirst({ where: { source: input.source, revokedAt: null,
      OR: [{ externalId: input.externalId }, { customerId: input.customerId }] } });
    if (active) throw new ConflictError('O ID externo ou o cliente já possui vínculo ativo nesta origem.');
    const row = await tx.externalCustomerLink.create({ data: { source: input.source, externalId: input.externalId,
      customerId: input.customerId, requestKey, fingerprint, actorId: actor.userId } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: row.id, action: 'EXTERNAL_CUSTOMER_LINK_CREATED' } });
    return { id: row.id, source: row.source, externalId: row.externalId, customerId: row.customerId, createdAt: row.createdAt };
  });
}

export async function revokeExternalCustomerLink(actor: Actor, id: string, raw: z.infer<typeof revokeExternalCustomerLinkSchema>) {
  const input = revokeExternalCustomerLinkSchema.parse(raw);
  return prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT id FROM external_customer_links WHERE id=${id} FOR UPDATE`;
    await requireManager(tx, actor);
    const current = await tx.externalCustomerLink.findUnique({ where: { id } });
    if (!current) throw new NotFoundError('Vínculo de cliente não encontrado.');
    if (current.revokedAt) return { id: current.id, revokedAt: current.revokedAt };
    const row = await tx.externalCustomerLink.update({ where: { id }, data: { revokedAt: new Date(),
      revokedById: actor.userId, revokedReason: input.reason } });
    await tx.integrationAudit.create({ data: { actorId: actor.userId, jobId: row.id, action: 'EXTERNAL_CUSTOMER_LINK_REVOKED' } });
    return { id: row.id, revokedAt: row.revokedAt };
  });
}
