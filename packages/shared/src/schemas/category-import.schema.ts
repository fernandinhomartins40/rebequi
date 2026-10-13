import { z } from 'zod';
const code = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9._:-]+$/);
export const previewCategoryImportSchema = z.object({ source: code,
  rows: z.array(z.object({ externalId: code, name: z.string().trim().min(2).max(120),
    slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) }).strict()).min(1).max(100),
}).strict();
export type PreviewCategoryImportInput = z.infer<typeof previewCategoryImportSchema>;
export const linkExternalCategorySchema = z.object({ requestKey: z.string().uuid(), source: code, externalId: code,
  categoryId: z.string().min(1).max(128), expectedSlug: z.string().min(2).max(120), confirmed: z.literal(true) }).strict();
export const revokeExternalCategoryLinkSchema = z.object({ confirmed: z.literal(true), reason: z.string().trim().min(3).max(300) }).strict();
