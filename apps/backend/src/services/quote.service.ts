import type { LeadStatus, QuoteStatus } from '@prisma/client';
import type {
  LeadFiltersInput,
  QuoteFiltersInput,
  StartLeadInput,
  UpdateLeadStatusInput,
  UpdateQuoteDraftInput,
  UpdateQuoteStatusInput,
} from '@rebequi/shared/schemas';
import { normalizeWhatsapp } from '@rebequi/shared/utils';
import { AuthService } from './auth.service.js';
import { QuoteDocumentIntelligenceService } from './quote-document-intelligence.service.js';
import { QuoteRepository } from '../repositories/quote.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { storeQuoteDocumentImage } from './product-image-storage.service.js';
import { ForbiddenError, NotFoundError, ValidationError } from '../utils/errors.util.js';

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

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(' ')
    .filter((token) => token.length >= 2);
}

function buildDraftTitle(items: PreparedQuoteItem[], customerNote?: string | null) {
  const firstItem = items[0]?.name?.trim();

  if (firstItem) {
    if (items.length === 1) {
      return firstItem;
    }

    return `${firstItem} + ${items.length - 1} item(ns)`;
  }

  if (customerNote?.trim()) {
    return 'Solicitacao de orcamento';
  }

  return 'Novo orcamento';
}

function mergeCustomerNote(customerNote?: string | null, needsReview?: string[]) {
  const parts = [customerNote?.trim()].filter(Boolean) as string[];

  if (needsReview && needsReview.length > 0) {
    parts.push(`Pontos para revisar:\n${needsReview.map((item) => `- ${item}`).join('\n')}`);
  }

  return parts.length > 0 ? parts.join('\n\n') : null;
}

export class QuoteService {
  private quoteRepository: QuoteRepository;
  private productRepository: ProductRepository;
  private authService: AuthService;
  private documentIntelligenceService: QuoteDocumentIntelligenceService;

  constructor() {
    this.quoteRepository = new QuoteRepository();
    this.productRepository = new ProductRepository();
    this.authService = new AuthService();
    this.documentIntelligenceService = new QuoteDocumentIntelligenceService();
  }

