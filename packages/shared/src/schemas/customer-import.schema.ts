import { z } from 'zod';
import { isValidWhatsapp, normalizeWhatsapp } from '../utils/index.js';

const code = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9._:-]+$/);
const email = z.string().trim().toLowerCase().email().max(254);
const whatsapp = z.string().trim().transform(normalizeWhatsapp).refine(isValidWhatsapp);
export const previewCustomerImportSchema = z.object({
  source: code,
  rows: z.array(z.object({
    externalId: code,
    name: z.string().trim().min(2).max(120),
    email: email.optional(),
    whatsapp: whatsapp.optional(),
  }).strict().refine(row => Boolean(row.email || row.whatsapp), { message: 'Informe email ou WhatsApp' })).min(1).max(100),
}).strict();
export type PreviewCustomerImportInput = z.infer<typeof previewCustomerImportSchema>;
export const stageCustomerImportSchema = previewCustomerImportSchema.extend({
  requestKey: z.string().uuid(), confirmed: z.literal(true),
});
export type StageCustomerImportInput = z.infer<typeof stageCustomerImportSchema>;
export const linkExternalCustomerSchema = z.object({
  requestKey: z.string().uuid(), source: code, externalId: code,
  customerId: z.string().min(1).max(128),
  expectedEmail: email.optional(), expectedWhatsapp: whatsapp.optional(),
  confirmed: z.literal(true),
}).strict().refine(row => Boolean(row.expectedEmail || row.expectedWhatsapp), { message: 'Confirme email ou WhatsApp' });
export const revokeExternalCustomerLinkSchema = z.object({
  confirmed: z.literal(true), reason: z.string().trim().min(3).max(300),
}).strict();
