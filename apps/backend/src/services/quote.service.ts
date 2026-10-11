import { randomBytes } from 'node:crypto';
import sharp from 'sharp';
import type { LeadStatus, QuoteStatus } from '@prisma/client';
import type {
  LeadFiltersInput,
  CreateManualQuoteDraftInput,
  QuoteFiltersInput,
  StartLeadInput,
  SubmitAnonymousQuoteInput,
  UpdateAnonymousQuoteDraftInput,
  UpdateLeadStatusInput,
  UpdateQuoteDraftInput,
  UpdateQuoteStatusInput,
} from '@rebequi/shared/schemas';
import { normalizeWhatsapp } from '@rebequi/shared/utils';
import { AuthService } from './auth.service.js';
import { CustomerService } from './customer.service.js';
import { QuoteOcrService, type RecognizedQuoteLine } from './quote-ocr.service.js';
import {
  applyOcrCorrections,
  buildTrigrams,
  canonicalUnit,
  normalizeDomainText,
  domainTokenize,
  blendedSimilarityPrepared,
  tokenizeNormalized,
  type RecognitionEngine,
  UNIT_ALIASES,
} from './quote-text-normalizer.js';
import { QuoteRepository } from '../repositories/quote.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { storeQuoteDocumentImage } from './product-image-storage.service.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.util.js';
import { logger } from '../utils/logger.util.js';

type CatalogProduct = Awaited<ReturnType<ProductRepository['findCatalogForMatching']>>[number];
type PersistedQuote = NonNullable<Awaited<ReturnType<QuoteRepository['findQuoteById']>>>;
type PersistedLead = NonNullable<Awaited<ReturnType<QuoteRepository['findLeadById']>>>;

type PreparedQuoteItem = {
  productId?: string | null;
  name: string;
  quantity: number;
  unit?: string | null;
  notes?: string | null;
  confidence?: number | null;
  recognitionSourceLine?: string | null;
  position: number;
};

/**
 * A catalogue product with every derived form precomputed.
 *
 * Matching used to renormalise each product name inside the per-line loop, so
 * a 20-line quote against 2000 products ran the full Unicode + regex pipeline
 * 40k times. The catalogue is immutable while a quote is processed, so this is
 * built once and reused.
 */
type IndexedProduct = {
  product: CatalogProduct;
  normalizedName: string;
  domainName: string;
  tokens: string[];
  tokenSet: Set<string>;
  trigrams: Set<string>;
  normalizedSku: string;
  categoryTokens: string[];
};

type CatalogIndex = {
  products: IndexedProduct[];
  /** token → products containing it, to avoid scanning the whole catalogue. */
  byToken: Map<string, IndexedProduct[]>;
  byId: Map<string, IndexedProduct>;
  /** Customer-taught vocabulary: normalised text → productId. */
  aliases: Map<string, string>;
};

/** Confidence assigned per match origin, on a single 0..1 scale. */
const CONFIDENCE = {
  exactSku: 1.0,
  modelResolved: 0.95,
  nameContained: 0.9,
  learnedAlias: 0.88,
  linePrefix: 0.85,
  unmatched: 0.3,
} as const;

/** Below this the item is shown to the customer as "please confirm". */
export const REVIEW_THRESHOLD = 0.75;
const MATCH_THRESHOLD = 0.42;
/** How many times a customer correction must repeat before it is trusted. */
const ALIAS_APPROVAL_OCCURRENCES = 3;
/** Anonymous drafts are disposable: unclaimed ones are cleaned up. */
const ANONYMOUS_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
/** A job untouched for this long lost its process and will never finish. */
const STALE_OCR_JOB_MS = 10 * 60 * 1000;

// All unit aliases for regex pattern
const ALL_UNIT_PATTERN = Object.keys(UNIT_ALIASES).map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
const QTY_BEGINNING_RE = new RegExp(`^\\s*(\\d+(?:[.,]\\d+)?)\\s*(${ALL_UNIT_PATTERN})?(?=\\s|$)`, 'i');
const QTY_SUFFIX_RE    = new RegExp(`(?:^|\\s)(\\d+(?:[.,]\\d+)?)\\s*(${ALL_UNIT_PATTERN})\\s*$`, 'i');
// Inline size specs like "18L", "50kg", "20x20" embedded in a name — NOT a leading quantity
const INLINE_SIZE_RE = /\b\d+(?:[.,]\d+)?\s*(?:l|lt|litros?|kg|m2|m²|ml|cm|mm|x\d+)\b/i;

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractQuantity(line: string, engine: RecognitionEngine = 'manual'): { quantity: number; unit: string | null } {
  const corrected = applyOcrCorrections(line, engine);
  const normalized = corrected.replace(',', '.');

  // Only treat leading number as quantity if it is NOT part of a product size spec
  const beginning = normalized.match(QTY_BEGINNING_RE);
  if (beginning && beginning[1]) {
    const qty = Number(beginning[1]);
    // Sanity: reject implausibly large quantities (likely a product code or size)
    if (qty > 0 && qty <= 9999) {
      // Check if this number is followed by a size spec (e.g. "18L tinta") → not a quantity
      const rest = normalized.slice(beginning[0].length).trimStart();
      const appearsToBeSize = /^\d/.test(rest) === false && INLINE_SIZE_RE.test(beginning[0]);
      if (!appearsToBeSize) {
        return { quantity: qty, unit: canonicalUnit(beginning[2] ?? null) };
      }
    }
  }

  const suffix = normalized.match(QTY_SUFFIX_RE);
  if (suffix && suffix[1]) {
    const qty = Number(suffix[1]);
    if (qty > 0 && qty <= 9999) {
      return { quantity: qty, unit: canonicalUnit(suffix[2] ?? null) };
    }
  }

  return { quantity: 1, unit: null };
}

