import { z } from 'zod';
export const laborItemSchema = z.object({ description: z.string().trim().min(2).max(160),
  quantity: z.number().finite().positive().max(10000).refine(value => Number(value.toFixed(3)) === value, 'Use até três casas decimais'),
  unit: z.enum(['serviço', 'm²', 'metro', 'hora', 'dia', 'unidade']),
  unitPriceCents: z.number().int().min(0).max(100000000),
}).strict();
export const laborQuoteSchema = z.object({ projectId: z.string().min(1).max(100), title: z.string().trim().min(2).max(120),
  items: z.array(laborItemSchema).min(1).max(50), notes: z.string().trim().max(1500).default(''),
  validityDays: z.number().int().min(1).max(90), expectedLatestVersion: z.number().int().min(0), requestKey: z.string().uuid(),
}).strict();
export type LaborQuoteInput = z.infer<typeof laborQuoteSchema>;
