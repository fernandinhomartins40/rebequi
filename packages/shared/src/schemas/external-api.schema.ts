import { z } from 'zod';
export const externalScopeSchema = z.enum(['catalog:read', 'stock:read', 'orders:read']);
export const createExternalClientSchema = z.object({ requestKey: z.string().uuid(), name: z.string().trim().min(3).max(100), scopes: z.array(externalScopeSchema).min(1).max(3).refine(values => new Set(values).size === values.length, 'Permissão repetida'), validityDays: z.number().int().min(1).max(365), confirmed: z.literal(true) }).strict();
export type CreateExternalClientInput = z.infer<typeof createExternalClientSchema>;
