import { Router, type RequestHandler } from 'express';
import { randomUUID } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { getRolesForMerchantPermission } from '@rebequi/shared/constants';
import { createExternalClientSchema, previewProductImportSchema, stageProductImportSchema, recordProductImportReviewSchema, applyProductImportDraftSchema, linkExternalProductSchema, revokeExternalProductLinkSchema, previewCategoryImportSchema, linkExternalCategorySchema, revokeExternalCategoryLinkSchema, previewCustomerImportSchema, linkExternalCustomerSchema, revokeExternalCustomerLinkSchema } from '@rebequi/shared/schemas';
import { prisma } from '../lib/prisma.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { requireTrustedOrigin } from '../middleware/trusted-origin.middleware.js';
import { validateBody, validateQuery, validateParams } from '../middleware/validation.middleware.js';
import { successResponse } from '../utils/response.util.js';
import { ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../utils/errors.util.js';
import { createExternalToken, externalBearer, externalTokenHash } from '../services/external-api-token.js';
import { externalApiOpenApi } from '../services/external-api-openapi.js';
import { previewProductImport } from '../services/product-import-preview.service.js';
import { createExternalProductLink, revokeExternalProductLink } from '../services/external-product-link.service.js';
import { stageExternalProductImport, stageExternalProductImportFromApi } from '../services/external-product-import-batch.service.js';
import { compareProductImportBatch, recordProductImportReview } from '../services/external-product-import-review.service.js';
import { applyProductImportDrafts } from '../services/external-product-import-application.service.js';
import { previewCategoryImport } from '../services/category-import-preview.service.js';
import { createExternalCategoryLink, revokeExternalCategoryLink } from '../services/external-category-link.service.js';
import { previewCustomerImport } from '../services/customer-import-preview.service.js';
import { createExternalCustomerLink, revokeExternalCustomerLink } from '../services/external-customer-link.service.js';

export const externalAdminRoutes: Router = Router();
externalAdminRoutes.use(authenticate, authorize(...getRolesForMerchantPermission('integrations:manage')), requireTrustedOrigin, (_req, res, next) => { res.setHeader('Cache-Control', 'private, no-store'); next(); });
const paging = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), limit: z.coerce.number().int().min(1).max(100).default(20), updatedSince: z.string().datetime().optional() });
externalAdminRoutes.post('/imports/customers/preview', validateBody(previewCustomerImportSchema), async (req, res, next) => {
  try { successResponse(res, await previewCustomerImport(req.body)); } catch (error) { next(error); }
});
externalAdminRoutes.get('/imports/customers/links', validateQuery(z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) }).strict()), async (req, res, next) => {
  try {
    const page = Number(req.query.page); const [links, total] = await Promise.all([
      prisma.externalCustomerLink.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20,
        select: { id: true, source: true, externalId: true, customerId: true, createdAt: true, revokedAt: true } }),
      prisma.externalCustomerLink.count(),
    ]);
    successResponse(res, { links, page, total, totalPages: Math.ceil(total / 20) });
  } catch (error) { next(error); }
});
externalAdminRoutes.post('/imports/customers/links', validateBody(linkExternalCustomerSchema), async (req, res, next) => {
  try { successResponse(res, await createExternalCustomerLink(req.user!, req.body), 201); } catch (error) { next(error); }
});
externalAdminRoutes.post('/imports/customers/links/:id/revoke', validateBody(revokeExternalCustomerLinkSchema), async (req, res, next) => {
  try { successResponse(res, await revokeExternalCustomerLink(req.user!, req.params.id, req.body)); } catch (error) { next(error); }
});
externalAdminRoutes.post('/imports/categories/preview', validateBody(previewCategoryImportSchema), async (req, res, next) => {
  try { successResponse(res, await previewCategoryImport(req.body)); } catch (error) { next(error); }
});
externalAdminRoutes.get('/imports/categories/links', validateQuery(z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) }).strict()), async (req, res, next) => {
  try {
    const page = Number(req.query.page); const [links, total] = await Promise.all([
      prisma.externalCategoryLink.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20,
        select: { id: true, source: true, externalId: true, createdAt: true, revokedAt: true,
          category: { select: { id: true, name: true, slug: true } } } }), prisma.externalCategoryLink.count(),
    ]);
    successResponse(res, { links, page, total, totalPages: Math.ceil(total / 20) });
  } catch (error) { next(error); }
});
externalAdminRoutes.post('/imports/categories/links', validateBody(linkExternalCategorySchema), async (req, res, next) => {
  try { successResponse(res, await createExternalCategoryLink(req.user!, req.body), 201); } catch (error) { next(error); }
});
externalAdminRoutes.post('/imports/categories/links/:id/revoke', validateBody(revokeExternalCategoryLinkSchema), async (req, res, next) => {
  try { successResponse(res, await revokeExternalCategoryLink(req.user!, req.params.id, req.body)); } catch (error) { next(error); }
});
externalAdminRoutes.get('/imports/products/batches', validateQuery(z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) }).strict()), async (req, res, next) => {
  try {
    const page = Number(req.query.page); const [batches, total] = await Promise.all([
      prisma.externalProductImportBatch.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20,
        select: { id: true, source: true, preview: true, createdAt: true } }),
      prisma.externalProductImportBatch.count(),
    ]);
    successResponse(res, { batches: batches.map(batch => ({ id: batch.id, source: batch.source, createdAt: batch.createdAt,
      summary: (batch.preview as { summary?: unknown }).summary ?? null, applied: false })), page, total, totalPages: Math.ceil(total / 20) });
  } catch (error) { next(error); }
});
externalAdminRoutes.post('/imports/products/batches', validateBody(stageProductImportSchema), async (req, res, next) => {
  try { successResponse(res, await stageExternalProductImport(req.user!, req.body), 201); } catch (error) { next(error); }
});
externalAdminRoutes.get('/imports/products/batches/:id', validateParams(z.object({ id: z.string().cuid() }).strict()), async (req, res, next) => {
  try {
    const batch = await prisma.externalProductImportBatch.findUnique({ where: { id: req.params.id }, select: { id: true, source: true, rows: true, preview: true, createdAt: true } });
    if (!batch) throw new NotFoundError('Análise de importação não encontrada.');
    const { currentPreview, changedRows } = await compareProductImportBatch(batch);
    successResponse(res, { id: batch.id, source: batch.source, createdAt: batch.createdAt, savedPreview: batch.preview,
      currentPreview, changedRows, applied: false });
  } catch (error) { next(error); }
});
externalAdminRoutes.get('/imports/products/batches/:id/reviews', validateParams(z.object({ id: z.string().cuid() }).strict()),
  validateQuery(z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) }).strict()), async (req, res, next) => {
    try {
      const page = Number(req.query.page);
      if (!await prisma.externalProductImportBatch.findUnique({ where: { id: req.params.id }, select: { id: true } })) {
        throw new NotFoundError('Análise de importação não encontrada.');
      }
      const [reviews, total] = await Promise.all([
        prisma.externalProductImportReview.findMany({ where: { batchId: req.params.id },
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20,
          select: { id: true, summary: true, changedRows: true, createdAt: true } }),
        prisma.externalProductImportReview.count({ where: { batchId: req.params.id } }),
      ]);
      successResponse(res, { reviews, total, page, totalPages: Math.ceil(total / 20) });
    } catch (error) { next(error); }
  });
