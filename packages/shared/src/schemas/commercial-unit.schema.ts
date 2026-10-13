import { z } from 'zod';
import { parseCommercialQuantity } from '../utils/commercial-quantity.js';
const decimal = z.string().regex(/^\d{1,9}(?:\.\d{1,3})?$/);
const positive = decimal.refine(value => {
  try { return parseCommercialQuantity(value) > 0n; } catch { return false; }
}, 'Informe uma quantidade positiva.');
export const commercialUnitCodeSchema = z.enum(['UNIT', 'PACKAGE', 'BAG', 'BOX', 'KG', 'TONNE', 'M', 'M2', 'M3', 'L']);

/** No defaults: a seller must explicitly verify the commercial/stock relationship. */
export const commercialUnitPolicySchema = z.object({
  commercialUnit: commercialUnitCodeSchema,
  stockUnit: commercialUnitCodeSchema,
  stockPerCommercialUnit: positive,
  quantityStep: positive,
  confirmed: z.literal(true),
}).strict().superRefine((value, context) => {
  if (!positive.safeParse(value.stockPerCommercialUnit).success || !positive.safeParse(value.quantityStep).success) return;
  const factor = parseCommercialQuantity(value.stockPerCommercialUnit);
  const step = parseCommercialQuantity(value.quantityStep);
  if (value.commercialUnit === value.stockUnit && factor !== 1000n) context.addIssue({ code: 'custom', path: ['stockPerCommercialUnit'], message: 'Na mesma unidade, o fator precisa ser 1.' });
  if (['UNIT', 'PACKAGE', 'BAG', 'BOX'].includes(value.commercialUnit) && step % 1000n !== 0n) context.addIssue({ code: 'custom', path: ['quantityStep'], message: 'Unidades e embalagens exigem passo inteiro.' });
  if (factor * step % 1000n !== 0n) context.addIssue({ code: 'custom', path: ['quantityStep'], message: 'O passo convertido exige mais de três casas no estoque.' });
});
export type CommercialUnitPolicy = z.infer<typeof commercialUnitPolicySchema>;
export const saveCommercialUnitPolicySchema = z.object({
  requestKey: z.string().uuid(), expectedVersion: z.number().int().min(0),
  policy: commercialUnitPolicySchema, reason: z.string().trim().min(3).max(300),
}).strict();
export type SaveCommercialUnitPolicyInput = z.infer<typeof saveCommercialUnitPolicySchema>;

export function validateCommercialUnitQuantity(policy: CommercialUnitPolicy, quantity: string): string {
  const verified = commercialUnitPolicySchema.parse(policy);
  const amount = positive.parse(quantity);
  const scaled = parseCommercialQuantity(amount);
  if (scaled % parseCommercialQuantity(verified.quantityStep) !== 0n) throw new Error('Quantidade fora do passo permitido para este produto.');
  return amount;
}
