import { z } from 'zod';

const code = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9._:-]+$/);
export const previewProductImportSchema = z.object({
  source: code,
  rows: z.array(z.object({
    externalId: code,
    sku: code,
    name: z.string().trim().min(2).max(180),
    categoryId: z.string().min(1).max(128).optional(),
    externalCategoryId: code.optional(),
    priceCents: z.string().regex(/^\d{1,12}$/),
    stockQuantity: z.string().regex(/^\d{1,9}$/),
  }).strict().refine(row => Boolean(row.categoryId) !== Boolean(row.externalCategoryId), {
    message: 'Informe apenas categoryId ou externalCategoryId',
  })).min(1).max(100),
}).strict();
export type PreviewProductImportInput = z.infer<typeof previewProductImportSchema>;
export const stageProductImportSchema = previewProductImportSchema.extend({
  requestKey: z.string().uuid(), confirmed: z.literal(true),
});
export const recordProductImportReviewSchema = z.object({ requestKey: z.string().uuid(), confirmed: z.literal(true) }).strict();
export const linkExternalProductSchema = z.object({
  requestKey: z.string().uuid(), source: code, externalId: code,
  productId: z.string().min(1).max(128), expectedSku: code, confirmed: z.literal(true),
}).strict();
export const revokeExternalProductLinkSchema = z.object({ confirmed: z.literal(true), reason: z.string().trim().min(3).max(300) }).strict();