externalAdminRoutes.post('/imports/products/batches/:id/reviews', validateParams(z.object({ id: z.string().cuid() }).strict()),
  validateBody(recordProductImportReviewSchema), async (req, res, next) => {
    try { successResponse(res, await recordProductImportReview(req.user!, req.params.id, req.body), 201); }
    catch (error) { next(error); }
  });
externalAdminRoutes.get('/imports/products/batches/:id/application', validateParams(z.object({ id: z.string().cuid() }).strict()), async (req, res, next) => {
  try {
    const application = await prisma.externalProductImportApplication.findUnique({ where: { batchId: req.params.id },
      select: { id: true, batchId: true, products: true, skippedRows: true, createdAt: true } });
    successResponse(res, { application: application ? { ...application, applied: true } : null });
  } catch (error) { next(error); }
});
externalAdminRoutes.post('/imports/products/batches/:id/apply-drafts', validateParams(z.object({ id: z.string().cuid() }).strict()),
  validateBody(applyProductImportDraftSchema), async (req, res, next) => {
    try { successResponse(res, await applyProductImportDrafts(req.user!, req.params.id, req.body), 201); }
    catch (error) { next(error); }
  });
externalAdminRoutes.get('/imports/products/links', validateQuery(z.object({ page: z.coerce.number().int().min(1).max(100000).default(1) }).strict()), async (req, res, next) => {
  try {
    const page = Number(req.query.page); const [links, total] = await Promise.all([
      prisma.externalProductLink.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20,
        select: { id: true, source: true, externalId: true, createdAt: true, revokedAt: true, product: { select: { id: true, sku: true, name: true } } } }),
      prisma.externalProductLink.count(),
    ]);
    successResponse(res, { links, page, total, totalPages: Math.ceil(total / 20) });
  } catch (error) { next(error); }
});
externalAdminRoutes.post('/imports/products/preview', validateBody(previewProductImportSchema), async (req, res, next) => {
  try { successResponse(res, await previewProductImport(req.body)); } catch (error) { next(error); }
});
externalAdminRoutes.post('/imports/products/links', validateBody(linkExternalProductSchema), async (req, res, next) => {
  try { successResponse(res, await createExternalProductLink(req.user!, req.body), 201); } catch (error) { next(error); }
});
externalAdminRoutes.post('/imports/products/links/:id/revoke', validateBody(revokeExternalProductLinkSchema), async (req, res, next) => {
  try { successResponse(res, await revokeExternalProductLink(req.user!, req.params.id, req.body)); } catch (error) { next(error); }
});
externalAdminRoutes.get('/clients', validateQuery(paging), async (req, res, next) => {
  try { const page = Number(req.query.page); const [clients, total] = await Promise.all([prisma.externalApiClient.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 20, take: 20, select: { id: true, name: true, source: true, scopes: true, expiresAt: true, revokedAt: true, createdAt: true } }), prisma.externalApiClient.count()]); successResponse(res, { clients, page, total, totalPages: Math.ceil(total / 20) }); } catch (error) { next(error); }
});
externalAdminRoutes.post('/clients', validateBody(createExternalClientSchema), async (req, res, next) => {
  try {
    const input = createExternalClientSchema.parse(req.body); const token = createExternalToken();
    const requestKey = externalTokenHash(`${req.user!.userId}:${input.requestKey}`);
    const client = await prisma.$transaction(async tx => { await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${requestKey}))`; if (await tx.externalApiClient.findUnique({ where: { requestKey } })) throw new ConflictError('Esta credencial já foi emitida. Ela não pode ser exibida novamente; revogue e emita outra se necessário.'); const row = await tx.externalApiClient.create({ data: { requestKey, name: input.name, source: input.source, scopes: input.scopes, expiresAt: new Date(Date.now() + input.validityDays * 86400000), tokenHash: externalTokenHash(token), actorId: req.user!.userId }, select: { id: true, name: true, source: true, scopes: true, expiresAt: true } }); await tx.integrationAudit.create({ data: { actorId: req.user!.userId, jobId: row.id, action: 'EXTERNAL_API_CLIENT_ISSUED' } }); return row; });
    successResponse(res, { ...client, token }, 201);
  } catch (error) { next(error); }
});
externalAdminRoutes.post('/clients/:id/revoke', validateBody(z.object({ confirmed: z.literal(true) }).strict()), async (req, res, next) => {
  try { const row = await prisma.$transaction(async tx => { await tx.$queryRaw`SELECT id FROM external_api_clients WHERE id=${req.params.id} FOR UPDATE`; const current = await tx.externalApiClient.findUnique({ where: { id: req.params.id } }); if (!current) throw new NotFoundError('Credencial não encontrada'); if (!current.revokedAt) { await tx.externalApiClient.update({ where: { id: current.id }, data: { revokedAt: new Date() } }); await tx.integrationAudit.create({ data: { actorId: req.user!.userId, jobId: current.id, action: 'EXTERNAL_API_CLIENT_REVOKED' } }); } return { id: current.id }; }); successResponse(res, row); } catch (error) { next(error); }
});

export const externalApiRoutes: Router = Router();
externalApiRoutes.get('/openapi.json', (_req, res) => { res.setHeader('Cache-Control', 'no-store'); res.json(externalApiOpenApi); });
externalApiRoutes.use((_req, res, next) => { const requestId = randomUUID(); res.locals.requestId = requestId; res.setHeader('X-Request-ID', requestId); res.setHeader('Cache-Control', 'private, no-store'); next(); });
externalApiRoutes.use(async (req, res, next) => {
  try { const token = externalBearer(req.headers.authorization); if (!token) throw new UnauthorizedError('Credencial de integração inválida'); const client = await prisma.externalApiClient.findUnique({ where: { tokenHash: externalTokenHash(token) }, select: { id: true, source: true, scopes: true, expiresAt: true, revokedAt: true } }); if (!client || client.revokedAt || client.expiresAt <= new Date()) throw new UnauthorizedError('Credencial de integração inválida'); res.locals.externalClient = client; next(); } catch (error) { next(error); }
});
externalApiRoutes.use(rateLimit({ windowMs: 60000, max: 30, standardHeaders: true, legacyHeaders: false, keyGenerator: (_req, res) => res.locals.externalClient.id, message: { success: false, error: 'Limite da integração atingido. Aguarde e tente novamente.' } }));
const scope = (name: string): RequestHandler => (_req, res, next) => res.locals.externalClient.scopes.includes(name) ? next() : next(new ForbiddenError('Permissão insuficiente para esta operação'));
externalApiRoutes.post('/imports/products/batches', scope('imports:write'), validateBody(stageProductImportSchema), async (req, res, next) => {
  try { successResponse(res, await stageExternalProductImportFromApi(res.locals.externalClient.id, req.body), 201); }
  catch (error) { next(error); }
});
externalApiRoutes.get('/products', scope('catalog:read'), validateQuery(paging), async (req, res, next) => {
  try {
    const page = Number(req.query.page); const limit = Number(req.query.limit); const where = { ...(req.query.updatedSince ? { updatedAt: { gte: new Date(String(req.query.updatedSince)) } } : {}) };
    const [rows, total] = await Promise.all([prisma.product.findMany({ where, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit, select: { id: true, sku: true, name: true, price: true, categoryId: true, isActive: true, deletedAt: true, updatedAt: true } }), prisma.product.count({ where })]);
    successResponse(res, { products: rows.map(({ price, ...row }) => ({ ...row, priceCents: String(Math.round(price * 100)), currency: 'BRL' })), total, page, limit, totalPages: Math.ceil(total / limit), requestId: res.locals.requestId });
  } catch (error) { next(error); }
});
externalApiRoutes.get('/stock', scope('stock:read'), validateQuery(paging), async (req, res, next) => {
  try { const page = Number(req.query.page); const limit = Number(req.query.limit); const where = { ...(req.query.updatedSince ? { updatedAt: { gte: new Date(String(req.query.updatedSince)) } } : {}) }; const [rows, total] = await Promise.all([prisma.product.findMany({ where, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit, select: { id: true, sku: true, stock: true, reservedStock: true, isActive: true, deletedAt: true, updatedAt: true } }), prisma.product.count({ where })]); successResponse(res, { stock: rows.map(row => ({ ...row, available: Math.max(0, row.stock - row.reservedStock), quantityUnit: 'COMMERCIAL_UNIT' })), total, page, limit, totalPages: Math.ceil(total / limit), requestId: res.locals.requestId }); } catch (error) { next(error); }
});
externalApiRoutes.get('/orders', scope('orders:read'), validateQuery(paging), async (req, res, next) => {
  try { const page = Number(req.query.page); const limit = Number(req.query.limit); const where = { ...(req.query.updatedSince ? { updatedAt: { gte: new Date(String(req.query.updatedSince)) } } : {}) }; const [orders, total] = await Promise.all([prisma.customerOrder.findMany({ where, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit, select: { id: true, referenceCode: true, source: true, status: true, updatedAt: true, items: { select: { productId: true, quantity: true, unitPrice: true } } } }), prisma.customerOrder.count({ where })]); successResponse(res, { orders: orders.map(row => ({ ...row, items: row.items.map(({ unitPrice, ...item }) => ({ ...item, unitPriceCents: String(Math.round(unitPrice * 100)) })) })), total, page, limit, totalPages: Math.ceil(total / limit), requestId: res.locals.requestId }); } catch (error) { next(error); }
});
externalApiRoutes.get('/quotes', scope('quotes:read'), validateQuery(paging), async (req, res, next) => {
  try {
    const page = Number(req.query.page); const limit = Number(req.query.limit);
    const where = { userId: { not: null }, status: { not: 'DRAFT' as const }, ...(req.query.updatedSince ? { updatedAt: { gte: new Date(String(req.query.updatedSince)) } } : {}) };
    const [rows, total] = await Promise.all([prisma.quoteRequest.findMany({ where, orderBy: [{ updatedAt: 'asc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit, select: { id: true, referenceCode: true, source: true, status: true, submittedAt: true, updatedAt: true, _count: { select: { items: true } } } }), prisma.quoteRequest.count({ where })]);
    successResponse(res, { quotes: rows.map(({ _count, ...row }) => ({ ...row, itemCount: _count.items })), total, page, limit, totalPages: Math.ceil(total / limit), requestId: res.locals.requestId });
  } catch (error) { next(error); }
});
externalApiRoutes.get('/quotes/:id/items', scope('quotes:read'), validateParams(z.object({ id: z.string().min(1).max(128) })), validateQuery(paging.omit({ updatedSince: true }).strict()), async (req, res, next) => {
  try {
    const page = Number(req.query.page); const limit = Number(req.query.limit);
    const result = await prisma.$transaction(async tx => {
      const quote = await tx.quoteRequest.findFirst({ where: { id: req.params.id, userId: { not: null }, status: { not: 'DRAFT' } }, select: { id: true, updatedAt: true } });
      if (!quote) throw new NotFoundError('Orçamento não encontrado');
      const where = { quoteRequestId: quote.id };
      const [items, total] = await Promise.all([tx.quoteItem.findMany({ where, orderBy: [{ position: 'asc' }, { id: 'asc' }], skip: (page - 1) * limit, take: limit, select: { id: true, productId: true, name: true, quantity: true, unit: true, position: true } }), tx.quoteItem.count({ where })]);
      return { quoteId: quote.id, quoteUpdatedAt: quote.updatedAt, items, total, page, limit, totalPages: Math.ceil(total / limit) };
    }, { isolationLevel: 'RepeatableRead' });
    successResponse(res, { ...result, requestId: res.locals.requestId });
  } catch (error) { next(error); }
});
