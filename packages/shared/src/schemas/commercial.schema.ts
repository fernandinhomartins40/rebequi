import { z } from 'zod';
import { checkoutOrderItemSchema } from './order.schema.js';
export const commercialKindSchema = z.enum(['customer', 'lead', 'quote', 'order', 'sale']);
export const commercialAssignmentSchema = z.object({ sellerId: z.string().min(1).max(128).nullable(), expectedVersion: z.number().int().min(0), reason: z.string().trim().min(3).max(500), confirmed: z.literal(true) }).strict();
export type CommercialAssignmentInput = z.infer<typeof commercialAssignmentSchema>;
export type CommercialKind = z.infer<typeof commercialKindSchema>;
export const sellerGoalSchema = z.object({
  requestKey: z.string().uuid(), sellerId: z.string().min(1).max(128),
  month: z.string().regex(/^20\d{2}-(?:0[1-9]|1[0-2])$/),
  targetCents: z.string().regex(/^\d{1,12}$/).refine(value => BigInt(value) > 0n),
  expectedVersion: z.number().int().min(0).max(10000),
  reason: z.string().trim().min(3).max(500), confirmed: z.literal(true),
}).strict();
export type SellerGoalInput = z.infer<typeof sellerGoalSchema>;
export const sellerCommissionDraftSchema = z.object({
  requestKey: z.string().uuid(), expectedVersion: z.number().int().min(0).max(10000),
  effectiveMonth: z.string().regex(/^20\d{2}-(?:0[1-9]|1[0-2])$/),
  basis: z.literal('NET_PAID_SALE_AFTER_RETURNS'), eligibleRole: z.literal('SALES'),
  basisPoints: z.number().int().min(0).max(10000),
  maturityDays: z.number().int().min(0).max(365),
  reason: z.string().trim().min(3).max(500), confirmed: z.literal(true),
}).strict();
export type SellerCommissionDraftInput = z.infer<typeof sellerCommissionDraftSchema>;
export const commercialQuoteSchema = z.object({
  requestKey: z.string().uuid(), confirmed: z.literal(true), customerId: z.string().min(1).max(128), expectedCustomerVersion: z.number().int().min(0),
  title: z.string().trim().min(3).max(255), note: z.string().trim().max(1500).default(''),
  items: z.array(z.object({ productId: z.string().min(1).max(128).nullable(), name: z.string().trim().min(1).max(255), quantity: z.number().finite().positive().max(1000000), unit: z.string().trim().max(30).nullable() }).strict()).min(1).max(100),
}).strict().refine(value => { const ids = value.items.filter(item => item.productId).map(item => item.productId); return new Set(ids).size === ids.length; }, 'Junte as quantidades do mesmo produto.');
export type CommercialQuoteInput = z.infer<typeof commercialQuoteSchema>;
export const commercialOrderSchema = z.object({
  requestKey: z.string().uuid(), confirmed: z.literal(true),
  customerId: z.string().min(1).max(128), expectedCustomerVersion: z.number().int().min(0),
  note: z.string().trim().max(1000).default(''),
  items: z.array(checkoutOrderItemSchema.omit({ promotionId: true }).extend({
    expectedUnitPriceCents: z.string().regex(/^\d{1,12}$/),
  }).strict()).min(1).max(100),
}).strict().refine(value => new Set(value.items.map(item => item.productId)).size === value.items.length,
  'Junte as quantidades do mesmo produto.');
export type CommercialOrderInput = z.infer<typeof commercialOrderSchema>;