  async startPublicLead(data: StartLeadInput) {
    const ensured = await this.authService.ensureCustomerForLead({
      name: data.name,
      whatsapp: data.whatsapp,
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

    return {
      lead: this.formatLead(lead),
      user: this.formatUser(ensured.user),
      provisionalCredentials: ensured.provisionalCredentials,
    };
  }

  async processPublicDocument(params: {
    leadId: string;
    file?: Express.Multer.File;
    width?: number;
    height?: number;
  }) {
    const lead = await this.quoteRepository.findLeadById(params.leadId);
    if (!lead) {
      throw new NotFoundError('Lead nao encontrado');
    }

    const storedDocument = await this.persistDocument({
      file: params.file,
      alt: `Documento do orcamento - ${lead.nameSnapshot}`,
      width: params.width,
      height: params.height,
    });

    const extracted = await this.documentIntelligenceService.extractDocument(params.file!.buffer);
    const normalizedDraft = await this.normalizeExtractedDraft(extracted);

    const quote = await this.quoteRepository.createQuote({
      referenceCode: this.generateReferenceCode(),
      source: 'public_camera',
      status: 'DRAFT',
      title: normalizedDraft.title,
      ocrText: normalizedDraft.transcriptText ?? undefined,
      ocrConfidence: null,
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
      customerNote: normalizedDraft.customerNote ?? undefined,
      items: {
        create: normalizedDraft.items.map((item) => ({
          productId: item.productId ?? undefined,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit ?? undefined,
          notes: item.notes ?? undefined,
          confidence: item.confidence ?? undefined,
          recognitionSourceLine: item.recognitionSourceLine ?? undefined,
          position: item.position,
        })),
      },
    });

    const updatedLead = await this.quoteRepository.updateLead(lead.id, {
      status: 'QUOTE_DRAFTED',
    });

    const session = await this.authService.createSessionForUser(lead.userId);

    return {
      lead: this.formatLead(updatedLead),
      quote: this.formatQuote(quote),
      user: session.user,
      token: session.token,
    };
  }

  async createDraftFromAuthenticatedUser(params: {
    userId: string;
    file?: Express.Multer.File;
    width?: number;
    height?: number;
  }) {
    const storedDocument = await this.persistDocument({
      file: params.file,
      alt: 'Documento do orcamento',
      width: params.width,
      height: params.height,
    });

    const extracted = await this.documentIntelligenceService.extractDocument(params.file!.buffer);
    const normalizedDraft = await this.normalizeExtractedDraft(extracted);

    const quote = await this.quoteRepository.createQuote({
      referenceCode: this.generateReferenceCode(),
      source: 'customer_dashboard',
      status: 'DRAFT',
      title: normalizedDraft.title,
      ocrText: normalizedDraft.transcriptText ?? undefined,
      ocrConfidence: null,
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
      customerNote: normalizedDraft.customerNote ?? undefined,
      items: {
        create: normalizedDraft.items.map((item) => ({
          productId: item.productId ?? undefined,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit ?? undefined,
          notes: item.notes ?? undefined,
          confidence: item.confidence ?? undefined,
          recognitionSourceLine: item.recognitionSourceLine ?? undefined,
          position: item.position,
        })),
      },
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
      throw new ValidationError('Somente orcamentos em rascunho podem ser editados');
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
      throw new NotFoundError('Orcamento nao encontrado');
    }

    return this.formatQuote(updatedQuote);
  }

  async submitCustomerQuote(userId: string, quoteId: string) {
    const quote = await this.ensureCustomerQuoteAccess(userId, quoteId);

    if (quote.items.length === 0) {
      throw new ValidationError('Adicione pelo menos um item antes de enviar o orcamento');
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

    return this.formatQuote(updatedQuote);
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
      throw new NotFoundError('Orcamento nao encontrado');
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
      throw new NotFoundError('Orcamento nao encontrado');
    }

    if (quote.userId !== userId) {
      throw new ForbiddenError('Voce nao tem acesso a este orcamento');
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

    return storeQuoteDocumentImage({
      file: params.file,
      alt: params.alt,
      width: params.width,
      height: params.height,
    });
  }

  private async normalizeExtractedDraft(
    extracted: Awaited<ReturnType<QuoteDocumentIntelligenceService['extractDocument']>>
  ) {
    const customerNote = mergeCustomerNote(extracted.customerNote, extracted.needsReview);
    const normalizedItems = await this.normalizeManualItems(
      extracted.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        notes: item.notes,
      }))
    );

    return {
      title: extracted.title?.trim() || buildDraftTitle(normalizedItems, customerNote),
      customerNote,
      transcriptText: extracted.transcriptText?.trim() || null,
      items: normalizedItems,
    };
  }

  private findBestProductMatch(line: string, catalog: CatalogProduct[]) {
    const normalizedLine = normalizeText(line);
    const lineTokens = tokenize(line);

    if (normalizedLine.length < 4) {
      return null;
    }

    let bestMatch: { product: CatalogProduct; score: number } | null = null;

    for (const product of catalog) {
      const normalizedProductName = normalizeText(product.name);
      const normalizedSku = normalizeText(product.sku || '');
      const productTokens = tokenize(product.name);
      const categoryTokens = tokenize(product.category?.name || '');

      let score = 0;

      if (normalizedSku && normalizedLine.includes(normalizedSku)) {
        score = 1;
      } else if (normalizedLine.includes(normalizedProductName)) {
        score = 0.96;
      } else {
        const matchedNameTokens = productTokens.filter((token) => lineTokens.includes(token)).length;
        const matchedCategoryTokens = categoryTokens.filter((token) => lineTokens.includes(token)).length;
        const nameScore = matchedNameTokens / Math.max(productTokens.length, 1);
        const categoryScore = matchedCategoryTokens > 0 ? 0.08 : 0;
        score = nameScore + categoryScore;
      }

      if (score < 0.45) {
        continue;
      }

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = { product, score };
      }
    }

    return bestMatch;
  }

  private async normalizeManualItems(items: UpdateQuoteDraftInput['items']) {
    const catalog = await this.productRepository.findCatalogForMatching();

    return items
      .map((item, index) => {
        const explicitProduct = item.productId ? catalog.find((product) => product.id === item.productId) : null;
        const bestMatch = explicitProduct ? null : this.findBestProductMatch(item.name, catalog);

        return {
          productId: explicitProduct?.id ?? bestMatch?.product.id ?? null,
          name: item.name.trim(),
          quantity:
            typeof item.quantity === 'number' && Number.isFinite(item.quantity) && item.quantity > 0 ? item.quantity : 1,
          unit: item.unit?.trim() || null,
          notes: item.notes?.trim() || null,
          confidence: bestMatch ? Number(bestMatch.score.toFixed(2)) : null,
          recognitionSourceLine: item.name.trim(),
          position: index,
        };
      })
      .filter((item) => item.name.length > 0);
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
      user: this.formatUser(quote.user),
      leadId: quote.leadId,
      lead: quote.lead ? this.formatLead(quote.lead) : undefined,
      status: quote.status,
      source: quote.source,
      title: quote.title,
      customerNote: quote.customerNote,
      ocrText: quote.ocrText,
      ocrConfidence: quote.ocrConfidence,
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
