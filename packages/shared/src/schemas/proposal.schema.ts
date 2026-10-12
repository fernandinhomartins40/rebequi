import { z } from 'zod';
export const proposalItemSchema = z.object({ productId: z.string().min(1).max(100), quantity: z.number().int().min(1).max(1000000), unitPriceCents: z.number().int().min(0).max(100000000) }).strict();
export const proposalSchema = z.object({ items: z.array(proposalItemSchema).min(1).max(50).refine(items => new Set(items.map(item => item.productId)).size === items.length, 'Agrupe produtos repetidos'),
  notes: z.string().trim().max(1500).default(''), validityDays: z.number().int().min(1).max(30), expectedLatestVersion: z.number().int().min(0), requestKey: z.string().uuid(),
}).strict();
export const acceptProposalSchema = z.object({ version: z.number().int().positive(), confirmed: z.literal(true) }).strict();
export type ProposalInput = z.infer<typeof proposalSchema>;
