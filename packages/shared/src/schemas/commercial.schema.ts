import { z } from 'zod';
export const commercialKindSchema = z.enum(['customer', 'lead', 'quote', 'order', 'sale']);
export const commercialAssignmentSchema = z.object({ sellerId: z.string().min(1).max(128).nullable(), expectedVersion: z.number().int().min(0), reason: z.string().trim().min(3).max(500), confirmed: z.literal(true) }).strict();
export type CommercialAssignmentInput = z.infer<typeof commercialAssignmentSchema>;
export type CommercialKind = z.infer<typeof commercialKindSchema>;
