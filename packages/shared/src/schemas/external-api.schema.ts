import { z } from 'zod';
export const externalScopeSchema = z.enum(['catalog:read', 'stock:read', 'orders:read', 'quotes:read', 'imports:write', 'catalog:write', 'stock:write', 'customers:read', 'customers:write', 'sales:read', 'sales:write']);
const source = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9._:-]+$/);
export const createExternalClientSchema = z.object({ requestKey: z.string().uuid(), name: z.string().trim().min(3).max(100),
  source: source.optional(), scopes: z.array(externalScopeSchema).min(1).max(11).refine(values => new Set(values).size === values.length, 'Permissão repetida'),
  validityDays: z.number().int().min(1).max(365), confirmed: z.literal(true) }).strict()
  .refine(value => !value.scopes.some(scope => scope.endsWith(':write')) || Boolean(value.source), { message: 'Informe a origem para permitir operações de escrita' });
export type CreateExternalClientInput = z.infer<typeof createExternalClientSchema>;

export const externalIdSchema = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9._:-]+$/);
const mutation = { requestKey: z.string().uuid(), expectedUpdatedAt: z.string().datetime().nullable() };
const cents = z.string().regex(/^(0|[1-9]\d{0,8})$/);
export const syncProductSchema = z.object({ ...mutation, sku: z.string().trim().min(1).max(100), name: z.string().trim().min(1).max(255),
  categoryId: z.string().min(1).max(128), priceCents: cents, isActive: z.boolean() }).strict();
export const syncStockSchema = z.object({ ...mutation, expectedUpdatedAt: z.string().datetime(),
  quantity: z.number().int().min(0).max(1000000000), reason: z.string().trim().min(3).max(300) }).strict();
export const syncCustomerSchema = z.object({ ...mutation, name: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255).transform(value => value.toLowerCase()).optional() }).strict()
  .refine(value => value.expectedUpdatedAt !== null || Boolean(value.email), 'Informe o e-mail para criar um cliente.');
export const syncSaleSchema = z.object({ customerExternalId: externalIdSchema.optional(),
  orderId: z.string().min(1).max(128).optional(), paymentMethod: z.enum(['PIX', 'CASH', 'CARD', 'INSTALLMENT']),
  status: z.enum(['PAID', 'PENDING_PAYMENT']).default('PAID'), discountCents: cents.default('0'),
  items: z.array(z.object({ productId: z.string().min(1).max(128), quantity: z.number().int().min(1).max(9999), unitPriceCents: cents }).strict()).min(1).max(100).optional(),
}).strict().refine(value => Boolean(value.orderId) || Boolean(value.items?.length), 'Informe itens ou pedido.')
  .refine(value => !value.orderId || !value.items, 'Informe apenas itens ou pedido.')
  .refine(value => !value.items || new Set(value.items.map(item => item.productId)).size === value.items.length, 'Produto repetido.');
export const syncSaleStatusSchema = z.object({ status: z.enum(['PAID', 'CANCELED']) }).strict();
