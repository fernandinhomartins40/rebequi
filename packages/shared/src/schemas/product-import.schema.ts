import { z } from 'zod';

const code = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9._:-]+$/);
export const previewProductImportSchema = z.object({
  source: code,
  rows: z.array(z.object({
    externalId: code,
    sku: code,
    name: z.string().trim().min(2).max(180),
    categoryId: z.string().min(1).max(128),
    priceCents: z.string().regex(/^\d{1,12}$/),
    stockQuantity: z.string().regex(/^\d{1,9}$/),
  }).strict()).min(1).max(100),
}).strict();
export type PreviewProductImportInput = z.infer<typeof previewProductImportSchema>;
