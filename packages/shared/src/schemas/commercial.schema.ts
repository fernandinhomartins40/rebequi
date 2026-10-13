import { z } from 'zod';
export const commercialKindSchema = z.enum(['customer', 'lead', 'quote', 'order', 'sale']);
export const commercialAssignmentSchema = z.object({ sellerId: z.string().min(1).max(128).nullable(), expectedVersion: z.number().int().min(0), reason: z.string().trim().min(3).max(500), confirmed: z.literal(true) }).strict();
export type CommercialAssignmentInput = z.infer<typeof commercialAssignmentSchema>;
export type CommercialKind = z.infer<typeof commercialKindSchema>;
export const commercialQuoteSchema = z.object({
  requestKey: z.string().uuid(), confirmed: z.literal(true), customerId: z.string().min(1).max(128), expectedCustomerVersion: z.number().int().min(0),
  title: z.string().trim().min(3).max(255), note: z.string().trim().max(1500).default(''),
  items: z.array(z.object({ productId: z.string().min(1).max(128).nullable(), name: z.string().trim().min(1).max(255), quantity: z.number().finite().positive().max(1000000), unit: z.string().trim().max(30).nullable() }).strict()).min(1).max(100),
}).strict().refine(value => { const ids = value.items.filter(item => item.productId).map(item => item.productId); return new Set(ids).size === ids.length; }, 'Junte as quantidades do mesmo produto.');
export type CommercialQuoteInput = z.infer<typeof commercialQuoteSchema>;