function cleanLineForItem(line: string, engine: RecognitionEngine = 'manual'): string {
  const corrected = applyOcrCorrections(line, engine);
  return corrected
    .replace(QTY_BEGINNING_RE, '')
    .replace(QTY_SUFFIX_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isRelevantFreeformLine(line: string) {
  const normalized = normalizeText(line);

  if (normalized.length < 4) {
    return false;
  }

  if (/^\d+$/.test(normalized)) {
    return false;
  }

  return /[a-z]/.test(normalized);
}

function looksLikeMetadataLine(line: string) {
  const normalized = normalizeText(line);

  if (!normalized) {
    return true;
  }

  if (
    /^(cliente|nome|responsavel|responsavel|whatsapp|telefone|celular|contato|email|e mail|endereco|endereco|bairro|cidade|cep|cpf|cnpj|obs|observacao|observacoes|nota|anotacao|entrega|retirada|prazo|urgente|favor|preciso|solicitacao|orcamento)\b/i.test(normalized)
  ) {
    return true;
  }

  if (/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i.test(line)) {
    return true;
  }

  if (/\b\d{2}\s?\d{4,5}[-\s]?\d{4}\b/.test(normalized)) {
    return true;
  }

  if (/\b(rua|avenida|av\.|travessa|bairro|cidade|cep|numero|quadra|lote|apto|bloco)\b/i.test(normalized)) {
    return true;
  }

  if (/^(ola|bom dia|boa tarde|boa noite|segue|anexo|por favor|faco|preciso|solicito)\b/i.test(normalized)) {
    return true;
  }

  return false;
}

type ParsedRecognitionResult = {
  items: PreparedQuoteItem[];
  customerNote: string | null;
};

type OcrJobParams = {
  quoteId: string;
  imageBuffer: Buffer;
};

function buildDraftTitle(items: PreparedQuoteItem[], customerNote?: string | null) {
  const firstItem = items[0]?.name?.trim();

  if (firstItem) {
    if (items.length === 1) {
      return firstItem;
    }

    return `${firstItem} + ${items.length - 1} item(ns)`;
  }

  if (customerNote?.trim()) {
    return 'Solicitação de orçamento';
  }

  return 'Novo orçamento';
}

export class QuoteService {
  private quoteRepository: QuoteRepository;
  private productRepository: ProductRepository;
  private authService: AuthService;
  private ocrService: QuoteOcrService;
  private customerService: CustomerService;

  constructor() {
    this.quoteRepository = new QuoteRepository();
    this.productRepository = new ProductRepository();
    this.authService = new AuthService();
    this.ocrService = new QuoteOcrService();
    this.customerService = new CustomerService();
  }

  async startPublicLead(data: StartLeadInput, authenticatedUserId?: string) {
    const ensured = await this.authService.ensureCustomerForLead({
      name: data.name,
      whatsapp: data.whatsapp,
      authenticatedUserId,
    });

    const lead = await this.quoteRepository.createLead({
      nameSnapshot: data.name,
      whatsapp: normalizeWhatsapp(data.whatsapp),
      source: 'public_quote',
      status: 'STARTED',
      user: {
        connect: { id: ensured.user.id },
      },
    });

    const session = await this.authService.createSessionForUser(ensured.user.id);
    return {
      lead: this.formatLead(lead),
      user: this.formatUser(ensured.user),
      provisionalCredentials: ensured.provisionalCredentials,
      token: session.token,
    };
  }

  async processPublicDocument(params: {
    leadId: string;
    userId: string;
    file?: Express.Multer.File;
    width?: number;
    height?: number;
  }) {
    const lead = await this.quoteRepository.findLeadById(params.leadId);
    if (!lead || lead.userId !== params.userId) {
      throw new NotFoundError('Lead nao encontrado');
    }

    const storedDocument = await this.persistDocument({
      file: params.file,
      alt: `Documento do orçamento - ${lead.nameSnapshot}`,
      width: params.width,
      height: params.height,
    });

    const quote = await this.quoteRepository.createQuote({
      referenceCode: this.generateReferenceCode(),
      source: 'public_camera',
      status: 'DRAFT',
      title: 'Rascunho em processamento',
      ocrStatus: 'PENDING',
      documentUrl: storedDocument.url,
      documentStorageKey: storedDocument.storageKey,
      documentFilename: storedDocument.filename,
      documentMimeType: storedDocument.mimeType,
      documentSize: storedDocument.size,
      documentWidth: storedDocument.width,
      documentHeight: storedDocument.height,
      user: {
        connect: { id: lead.userId },
      },
      lead: {
        connect: { id: lead.id },
      },
    });

    const updatedLead = await this.quoteRepository.updateLead(lead.id, {
      status: 'QUOTE_DRAFTED',
    });

    const session = await this.authService.createSessionForUser(lead.userId);
    this.scheduleOcrJob({
      quoteId: quote.id,
      imageBuffer: params.file!.buffer,
    });

    return {
      lead: this.formatLead(updatedLead),
      quote: this.formatQuote(quote),
      user: session.user,
      token: session.token,
    };
  }

  /** Session-bound draft; the legacy path still returns a token for autosave. */
  async createAnonymousDraft(params: {
    userId: string;
    file?: Express.Multer.File;
    width?: number;
    height?: number;
  }) {
    const storedDocument = await this.persistDocument({
      file: params.file,
      alt: 'Documento do orçamento',
      width: params.width,
      height: params.height,
    });

    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + ANONYMOUS_DRAFT_TTL_MS);

    const quote = await this.quoteRepository.createQuote({
      referenceCode: this.generateReferenceCode(),
      source: 'public_camera',
      status: 'DRAFT',
      title: 'Rascunho em processamento',
      ocrStatus: 'PENDING',
      anonymousToken: token,
      anonymousExpiresAt: expiresAt,
      user: { connect: { id: params.userId } },
      documentUrl: storedDocument.url,
      documentStorageKey: storedDocument.storageKey,
      documentFilename: storedDocument.filename,
      documentMimeType: storedDocument.mimeType,
      documentSize: storedDocument.size,
      documentWidth: storedDocument.width,
      documentHeight: storedDocument.height,
    });

    this.scheduleOcrJob({
      quoteId: quote.id,
      imageBuffer: params.file!.buffer,
    });

    return {
      quote: this.formatQuote(quote),
      token,
      expiresAt,
    };
  }

  async createManualDraft(data: CreateManualQuoteDraftInput, userId: string) {
    const lines = data.text.split(/\r?\n/).map((text) => text.trim()).filter(Boolean);
    if (lines.length > 100) throw new ValidationError('Use até 100 linhas por lista.');
    const parsed = await this.parseItemsFromRecognition(
      lines.map((text) => ({ text, confidence: 1, source: 'manual' as const })),
      'manual'
    );
    if (!parsed.items.length) throw new ValidationError('Adicione pelo menos um produto à lista.');
    if (data.token) {
      const existing = await this.requireAnonymousDraft(data.token, userId);
      const quote = await this.quoteRepository.replaceQuoteItems(existing.id, parsed.items.map((item) => ({
        ...item, quoteRequestId: existing.id,
      })), { anonymousToken: data.token, update: {
        ocrStatus: 'SKIPPED', ocrError: null,
        title: buildDraftTitle(parsed.items, parsed.customerNote),
        customerNote: parsed.customerNote ?? existing.customerNote,
      } });
      if (!quote) throw new NotFoundError('Orçamento não encontrado');
      return { quote: this.formatQuote(quote), token: data.token, expiresAt: existing.anonymousExpiresAt };
    }
    const token = randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + ANONYMOUS_DRAFT_TTL_MS);
    const quote = await this.quoteRepository.createQuote({
      referenceCode: this.generateReferenceCode(),
      user: { connect: { id: userId } },
      source: 'public_manual', status: 'DRAFT', ocrStatus: 'SKIPPED',
      anonymousToken: token, anonymousExpiresAt: expiresAt,
      title: buildDraftTitle(parsed.items, parsed.customerNote),
      customerNote: parsed.customerNote,
      // No document was uploaded in this flow; do not create a fake image.
      documentUrl: '',
      items: { create: parsed.items.map((item) => ({
        productId: item.productId ?? null, name: item.name,
        quantity: item.quantity, unit: item.unit ?? null,
        notes: item.notes ?? null, confidence: item.confidence ?? null,
        recognitionSourceLine: item.recognitionSourceLine ?? null, position: item.position,
      })) },
    });
    return { quote: this.formatQuote(quote), token, expiresAt };
  }

  /** Polling target for an anonymous draft while the OCR job runs. */
  async getAnonymousDraft(token: string, userId: string) {
    const quote = await this.requireAnonymousDraft(token, userId);
    return this.formatQuote(quote);
  }

  async updateAnonymousDraft(data: UpdateAnonymousQuoteDraftInput, userId: string) {
    const quote = await this.requireAnonymousDraft(data.token, userId);
    const normalizedItems = await this.normalizeManualItems(data.items);

    const updatedQuote = await this.quoteRepository.replaceQuoteItems(
      quote.id,
      normalizedItems.map((item) => ({
        quoteRequestId: quote.id,
        productId: item.productId ?? null,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit ?? null,
        notes: item.notes ?? null,
        confidence: item.confidence ?? null,
        recognitionSourceLine: item.recognitionSourceLine ?? null,
        position: item.position,
      })),
      { anonymousToken: data.token }
    );

    if (!updatedQuote) {
      throw new NotFoundError('Orçamento não encontrado');
    }

    return this.formatQuote(updatedQuote);
  }

  /**
   * Final step of the photo-first flow: the customer identifies themselves and
   * the anonymous draft is attached to a real (possibly provisional) account.
   */
  async submitAnonymousDraft(data: SubmitAnonymousQuoteInput, authenticatedUserId: string) {
    const quote = await this.requireAnonymousDraft(data.token, authenticatedUserId);
    if (authenticatedUserId) {
      const customer = await this.authService.getProfile(authenticatedUserId);
      if (normalizeWhatsapp(data.whatsapp) !== normalizeWhatsapp(customer.whatsapp || customer.identifier)) {
        throw new ForbiddenError('Use o WhatsApp vinculado ao seu acesso.');
      }
      data = { ...data, name: customer.name, whatsapp: customer.whatsapp || customer.identifier };
    }

    const ensured = await this.authService.ensureCustomerForLead({
      name: data.name,
      whatsapp: data.whatsapp,
      authenticatedUserId,
    });

    const lead = await this.quoteRepository.createLead({
      nameSnapshot: data.name,
      whatsapp: normalizeWhatsapp(data.whatsapp),
      source: 'public_quote',
      status: 'QUOTE_SUBMITTED',
      completedAt: new Date(),
      user: { connect: { id: ensured.user.id } },
    });

    const normalizedItems = await this.normalizeManualItems(data.items);
    const updatedQuote = await this.quoteRepository.replaceQuoteItems(
      quote.id,
      normalizedItems.map((item) => ({
        quoteRequestId: quote.id,
        productId: item.productId ?? null,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit ?? null,
        notes: item.notes ?? null,
        confidence: item.confidence ?? null,
        recognitionSourceLine: item.recognitionSourceLine ?? null,
        position: item.position,
      })), { anonymousToken: data.token, update: {
      status: 'SUBMITTED',
      submittedAt: new Date(),
      title: buildDraftTitle(normalizedItems, quote.customerNote),
      // Claim the draft: it now belongs to an account and is no longer anonymous.
      anonymousToken: null,
      anonymousExpiresAt: null,
      user: { connect: { id: ensured.user.id } },
      lead: { connect: { id: lead.id } },
    } });

    if (!updatedQuote) throw new NotFoundError('Orçamento não encontrado');

    await this.afterQuoteSubmitted(updatedQuote, ensured.user.id);

    const session = await this.authService.createSessionForUser(ensured.user.id);

    return {
      quote: this.formatQuote(updatedQuote),
      user: session.user,
      token: session.token,
      provisionalCredentials: ensured.provisionalCredentials,
    };
  }

  private async requireAnonymousDraft(token: string, userId: string) {
    const quote = await this.quoteRepository.findQuoteByAnonymousToken(token);

    if (!quote) {
      throw new NotFoundError('Orçamento não encontrado');
    }

    if (quote.userId !== userId) throw new ForbiddenError('Este rascunho pertence a outro acesso.');

    if (quote.anonymousExpiresAt && quote.anonymousExpiresAt.getTime() < Date.now()) {
      throw new ForbiddenError('Este rascunho expirou. Tire uma nova foto da sua lista.');
    }

    if (quote.status !== 'DRAFT') {
      throw new ValidationError('Este orçamento já foi enviado');
    }

    return quote;
  }

  async createDraftFromAuthenticatedUser(params: {
    userId: string;
    file?: Express.Multer.File;
    width?: number;
    height?: number;
  }) {
    const storedDocument = await this.persistDocument({
      file: params.file,
      alt: 'Documento do orçamento',
      width: params.width,
      height: params.height,
    });

    const quote = await this.quoteRepository.createQuote({
      referenceCode: this.generateReferenceCode(),
      source: 'customer_dashboard',
      status: 'DRAFT',
      title: 'Rascunho em processamento',
      ocrStatus: 'PENDING',
      documentUrl: storedDocument.url,
      documentStorageKey: storedDocument.storageKey,
      documentFilename: storedDocument.filename,
      documentMimeType: storedDocument.mimeType,
      documentSize: storedDocument.size,
      documentWidth: storedDocument.width,
      documentHeight: storedDocument.height,
      user: {
        connect: { id: params.userId },
      },
    });

    this.scheduleOcrJob({
      quoteId: quote.id,
      imageBuffer: params.file!.buffer,
    });

    return this.formatQuote(quote);
  }

  async getCustomerQuotes(userId: string) {
    const quotes = await this.quoteRepository.findManyQuotes({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });

    return quotes.map((quote) => this.formatQuote(quote));
  }

  async updateCustomerDraft(userId: string, quoteId: string, data: UpdateQuoteDraftInput) {
    const quote = await this.ensureCustomerQuoteAccess(userId, quoteId);

    if (quote.status !== 'DRAFT') {
      throw new ValidationError('Somente orçamentos em rascunho podem ser editados');
    }

    const normalizedItems = await this.normalizeManualItems(data.items);
    await this.quoteRepository.updateQuote(quote.id, {
      title: data.title?.trim() || buildDraftTitle(normalizedItems, data.customerNote ?? quote.customerNote),
      customerNote: data.customerNote ?? null,
    });

    const updatedQuote = await this.quoteRepository.replaceQuoteItems(
      quote.id,
      normalizedItems.map((item) => ({
        quoteRequestId: quote.id,
        productId: item.productId ?? null,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit ?? null,
        notes: item.notes ?? null,
        confidence: item.confidence ?? null,
        recognitionSourceLine: item.recognitionSourceLine ?? null,
        position: item.position,
      }))
    );

    if (!updatedQuote) {
      throw new NotFoundError('Orçamento não encontrado');
    }

    return this.formatQuote(updatedQuote);
  }

  async submitCustomerQuote(userId: string, quoteId: string) {
    const quote = await this.ensureCustomerQuoteAccess(userId, quoteId);

    if (quote.items.length === 0) {
      throw new ValidationError('Adicione pelo menos um item antes de enviar o orçamento');
    }

    const updatedQuote = await this.quoteRepository.updateQuote(quote.id, {
      status: 'SUBMITTED',
      submittedAt: new Date(),
    });

    if (updatedQuote.leadId) {
      await this.quoteRepository.updateLead(updatedQuote.leadId, {
        status: 'QUOTE_SUBMITTED',
        completedAt: new Date(),
      });
    }

    await this.afterQuoteSubmitted(updatedQuote, userId);

    return this.formatQuote(updatedQuote);
  }

  /** Post-submit side effects shared by the authenticated and anonymous flows. */
  private async afterQuoteSubmitted(quote: PersistedQuote, userId: string) {
    // CRM: envio de orçamento move o cliente adiante no funil (se não travado).
    await this.customerService.maybeAdvanceStage(userId);

    // Close the telemetry loop: how much did the customer have to fix?
    const editedCount = quote.items.filter(
      (item) =>
        item.recognitionSourceLine &&
        normalizeText(item.name) !== normalizeText(item.recognitionSourceLine)
    ).length;

    try {
      await this.quoteRepository.updateLatestOcrRun(quote.id, {
        itemsEditedByCustomer: editedCount,
      });
    } catch (error) {
      logger.warn('Failed to record customer edit telemetry.', { quoteId: quote.id, error });
    }

    await this.learnFromCustomerCorrections(quote);
  }

  /**
   * Startup housekeeping: fail jobs orphaned by a restart and drop anonymous
   * drafts nobody came back for.
   */
  async runMaintenance() {
    const [stale, expired] = await Promise.all([
      this.quoteRepository.failStaleOcrJobs(new Date(Date.now() - STALE_OCR_JOB_MS)),
      this.quoteRepository.deleteExpiredAnonymousDrafts(new Date()),
    ]);

    if (stale.count > 0 || expired.count > 0) {
      logger.info('Quote maintenance completed.', {
        staleOcrJobsFailed: stale.count,
        expiredAnonymousDraftsDeleted: expired.count,
      });
    }

    return { staleOcrJobsFailed: stale.count, expiredAnonymousDraftsDeleted: expired.count };
  }

  /** OCR chain health, surfaced to the merchant before customers complain. */
  async getOcrHealth() {
    return this.ocrService.getEngineHealth();
  }

  async getOcrStats(sinceDays = 30) {
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    return this.quoteRepository.getOcrStats(since);
  }

  async getAdminQuotes(filters: QuoteFiltersInput) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where = {
      ...(filters.status ? { status: filters.status } : { status: { not: 'DRAFT' as QuoteStatus } }),
    };

    const [quotes, total] = await Promise.all([
      this.quoteRepository.findManyQuotes({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.quoteRepository.countQuotes(where),
    ]);

    return {
      quotes: quotes.map((quote) => this.formatQuote(quote)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCapturedLeads(filters: LeadFiltersInput) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;
    const defaultIncompleteStatuses: LeadStatus[] = ['STARTED', 'QUOTE_DRAFTED', 'CONTACTED'];

    const where = filters.status
      ? { status: filters.status }
      : {
          status: {
            in: defaultIncompleteStatuses,
          },
        };

    const [leads, total] = await Promise.all([
      this.quoteRepository.findManyLeads({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.quoteRepository.countLeads(where),
    ]);

    return {
      leads: leads.map((lead) => this.formatLead(lead)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateQuoteStatus(quoteId: string, data: UpdateQuoteStatusInput) {
    const quote = await this.quoteRepository.findQuoteById(quoteId);
    if (!quote) {
      throw new NotFoundError('Orçamento não encontrado');
    }

    const updatedQuote = await this.quoteRepository.updateQuote(quoteId, {
      status: data.status,
      reviewedAt: data.status === 'IN_REVIEW' || data.status === 'RESPONDED' ? new Date() : quote.reviewedAt,
    });

    return this.formatQuote(updatedQuote);
  }

  async updateLeadStatus(leadId: string, data: UpdateLeadStatusInput) {
    const lead = await this.quoteRepository.findLeadById(leadId);
    if (!lead) {
      throw new NotFoundError('Lead nao encontrado');
    }

    const updatedLead = await this.quoteRepository.updateLead(leadId, {
      status: data.status,
      completedAt: data.status === 'ARCHIVED' ? new Date() : lead.completedAt,
    });

    return this.formatLead(updatedLead);
  }

  private async ensureCustomerQuoteAccess(userId: string, quoteId: string) {
    const quote = await this.quoteRepository.findQuoteById(quoteId);
    if (!quote) {
      throw new NotFoundError('Orçamento não encontrado');
    }

    if (quote.userId !== userId) {
      throw new ForbiddenError('Você não tem acesso a este orçamento');
    }

    return quote;
  }

  private async persistDocument(params: {
    file?: Express.Multer.File;
    alt: string;
    width?: number;
    height?: number;
  }) {
    if (!params.file) {
      throw new ValidationError('Envie uma imagem do documento para continuar');
    }

    // Validate actual bytes before storing or scheduling a paid recognition request.
    try {
      const metadata = await sharp(params.file.buffer, { limitInputPixels: 40000000 }).metadata();
      if (!metadata.width || !metadata.height || !['jpeg', 'png', 'webp', 'gif', 'heif', 'avif'].includes(metadata.format ?? '')) throw new Error('Unsupported image');
      return storeQuoteDocumentImage({ file: params.file, alt: params.alt, width: metadata.width, height: metadata.height });
    } catch { throw new ValidationError('Não foi possível abrir a foto. Envie uma imagem JPG, PNG ou WebP válida.'); }
  }

  private scheduleOcrJob(params: OcrJobParams) {
    setTimeout(() => {
      void this.runOcrJob(params);
    }, 0);
  }

  private async runOcrJob(params: OcrJobParams) {
    const startedAt = Date.now();

    try {
      const started = await this.quoteRepository.startOcr(params.quoteId);
      if (!started.count) return;

      // Build the index once for local matching; no catalog is sent to the provider.
      const index = await this.buildCatalogIndex();
      const recognized = await this.ocrService.recognizeDocument(params.imageBuffer, [], async () => {
        const current = await this.quoteRepository.findQuoteById(params.quoteId);
        return current?.ocrStatus === 'PROCESSING';
      });
      const engine: RecognitionEngine = recognized.engine ?? 'manual';

      // Cloud engines and manual input share non-destructive text normalization.
      const matchingIndex = index;

      const parsedRecognition = await this.parseItemsFromRecognition(
        recognized.lines,
        engine,
        matchingIndex
      );
      const currentQuote = await this.quoteRepository.findQuoteById(params.quoteId);

      if (!currentQuote) {
        return;
      }

      await this.recordOcrRun(params.quoteId, {
        engine: recognized.engine ?? engine,
        modelId: recognized.modelId ?? null,
        success: true,
        durationMs: recognized.usage?.durationMs ?? Date.now() - startedAt,
        promptTokens: recognized.usage?.promptTokens ?? null,
        completionTokens: recognized.usage?.completionTokens ?? null,
        costUsd: recognized.usage?.costUsd ?? null,
        itemsDetected: parsedRecognition.items.length,
        itemsMatched: parsedRecognition.items.filter((item) => item.productId).length,
      });

      const baseUpdate = {
        ocrStatus: 'COMPLETED' as const,
        ocrText: recognized.text || null,
        ocrConfidence: recognized.confidence || null,
        ocrError: null,
        ocrEngine: recognized.engine ?? engine,
        ocrModelId: recognized.modelId ?? null,
      };

      await this.quoteRepository.finishOcr(
        params.quoteId, baseUpdate, parsedRecognition.items.map((item) => ({
          quoteRequestId: params.quoteId,
          productId: item.productId ?? null,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit ?? null,
          notes: item.notes ?? null,
          confidence: item.confidence ?? null,
          recognitionSourceLine: item.recognitionSourceLine ?? null,
          position: item.position,
        })),
        buildDraftTitle(parsedRecognition.items, parsedRecognition.customerNote),
        parsedRecognition.customerNote ?? currentQuote.customerNote
      );
    } catch (error) {
      logger.error('Background OCR job failed.', {
        quoteId: params.quoteId,
        error,
      });

      await this.recordOcrRun(params.quoteId, {
        engine: 'unknown',
        modelId: null,
        success: false,
        durationMs: Date.now() - startedAt,
        promptTokens: null,
        completionTokens: null,
        costUsd: null,
        itemsDetected: 0,
        itemsMatched: 0,
        errorMessage: error instanceof Error ? error.message : 'Falha ao processar OCR',
      });

      await this.quoteRepository.failOcr(params.quoteId, error instanceof Error ? error.message : 'Falha ao processar OCR');
    }
  }

  /** Telemetry must never break the pipeline it observes. */
  private async recordOcrRun(
    quoteRequestId: string,
    data: {
      engine: string;
      modelId: string | null;
      success: boolean;
      durationMs: number;
      promptTokens: number | null;
      completionTokens: number | null;
      costUsd: number | null;
      itemsDetected: number;
      itemsMatched: number;
      errorMessage?: string;
    }
  ) {
    try {
      await this.quoteRepository.createOcrRun({ quoteRequestId, ...data });
    } catch (error) {
      logger.warn('Failed to persist OCR telemetry.', { quoteRequestId, error });
    }
  }

  private async parseItemsFromRecognition(
    lines: RecognizedQuoteLine[],
    engine: RecognitionEngine = 'manual',
    prebuiltIndex?: CatalogIndex
  ): Promise<ParsedRecognitionResult> {
    const index = prebuiltIndex ?? (await this.buildCatalogIndex(engine));
    const parsedItems: PreparedQuoteItem[] = [];
    const customerNoteParts: string[] = [];

    lines.forEach((line) => {
      const text = applyOcrCorrections(line.text.trim(), engine);

      const hasStructuredQuantity = typeof line.quantity === 'number' && line.quantity > 0;
      if (engine !== 'manual' && !hasStructuredQuantity && !isRelevantFreeformLine(text)) {
        return;
      }

      if (looksLikeMetadataLine(text)) {
        customerNoteParts.push(text);
        return;
      }

      const sourceLine = line.recognitionSourceLine?.trim() || text;

      // The model already separated quantity from the product name; regex
      // reparsing is only needed for engines that return a raw line.
      const quantityData = hasStructuredQuantity
        ? { quantity: line.quantity as number, unit: canonicalUnit(line.unit ?? null) }
        : extractQuantity(text, engine);

      // A product id resolved by the model was already validated against the
      // catalogue in the OCR service, so it outranks fuzzy matching.
      const modelResolved = line.productId ? index.byId.get(line.productId) : undefined;

      if (modelResolved) {
        parsedItems.push({
          productId: modelResolved.product.id,
          name: modelResolved.product.name,
          quantity: quantityData.quantity,
          unit: quantityData.unit,
          confidence: Math.min(CONFIDENCE.modelResolved, Math.max(0, line.confidence / 100)),
          recognitionSourceLine: sourceLine,
          position: parsedItems.length,
        });
        return;
      }

      const nameForMatching = hasStructuredQuantity ? text : cleanLineForItem(text, engine);
      const match = this.findBestProductMatch(nameForMatching || text, index, engine);
      const itemName = hasStructuredQuantity ? text : cleanLineForItem(text, engine);

      if (match) {
        parsedItems.push({
          productId: match.product.id,
          name: match.product.name,
          quantity: quantityData.quantity,
          unit: quantityData.unit,
          // The match score is the meaningful signal. Averaging it with the
          // engine's self-reported confidence mixed two incomparable scales.
          confidence: Number((engine === 'deepseek' || engine === 'qwen' ? Math.min(match.score, line.confidence / 100) : match.score).toFixed(2)),
          recognitionSourceLine: sourceLine,
          position: parsedItems.length,
        });
        return;
      }

      // No product match — store the cleaned line as a generic item
      const displayName = itemName
        ? itemName.charAt(0).toUpperCase() + itemName.slice(1)
        : line.text.trim();

      parsedItems.push({
        name: displayName,
        quantity: quantityData.quantity,
        unit: quantityData.unit,
        confidence: CONFIDENCE.unmatched,
        recognitionSourceLine: sourceLine,
        position: parsedItems.length,
      });
    });

    const customerNote = customerNoteParts.length > 0 ? customerNoteParts.join('\n') : null;

    if (parsedItems.length > 0) {
      return {
        items: parsedItems,
        customerNote,
      };
    }

    return {
      items: [],
      customerNote,
    };
  }

  /**
   * Builds the reusable catalogue index, including aliases learned from past
   * customer corrections.
   */
  private async buildCatalogIndex(engine: RecognitionEngine = 'manual'): Promise<CatalogIndex> {
    const [catalog, aliasRows] = await Promise.all([
      this.productRepository.findCatalogForMatching(),
      this.quoteRepository
        .findApprovedAliases()
        .catch(() => [] as Array<{ normalizedText: string; productId: string }>),
    ]);

    const products: IndexedProduct[] = catalog.map((product) => {
      const domainName = normalizeDomainText(product.name, engine);
      const tokens = tokenizeNormalized(domainName);

      return {
        product,
        normalizedName: normalizeText(product.name),
        domainName,
        tokens,
        tokenSet: new Set(tokens),
        trigrams: buildTrigrams(domainName),
        normalizedSku: normalizeText(product.sku || ''),
        categoryTokens: domainTokenize(product.category?.name || '', engine),
      };
    });

    const byToken = new Map<string, IndexedProduct[]>();
    const byId = new Map<string, IndexedProduct>();

    for (const indexed of products) {
      byId.set(indexed.product.id, indexed);
      for (const token of indexed.tokenSet) {
        const bucket = byToken.get(token);
        if (bucket) bucket.push(indexed);
        else byToken.set(token, [indexed]);
      }
    }

    return {
      products,
      byToken,
      byId,
      aliases: new Map<string, string>(
        aliasRows.map((row) => [row.normalizedText, row.productId] as const)
      ),
    };
  }

  private findBestProductMatch(
    line: string,
    index: CatalogIndex,
    engine: RecognitionEngine = 'manual'
  ) {
    const domainLine = normalizeDomainText(line, engine);
    const plainLine = normalizeText(line);
    const lineTokens = tokenizeNormalized(domainLine);

    if (domainLine.length < 3) return null;

    // Vocabulary learned from previous customers beats any fuzzy guess.
    const aliasProductId = index.aliases.get(domainLine);
    if (aliasProductId) {
      const aliased = index.byId.get(aliasProductId);
      if (aliased) {
        return { product: aliased.product, score: CONFIDENCE.learnedAlias };
      }
    }

    const lineTokenSet = new Set(lineTokens);
    const lineTrigrams = buildTrigrams(domainLine);
    const preparedLine = {
      normalized: domainLine,
      tokens: lineTokens,
      tokenSet: lineTokenSet,
      trigrams: lineTrigrams,
    };

    // Only consider products sharing at least one token with the line. Falls
    // back to a full scan for short/token-less lines so nothing is missed.
    const candidates = this.collectCandidates(index, lineTokenSet);

    let bestMatch: { product: CatalogProduct; score: number } | null = null;
    let runnerUpScore = 0;

    for (const indexed of candidates) {
      let score = 0;

      // 1. Exact SKU match — highest confidence
      if (
        indexed.normalizedSku &&
        (plainLine.includes(indexed.normalizedSku) || domainLine.includes(indexed.normalizedSku))
      ) {
        score = CONFIDENCE.exactSku;
      }
      // 2. Full product name is contained in the line
      else if (
        domainLine.includes(indexed.domainName) ||
        plainLine.includes(indexed.normalizedName)
      ) {
        score = 0.97;
      }
      // 3. Line fully contained in product name (user wrote a prefix)
      else if (indexed.domainName.includes(domainLine) && domainLine.length >= 5) {
        score = CONFIDENCE.linePrefix;
      }
      // 4. Blended fuzzy similarity
      else {
        const fuzzy = blendedSimilarityPrepared(preparedLine, {
          normalized: indexed.domainName,
          tokens: indexed.tokens,
          tokenSet: indexed.tokenSet,
          trigrams: indexed.trigrams,
        });

        const categoryBonus = indexed.categoryTokens.some((t) => lineTokenSet.has(t)) ? 0.07 : 0;

        const tokenCoverage =
          indexed.tokens.length > 0
            ? indexed.tokens.filter((t) => lineTokenSet.has(t)).length / indexed.tokens.length
            : 0;

        score = fuzzy + categoryBonus;

        // Require at least half the product tokens to be present for short product names
        if (indexed.tokens.length <= 2 && tokenCoverage < 0.5) {
          score *= 0.6;
        }
      }

      if (score < MATCH_THRESHOLD) continue;

      if (!bestMatch || score > bestMatch.score) {
        runnerUpScore = bestMatch?.score ?? 0;
        bestMatch = { product: indexed.product, score: Math.min(1, score) };
      } else { runnerUpScore = Math.max(runnerUpScore, Math.min(1, score)); }
    }

    // Keep the transcription when several catalog variants are equally plausible.
    if (bestMatch && bestMatch.score < 0.97 && bestMatch.score - runnerUpScore < 0.08) return null;
    return bestMatch;
  }

  private collectCandidates(index: CatalogIndex, lineTokenSet: Set<string>): IndexedProduct[] {
    if (lineTokenSet.size === 0) return index.products;

    const seen = new Set<string>();
    const candidates: IndexedProduct[] = [];

    for (const token of lineTokenSet) {
      const bucket = index.byToken.get(token);
      if (!bucket) continue;
      for (const indexed of bucket) {
        if (seen.has(indexed.product.id)) continue;
        seen.add(indexed.product.id);
        candidates.push(indexed);
      }
    }

    // No token overlap at all — the line may still match by SKU or substring,
    // so fall back to the full catalogue rather than returning nothing.
    return candidates.length > 0 ? candidates : index.products;
  }

  private async normalizeManualItems(items: UpdateQuoteDraftInput['items']) {
    const catalogIndex = await this.buildCatalogIndex();

    return items
      .map((item, index) => {
        const explicitProduct = item.productId ? catalogIndex.byId.get(item.productId) : undefined;
        const bestMatch = explicitProduct ? null : this.findBestProductMatch(item.name, catalogIndex);

        return {
          productId: explicitProduct?.product.id ?? bestMatch?.product.id ?? null,
          name: item.name.trim(),
          quantity:
            typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1,
          unit: item.unit?.trim() || null,
          notes: item.notes?.trim() || null,
          confidence: explicitProduct
            ? CONFIDENCE.exactSku
            : bestMatch
              ? Number(bestMatch.score.toFixed(2))
              : null,
          recognitionSourceLine: item.recognitionSourceLine?.trim() || item.name.trim(),
          position: index,
        };
      })
      .filter((item) => item.name.length > 0);
  }

  /**
   * Turns customer corrections into permanent vocabulary.
   *
   * When someone resolves a line the system read poorly into a real product,
   * that pairing is the most reliable training signal available — it came from
   * the person who wrote the list.
   */
  private async learnFromCustomerCorrections(quote: PersistedQuote) {
    const corrections = quote.items.filter(
      (item) =>
        item.productId &&
        item.recognitionSourceLine &&
        // Only learn where the system was unsure; confident matches teach nothing.
        (item.confidence === null || item.confidence < REVIEW_THRESHOLD)
    );

    for (const item of corrections) {
      const normalized = normalizeDomainText(item.recognitionSourceLine as string);
      if (normalized.length < 3) continue;

      try {
        await this.quoteRepository.recordProductAlias(
          normalized,
          item.productId as string,
          ALIAS_APPROVAL_OCCURRENCES
        );
      } catch (error) {
        logger.warn('Failed to record product alias.', { quoteId: quote.id, error });
      }
    }
  }

  private generateReferenceCode() {
    const now = new Date();
    const datePart = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, '0')}${String(now.getUTCDate()).padStart(2, '0')}`;
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `ORC-${datePart}-${randomPart}`;
  }

  private formatQuote(quote: PersistedQuote) {
    return {
      id: quote.id,
      referenceCode: quote.referenceCode,
      userId: quote.userId,
      user: quote.user ? this.formatUser(quote.user) : null,
      leadId: quote.leadId,
      lead: quote.lead ? this.formatLead(quote.lead) : undefined,
      status: quote.status,
      source: quote.source,
      title: quote.title,
      customerNote: quote.customerNote,
      ocrStatus: quote.ocrStatus,
      ocrText: quote.ocrText,
      ocrConfidence: quote.ocrConfidence,
      ocrError: quote.ocrError,
      documentUrl: quote.documentUrl,
      documentFilename: quote.documentFilename,
      documentMimeType: quote.documentMimeType,
      documentSize: quote.documentSize,
      documentWidth: quote.documentWidth,
      documentHeight: quote.documentHeight,
      itemCount: quote.items.length,
      items: quote.items.map((item) => ({
        id: item.id,
        quoteRequestId: item.quoteRequestId,
        productId: item.productId,
        product: item.product
          ? {
              ...item.product,
            }
          : undefined,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
        confidence: item.confidence,
        recognitionSourceLine: item.recognitionSourceLine,
        position: item.position,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      })),
      submittedAt: quote.submittedAt,
      reviewedAt: quote.reviewedAt,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt,
    };
  }

  private formatLead(lead: PersistedLead) {
    return {
      id: lead.id,
      userId: lead.userId,
      user: this.formatUser(lead.user),
      nameSnapshot: lead.nameSnapshot,
      whatsapp: lead.whatsapp,
      source: lead.source,
      status: lead.status,
      quoteCount: lead._count.quotes,
      completedAt: lead.completedAt,
      createdAt: lead.createdAt,
      updatedAt: lead.updatedAt,
    };
  }

  private formatUser(user: {
    id: string;
    email: string;
    name: string;
    whatsapp: string | null;
    role: string;
    isActive: boolean;
    isProvisional: boolean;
    mustChangePassword: boolean;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id,
      identifier: user.email,
      email: user.email.includes('@') ? user.email : undefined,
      name: user.name,
      whatsapp: user.whatsapp ?? (user.email.includes('@') ? undefined : user.email),
      role: user.role,
      isActive: user.isActive,
      isProvisional: user.isProvisional,
      mustChangePassword: user.mustChangePassword,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
