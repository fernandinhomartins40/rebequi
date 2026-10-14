import { createHash, randomBytes } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { syncProductSchema, syncStockSchema, syncCustomerSchema, syncSaleSchema, syncSaleStatusSchema } from '@rebequi/shared/schemas';
import type { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors.util.js';
import { hashPassword } from '../utils/hash.util.js';
import { enqueueCatalogChange } from './integration-outbox.service.js';
import { SaleService } from './sale.service.js';
import { SaleRepository } from '../repositories/sale.repository.js';
import { CustomerService } from './customer.service.js';
import { logger } from '../utils/logger.util.js';

type Client = { id: string; source: string | null };
const hash = (value: string) => createHash('sha256').update(value).digest('hex');
const saleKey = (source: string, externalId: string) => hash(JSON.stringify(['external-sale', source, externalId]));
const nextTimestamp = (current: Date) => new Date(Math.max(Date.now(), current.getTime() + 1));
function requireVersion(current: { updatedAt: Date } | null, expected: string | null) {
  if ((current?.updatedAt.toISOString() ?? null) !== (expected ? new Date(expected).toISOString() : null))
    throw new ConflictError('O registro mudou. Consulte a versão atual antes de reenviar com uma nova requestKey.');
}

// Receipts commit with the domain mutation: retries never duplicate stock, links or sales.
async function mutate(client: Client, scope: string, kind: string, externalId: string, requestKey: string, input: unknown,
  work: (tx: Prisma.TransactionClient, source: string, actorId: string) => Promise<object>) {
  if (!client.source) throw new ForbiddenError('A credencial precisa de uma origem para sincronizar.');
  const source = client.source;
  const id = hash(JSON.stringify([source, kind, requestKey]));
  const fingerprint = hash(JSON.stringify({ externalId, input }));
  try {
    return await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM external_api_clients WHERE id=${client.id} FOR SHARE`;
      const credential = await tx.externalApiClient.findUnique({ where: { id: client.id } });
      if (!credential || credential.revokedAt || credential.expiresAt <= new Date()) throw new UnauthorizedError('Credencial de integração inválida');
      if (credential.source !== source || !credential.scopes.includes(scope)) throw new ForbiddenError('Permissão de sincronização insuficiente.');
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`external-sync-receipt:${id}`}))`;
      const repeated = await tx.externalSyncReceipt.findUnique({ where: { id } });
      if (repeated) {
        if (repeated.fingerprint !== fingerprint) throw new ConflictError('requestKey já utilizada com outro conteúdo.');
        return repeated.result;
      }
      const actorId = `external-api:${client.id}`;
      const result = JSON.parse(JSON.stringify(await work(tx, source, actorId))) as Prisma.InputJsonObject;
      await tx.externalSyncReceipt.create({ data: { id, source, kind, externalId, requestKey, fingerprint, result } });
      await tx.integrationAudit.create({ data: { actorId, jobId: id, action: `EXTERNAL_SYNC_${kind.toUpperCase()}` } });
      return result;
    }, { timeout: 15000 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
      throw new ConflictError('SKU, contato ou vínculo já utilizado. Confira o registro local e seus vínculos.');
    throw error;
  }
}

export async function syncExternalProduct(client: Client, externalId: string, raw: z.infer<typeof syncProductSchema>) {
  const input = syncProductSchema.parse(raw);
  return mutate(client, 'catalog:write', 'product', externalId, input.requestKey, input, async (tx, source, actorId) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`external-product-link:${source}:${externalId}`}))`;
    const link = await tx.externalProductLink.findFirst({ where: { source, externalId, revokedAt: null } });
    if (link) {
      const active = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM external_product_links WHERE id=${link.id} AND "revokedAt" IS NULL FOR SHARE`;
      if (!active.length) throw new ConflictError('O vínculo foi revogado. Confira o produto novamente.');
    }
    if (link) await tx.$queryRaw`SELECT id FROM products WHERE id=${link.productId} FOR UPDATE`;
    const current = link ? await tx.product.findUniqueOrThrow({ where: { id: link.productId } }) : null;
    requireVersion(current, input.expectedUpdatedAt);
    if (current?.deletedAt) throw new ConflictError('Produto arquivado. Revise o cadastro no painel.');
    if (!await tx.category.findFirst({ where: { id: input.categoryId, isActive: true, deletedAt: null }, select: { id: true } }))
      throw new NotFoundError('Categoria ativa não encontrada.');
    const data = { sku: input.sku, name: input.name, categoryId: input.categoryId, price: Number(input.priceCents) / 100, isActive: input.isActive };
    const product = current ? await tx.product.update({ where: { id: current.id }, data: { ...data, updatedAt: nextTimestamp(current.updatedAt) } })
      : await tx.product.create({ data: { ...data, slug: `erp-${hash(JSON.stringify([source, externalId])).slice(0, 32)}`, stock: 0 } });
    if (!link) await tx.externalProductLink.create({ data: { source, externalId, productId: product.id,
      requestKey: hash(`sync-product-link:${source}:${input.requestKey}`), fingerprint: hash(JSON.stringify(input)), actorId } });
    await enqueueCatalogChange(tx, product.id);
    return { id: product.id, externalId, updatedAt: product.updatedAt };
  });
}

