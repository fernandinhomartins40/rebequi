import sharp from 'sharp';
import { z } from 'zod';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.util.js';

const extractedItemSchema = z.object({
  name: z.string().trim().min(1).max(200),
  quantity: z.coerce.number().positive().max(99999).default(1),
  unit: z.string().trim().max(40).nullish().transform((value) => value || null),
  notes: z.string().trim().max(400).nullish().transform((value) => value || null),
});

const extractionSchema = z.object({
  title: z.string().trim().max(160).nullish().transform((value) => value || null),
  customerNote: z.string().trim().max(2500).nullish().transform((value) => value || null),
  transcriptText: z.string().trim().max(20000).nullish().transform((value) => value || null),
  needsReview: z.array(z.string().trim().min(1).max(200)).max(12).default([]),
  items: z.array(extractedItemSchema).max(60).default([]),
});

type ExtractionPayload = z.infer<typeof extractionSchema>;

const extractionFormat = {
  type: 'object',
  properties: {
    title: { type: ['string', 'null'] },
    customerNote: { type: ['string', 'null'] },
    transcriptText: { type: ['string', 'null'] },
    needsReview: {
      type: 'array',
      items: { type: 'string' },
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          quantity: { type: 'number' },
          unit: { type: ['string', 'null'] },
          notes: { type: ['string', 'null'] },
        },
        required: ['name', 'quantity', 'unit', 'notes'],
      },
    },
  },
  required: ['title', 'customerNote', 'transcriptText', 'needsReview', 'items'],
} as const;

const systemPrompt = [
  'Voce extrai pedidos de orcamento a partir de uma unica imagem enviada por clientes brasileiros.',
  'Leia texto impresso, manuscrito e listas informais.',
  'Sua resposta deve ser somente JSON valido seguindo exatamente o schema solicitado.',
  'Nunca invente marcas, medidas ou quantidades que nao aparecem na imagem.',
  'Quando houver duvida, preserve o texto em transcriptText e registre a ambiguidade em needsReview.',
].join(' ');

const userPrompt = [
  'Analise a imagem e converta o conteudo em um rascunho de pedido de orcamento.',
  'Extraia um titulo curto se houver contexto suficiente.',
  'Monte items com name, quantity, unit e notes.',
  'Use quantity=1 quando a quantidade nao estiver clara.',
  'Coloque observacoes gerais em customerNote.',
  'Copie o texto reconhecido de forma corrida em transcriptText.',
  'Em needsReview, liste somente pontos realmente ambiguos ou incompletos.',
].join(' ');

type OllamaChatResponse = {
  message?: {
    content?: string;
  };
};

export type ExtractedQuoteDocument = {
  title: string | null;
  customerNote: string | null;
  transcriptText: string | null;
  needsReview: string[];
  items: Array<{
    name: string;
    quantity: number;
    unit: string | null;
    notes: string | null;
  }>;
};

export class QuoteDocumentIntelligenceService {
  private warmupPromise?: Promise<void>;

  async extractDocument(buffer: Buffer): Promise<ExtractedQuoteDocument> {
    await this.ensureModelAvailable();
    const preparedImage = await this.prepareImage(buffer);

    try {
      const response = await fetch(`${trimTrailingSlash(env.QUOTE_OLLAMA_BASE_URL)}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: env.QUOTE_OLLAMA_MODEL,
          stream: false,
          keep_alive: env.QUOTE_OLLAMA_KEEP_ALIVE,
          format: extractionFormat,
          options: {
            temperature: 0,
          },
          messages: [
            {
              role: 'system',
              content: systemPrompt,
            },
            {
              role: 'user',
              content: userPrompt,
              images: [preparedImage.toString('base64')],
            },
          ],
        }),
        signal: AbortSignal.timeout(env.QUOTE_OLLAMA_TIMEOUT_MS),
      });

      if (!response.ok) {
        const body = await safeReadText(response);
        logger.error('Ollama returned a non-success response for quote extraction.', {
          status: response.status,
          body,
        });
        throw new Error('Ollama respondeu com erro ao analisar o documento.');
      }

      const payload = (await response.json()) as OllamaChatResponse;
      const content = payload.message?.content?.trim();

      if (!content) {
        throw new Error('Ollama nao retornou conteudo estruturado para o documento.');
      }

      return this.normalizeExtraction(content);
    } catch (error) {
      logger.error('Quote document extraction failed.', {
        error,
        model: env.QUOTE_OLLAMA_MODEL,
        baseUrl: env.QUOTE_OLLAMA_BASE_URL,
      });
      throw new Error('Nao foi possivel interpretar a foto do pedido no momento.');
    }
  }

  private async prepareImage(buffer: Buffer) {
    return sharp(buffer, {
      failOn: 'none',
    })
      .rotate()
      .flatten({
        background: '#ffffff',
      })
      .jpeg({
        quality: 92,
        mozjpeg: true,
      })
      .toBuffer();
  }

  private async ensureModelAvailable() {
    if (!this.warmupPromise) {
      this.warmupPromise = (async () => {
        const response = await fetch(`${trimTrailingSlash(env.QUOTE_OLLAMA_BASE_URL)}/api/tags`, {
          signal: AbortSignal.timeout(Math.min(env.QUOTE_OLLAMA_TIMEOUT_MS, 30_000)),
        });

        if (!response.ok) {
          const body = await safeReadText(response);
          throw new Error(`Ollama indisponivel: ${response.status} ${body}`);
        }

        const payload = (await response.json()) as {
          models?: Array<{ name?: string; model?: string }>;
        };
        const modelLoaded = (payload.models ?? []).some(
          (model) => model.name === env.QUOTE_OLLAMA_MODEL || model.model === env.QUOTE_OLLAMA_MODEL
        );

        if (!modelLoaded) {
          throw new Error(`Modelo ${env.QUOTE_OLLAMA_MODEL} nao encontrado no Ollama.`);
        }
      })().catch((error: unknown) => {
        logger.error('Quote document intelligence is not available.', {
          error,
          model: env.QUOTE_OLLAMA_MODEL,
          baseUrl: env.QUOTE_OLLAMA_BASE_URL,
        });
        throw new Error('A inteligencia de leitura de pedidos nao esta disponivel no ambiente atual.');
      });
    }

    await this.warmupPromise;
  }

  private normalizeExtraction(content: string): ExtractedQuoteDocument {
    const parsed = extractionSchema.parse(JSON.parse(content)) as ExtractionPayload;
    const items = parsed.items
      .map((item) => ({
        name: item.name.trim(),
        quantity: Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1,
        unit: item.unit || null,
        notes: item.notes || null,
      }))
      .filter((item) => item.name.length > 0);

    return {
      title: parsed.title,
      customerNote: parsed.customerNote,
      transcriptText: parsed.transcriptText,
      needsReview: parsed.needsReview,
      items,
    };
  }
}

async function safeReadText(response: Response) {
  try {
    return await response.text();
  } catch {
    return '';
  }
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}
