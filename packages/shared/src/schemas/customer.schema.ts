import { z } from 'zod';

export const customerStageSchema = z.enum([
  'NEW',
  'QUOTING',
  'NEGOTIATING',
  'CUSTOMER',
  'RECURRING',
  'INACTIVE',
]);

export const customerFiltersSchema = z.object({
  search: z.string().trim().optional(),
  stage: customerStageSchema.optional(),
  tag: z.string().trim().optional(),
  followUpDue: z
    .preprocess((value) => {
      if (value === 'true' || value === true) return true;
      if (value === 'false' || value === false || value === undefined) return false;
      return value;
    }, z.boolean())
    .optional()
    .default(false),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const updateCustomerCrmSchema = z
  .object({
    stage: customerStageSchema.optional(),
    // stageManual controla se o estágio fica travado; se stage é enviado, assume manual=true por padrão.
    stageManual: z.boolean().optional(),
    tags: z.array(z.string().trim().min(1).max(40)).max(20, 'Máximo de 20 etiquetas').optional(),
    followUpAt: z.string().datetime().nullable().optional(),
  })
  .refine(
    (data) =>
      data.stage !== undefined ||
      data.stageManual !== undefined ||
      data.tags !== undefined ||
      data.followUpAt !== undefined,
    { message: 'Nada para atualizar.' }
  );

export const createCustomerNoteSchema = z.object({
  body: z.string().trim().min(1, 'A anotação não pode ficar vazia').max(4000, 'Anotação muito longa'),
});

export type CustomerStageInput = z.infer<typeof customerStageSchema>;
export type CustomerFiltersInput = z.infer<typeof customerFiltersSchema>;
export type UpdateCustomerCrmInput = z.infer<typeof updateCustomerCrmSchema>;
export type CreateCustomerNoteInput = z.infer<typeof createCustomerNoteSchema>;