export async function syncExternalStock(client: Client, externalId: string, raw: z.infer<typeof syncStockSchema>) {
  const input = syncStockSchema.parse(raw);
  return mutate(client, 'stock:write', 'stock', externalId, input.requestKey, input, async (tx, source) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`external-product-link:${source}:${externalId}`}))`;
    const link = await tx.externalProductLink.findFirst({ where: { source, externalId, revokedAt: null } });
    if (!link) throw new NotFoundError('Vincule ou sincronize o produto antes do estoque.');
    const active = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM external_product_links WHERE id=${link.id} AND "revokedAt" IS NULL FOR SHARE`;
    if (!active.length) throw new ConflictError('O vínculo foi revogado. Confira o produto novamente.');
    await tx.$queryRaw`SELECT id FROM products WHERE id=${link.productId} FOR UPDATE`;
    const product = await tx.product.findUniqueOrThrow({ where: { id: link.productId } });
    requireVersion(product, input.expectedUpdatedAt);
    if (product.deletedAt || input.quantity < product.reservedStock) throw new ConflictError('Saldo incompatível com produto arquivado ou reservas ativas.');
    const updated = await tx.product.update({ where: { id: product.id }, data: { stock: input.quantity, updatedAt: nextTimestamp(product.updatedAt) } });
    if (input.quantity !== product.stock) await tx.stockMovement.create({ data: { productId: product.id, type: 'ADJUSTMENT',
      quantity: input.quantity - product.stock, stockBefore: product.stock, stockAfter: input.quantity, reason: `[${source}] ${input.reason}` } });
    await enqueueCatalogChange(tx, product.id);
    return { id: product.id, externalId, stock: updated.stock, reservedStock: updated.reservedStock, updatedAt: updated.updatedAt };
  });
}

