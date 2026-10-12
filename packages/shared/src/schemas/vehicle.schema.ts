import { z } from 'zod';
// Decimal strings preserve the declared physical unit without floating point rounding.
const capacity = z.string().regex(/^\d{1,9}(?:\.\d{1,3})?$/, 'Use até três casas decimais.').refine(value => Number(value) > 0, 'Informe uma capacidade positiva.').nullable();
export const vehicleSchema = z.object({
  requestKey: z.string().uuid(), expectedVersion: z.number().int().min(0), confirmed: z.literal(true),
  plate: z.string().trim().transform(value => value.toUpperCase().replace(/[- ]/g, '')).pipe(z.string().regex(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, 'Confira a placa brasileira.')),
  label: z.string().trim().min(2).max(80), maxLoadKg: capacity, maxVolumeM3: capacity,
  restrictions: z.string().trim().max(500).nullable(), active: z.boolean(), reason: z.string().trim().min(3).max(300),
}).strict();
export type VehicleInput = z.infer<typeof vehicleSchema>;
