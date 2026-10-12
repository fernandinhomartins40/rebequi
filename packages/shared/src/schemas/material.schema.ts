import { z } from 'zod';
const measure = z.number().finite().positive().max(100000);
export const materialServiceSchema = z.enum(['PAINT', 'TILE']);
export const technicalParametersSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('PAINT'), packageLiters: measure, coverageM2PerPack: measure, coverageBasis: z.enum(['PER_COAT', 'FINISHED']) }).strict(),
  z.object({ kind: z.literal('TILE'), areaM2PerPack: measure }).strict(),
]);
export const technicalSpecSchema = z.object({ parameters: technicalParametersSchema,
  sourceUrl: z.string().url().max(1000).refine(value => value.startsWith('https://'), 'Use o endereço HTTPS da ficha técnica'),
  confirmed: z.literal(true), expectedVersion: z.number().int().min(0),
}).strict();
export const materialInputSchema = z.object({
  service: materialServiceSchema, areaM2: measure, openingsM2: z.number().finite().min(0).max(100000).default(0),
  coats: z.number().int().min(1).max(6).default(2), lossPercent: z.number().finite().min(0).max(30).default(10),
}).strict().refine(value => value.openingsM2 < value.areaM2, 'As aberturas devem ser menores que a área total');
export const projectSchema = z.object({ title: z.string().trim().min(2).max(120), service: materialServiceSchema,
  reference: z.string().trim().max(300).default(''), clientName: z.string().trim().max(120).default(''), notes: z.string().trim().max(1500).default(''),
  rooms: z.array(z.object({ name: z.string().trim().min(1).max(80), lengthM: measure, widthM: measure }).strict()).max(20).default([]),
  expectedVersion: z.number().int().min(0), archived: z.boolean().default(false),
  requestKey: z.string().uuid().optional(),
}).strict();
export const createEstimateSchema = z.object({ projectId: z.string().min(1).max(100), productId: z.string().min(1).max(100), input: materialInputSchema, requestKey: z.string().uuid() }).strict();
export const requestEstimateQuoteSchema = z.object({ quantity: z.number().int().positive().max(1000000) }).strict();
export type TechnicalParameters = z.infer<typeof technicalParametersSchema>;
export type TechnicalSpecInput = z.infer<typeof technicalSpecSchema>;
export type MaterialInput = z.infer<typeof materialInputSchema>;
export type ProjectInput = z.infer<typeof projectSchema>;
export type CreateEstimateInput = z.infer<typeof createEstimateSchema>;