export async function syncExternalCustomer(client: Client, externalId: string, raw: z.infer<typeof syncCustomerSchema>) {
  const input = syncCustomerSchema.parse(raw);
  // A random unusable password never leaves the server; integration cannot set login credentials.
  const password = input.expectedUpdatedAt === null ? await hashPassword(randomBytes(32).toString('hex')) : undefined;
  return mutate(client, 'customers:write', 'customer', externalId, input.requestKey, input, async (tx, source, actorId) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`external-customer-link:${source}:${externalId}`}))`;
    const link = await tx.externalCustomerLink.findFirst({ where: { source, externalId, revokedAt: null } });
    if (link) {
      const active = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM external_customer_links WHERE id=${link.id} AND "revokedAt" IS NULL FOR SHARE`;
      if (!active.length) throw new ConflictError('O vínculo foi revogado. Confira o cliente novamente.');
    }
    if (link) await tx.$queryRaw`SELECT id FROM users WHERE id=${link.customerId} FOR UPDATE`;
    const current = link ? await tx.user.findUniqueOrThrow({ where: { id: link.customerId } }) : null;
    requireVersion(current, input.expectedUpdatedAt);
    if (current && (current.role !== 'CUSTOMER' || !current.isActive)) throw new ConflictError('Cliente indisponível para sincronização.');
    // Login identifiers are managed in the application; do not let an ERP take over an account.
    if (current && input.email && current.email !== input.email) throw new ConflictError('Alterações de e-mail de acesso devem ser feitas no cadastro local.');
    const customer = current ? await tx.user.update({ where: { id: current.id }, data: { name: input.name, updatedAt: nextTimestamp(current.updatedAt) } })
      : await tx.user.create({ data: { name: input.name, email: input.email!, password: password!, role: 'CUSTOMER', isProvisional: false, mustChangePassword: true } });
    if (!link) await tx.externalCustomerLink.create({ data: { source, externalId, customerId: customer.id,
      requestKey: hash(`sync-customer-link:${source}:${input.requestKey}`), fingerprint: hash(JSON.stringify(input)), actorId } });
    return { id: customer.id, externalId, updatedAt: customer.updatedAt };
  });
}

export async function syncExternalSale(client: Client, externalId: string, raw: z.infer<typeof syncSaleSchema>) {
  const input = syncSaleSchema.parse(raw);
  // The external sale ID is the creation key, shared across credential rotation of the same source.
  const result = await mutate(client, 'sales:write', 'sale', externalId, saleKey(client.source ?? '', externalId), input, async (tx, source) => {
    const customerLink = input.customerExternalId ? await tx.externalCustomerLink.findFirst({ where: { source, externalId: input.customerExternalId, revokedAt: null } }) : null;
    if (input.customerExternalId && !customerLink) throw new NotFoundError('Cliente externo não vinculado.');
    if (customerLink) {
      const active = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM external_customer_links WHERE id=${customerLink.id} AND "revokedAt" IS NULL FOR SHARE`;
      if (!active.length) throw new ConflictError('O vínculo do cliente foi revogado.');
    }
    const customer = customerLink ? await tx.user.findUniqueOrThrow({ where: { id: customerLink.customerId }, select: { name: true, whatsapp: true } }) : null;
    const sale = await new SaleService(new SaleRepository(tx)).createSale(undefined, {
      idempotencyKey: saleKey(source, externalId), customerId: customerLink?.customerId, orderId: input.orderId,
      customerName: customer?.name, customerWhatsapp: customer?.whatsapp ?? undefined,
      paymentMethod: input.paymentMethod, status: input.status, discount: Number(input.discountCents) / 100,
      items: input.items?.map(({ unitPriceCents, ...item }) => ({ ...item, unitPrice: Number(unitPriceCents) / 100 })),
    });
    return { id: sale.id, externalId, status: sale.status, updatedAt: sale.updatedAt };
  });
  // Match the existing sale service's best-effort CRM refresh after commit.
  try {
    const id = (result as { id: string }).id;
    const sale = await prisma.sale.findUnique({ where: { id }, select: { customerId: true } });
    if (sale?.customerId) await new CustomerService().maybeAdvanceStage(sale.customerId);
  } catch { logger.warn('CRM refresh deferred after external sale'); }
  return result;
}

export async function syncExternalSaleStatus(client: Client, externalId: string, raw: z.infer<typeof syncSaleStatusSchema>) {
  const input = syncSaleStatusSchema.parse(raw);
  return mutate(client, 'sales:write', 'sale-status', externalId, `${externalId}:${input.status}`, input, async (tx, source, actorId) => {
    const sale = await tx.sale.findUnique({ where: { idempotencyKey: hash(`:${saleKey(source, externalId)}`) }, select: { id: true } });
    if (!sale) throw new NotFoundError('Venda desta origem não encontrada.');
    const updated = await new SaleRepository(tx).transitionStatus(sale.id, input.status, undefined, actorId);
    return { id: updated.id, externalId, status: updated.status, updatedAt: updated.updatedAt };
  });
}
