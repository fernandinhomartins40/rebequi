import { z } from 'zod';
export const externalScopeSchema = z.enum(['catalog:read', 'stock:read', 'orders:read', 'quotes:read', 'imports:write']);
const source = z.string().trim().min(1).max(120).regex(/^[A-Za-z0-9._:-]+$/);
export const createExternalClientSchema = z.object({ requestKey: z.string().uuid(), name: z.string().trim().min(3).max(100),
  source: source.optional(), scopes: z.array(externalScopeSchema).min(1).max(5).refine(values => new Set(values).size === values.length, 'Permissão repetida'),
  validityDays: z.number().int().min(1).max(365), confirmed: z.literal(true) }).strict()
  .refine(value => !value.scopes.includes('imports:write') || Boolean(value.source), { message: 'Informe a origem para enviar lotes de importação' });
export type CreateExternalClientInput = z.infer<typeof createExternalClientSchema>;
