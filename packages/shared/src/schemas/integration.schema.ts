import { z } from 'zod';
export const quoteAiProviderSchema = z.enum(['deepseek', 'qwen']);
const secret = z.union([z.string().trim().min(10).max(512), z.literal(''), z.null()]).optional();
export const quoteAiUpdateSchema = z.object({
 enabled: z.boolean().optional(), primaryProvider: quoteAiProviderSchema.optional(), fallbackEnabled: z.boolean().optional(),
 deepseekApiKey: secret, qwenApiKey: secret,
 deepseekModel: z.enum(['deepseek-flash']).optional(), qwenModel: z.enum(['qwen3-vl-flash', 'qwen3-vl-plus']).optional(),
 timeoutMs: z.number().int().min(10000).max(45000).optional(), maxTokens: z.number().int().min(512).max(8000).optional(),
}).strict().refine(value => Object.keys(value).length > 0, 'Informe uma configuração');
export const quoteAiTestSchema = z.object({ provider: quoteAiProviderSchema }).strict();
export type QuoteAiUpdateBody = z.infer<typeof quoteAiUpdateSchema>;
export type QuoteAiTestBody = z.infer<typeof quoteAiTestSchema>;
export type QuoteAiProvider = z.infer<typeof quoteAiProviderSchema>;
