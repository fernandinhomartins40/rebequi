import { z } from 'zod';
import { isValidWhatsapp, normalizeWhatsapp } from '../utils/index.js';

const normalizedWhatsappSchema = z
  .string()
  .min(10, 'WhatsApp com DDD e obrigatorio')
  .transform((value) => normalizeWhatsapp(value))
  .refine((value) => isValidWhatsapp(value), 'Informe um WhatsApp valido com DDD');

export const quoteStatusSchema = z.enum(['DRAFT', 'SUBMITTED', 'IN_REVIEW', 'RESPONDED', 'ARCHIVED']);
export const leadStatusSchema = z.enum(['STARTED', 'QUOTE_DRAFTED', 'QUOTE_SUBMITTED', 'CONTACTED', 'ARCHIVED']);

export const startLeadSchema = z.object({
  name: z.string().min(1, 'Nome e obrigatorio').max(255, 'Nome muito longo'),
  whatsapp: normalizedWhatsappSchema,
});

export const quoteItemInputSchema = z.object({
  productId: z.string().nullable().optional(),
  name: z.string().min(1, 'Nome do item e obrigatorio').max(255, 'Nome muito longo'),
  quantity: z.number().positive('Quantidade deve ser positiva').default(1),
  unit: z.string().max(30, 'Unidade muito longa').nullable().optional(),
  notes: z.string().max(500, 'Observacao muito longa').nullable().optional(),
});

export const updateQuoteDraftSchema = z.object({
  title: z.string().max(255, 'Titulo muito longo').nullable().optional(),
  customerNote: z.string().max(1500, 'Observacao muito longa').nullable().optional(),
  items: z.array(quoteItemInputSchema).min(1, 'Adicione pelo menos um item ao orçamento'),
});

export const updateQuoteStatusSchema = z.object({
  status: quoteStatusSchema,
});

export const updateLeadStatusSchema = z.object({
  status: leadStatusSchema,
});

export const quoteFiltersSchema = z.object({
  status: quoteStatusSchema.optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export const leadFiltersSchema = z.object({
  status: leadStatusSchema.optional(),
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
});

export type StartLeadInput = z.infer<typeof startLeadSchema>;
export type QuoteItemInput = z.infer<typeof quoteItemInputSchema>;
export type UpdateQuoteDraftInput = z.infer<typeof updateQuoteDraftSchema>;
export type UpdateQuoteStatusInput = z.infer<typeof updateQuoteStatusSchema>;
export type UpdateLeadStatusInput = z.infer<typeof updateLeadStatusSchema>;
export type QuoteFiltersInput = z.infer<typeof quoteFiltersSchema>;
export type LeadFiltersInput = z.infer<typeof leadFiltersSchema>;
