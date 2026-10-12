import { z } from 'zod';
export const partnerAiConfigSchema = z.object({ enabled: z.boolean(), provider: z.enum(['deepseek', 'qwen']), dailyLimit: z.number().int().min(1).max(20),
  monthlyBudgetCents: z.number().int().min(0).max(100000), inputRateMicroUsd: z.number().int().min(1).max(100000000), outputRateMicroUsd: z.number().int().min(1).max(100000000),
  expectedVersion: z.number().int().min(0), tariffsConfirmed: z.literal(true),
}).strict().refine(value => !value.enabled || value.monthlyBudgetCents > 0, 'Defina um teto de gasto antes de ativar');
export const partnerAiInputSchema = z.object({ description: z.string().trim().min(10).max(4000), technicalOnly: z.literal(true), requestKey: z.string().uuid() }).strict();
export const partnerAiResultSchema = z.object({ service: z.enum(['PAINT', 'TILE']).nullable(), areaM2: z.number().finite().positive().max(100000).nullable(),
  openingsM2: z.number().finite().min(0).max(100000).nullable(), coats: z.number().int().min(1).max(6).nullable(), lossPercent: z.number().finite().min(0).max(30).nullable(),
}).strict().refine(value => value.areaM2 === null || value.openingsM2 === null || value.openingsM2 < value.areaM2, 'Áreas incompatíveis');
export type PartnerAiConfigInput = z.infer<typeof partnerAiConfigSchema>;
export type PartnerAiInput = z.infer<typeof partnerAiInputSchema>;
export type PartnerAiResult = z.infer<typeof partnerAiResultSchema>;
