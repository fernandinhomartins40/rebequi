/**
 * Integration Settings Schemas
 * Shared validation for OpenRouter configuration endpoints.
 */

import { z } from 'zod';

export const openRouterUpdateSchema = z
  .object({
    enabled: z.boolean().optional(),
    // null clears the key; undefined leaves it as-is; string stores a new key.
    apiKey: z
      .union([z.string().trim().min(10, 'Chave muito curta'), z.literal(''), z.null()])
      .optional(),
    primaryModel: z.string().trim().min(3).max(120).optional(),
    fallbackModel: z.string().trim().min(3).max(120).optional(),
    timeoutMs: z.coerce.number().int().min(2_000).max(60_000).optional(),
    referer: z.string().trim().url('URL inválida').optional(),
    title: z.string().trim().min(1).max(80).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'Informe ao menos um campo para atualização',
  });

export const openRouterTestSchema = z.object({
  apiKey: z.string().trim().min(10).optional(),
});

export type OpenRouterUpdateBody = z.infer<typeof openRouterUpdateSchema>;
export type OpenRouterTestBody = z.infer<typeof openRouterTestSchema>;
