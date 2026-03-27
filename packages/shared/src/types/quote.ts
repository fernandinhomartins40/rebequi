import type { Product } from './product.js';
import type { User } from './user.js';

export enum LeadStatus {
  STARTED = 'STARTED',
  QUOTE_DRAFTED = 'QUOTE_DRAFTED',
  QUOTE_SUBMITTED = 'QUOTE_SUBMITTED',
  CONTACTED = 'CONTACTED',
  ARCHIVED = 'ARCHIVED',
}

export enum QuoteStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  IN_REVIEW = 'IN_REVIEW',
  RESPONDED = 'RESPONDED',
  ARCHIVED = 'ARCHIVED',
}

export interface QuoteItem {
  id: string;
  quoteRequestId: string;
  productId?: string | null;
  product?: Product | null;
  name: string;
  quantity: number;
  unit?: string | null;
  notes?: string | null;
  confidence?: number | null;
  recognitionSourceLine?: string | null;
  position: number;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface LeadCapture {
  id: string;
  userId: string;
  user?: User;
  nameSnapshot: string;
  whatsapp: string;
  source: string;
  status: LeadStatus;
  quoteCount: number;
  completedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface QuoteRequest {
  id: string;
  referenceCode: string;
  userId: string;
  user?: User;
  leadId?: string | null;
  lead?: LeadCapture | null;
  status: QuoteStatus;
  source: string;
  title?: string | null;
  customerNote?: string | null;
  ocrText?: string | null;
  ocrConfidence?: number | null;
  documentUrl: string;
  documentFilename?: string | null;
  documentMimeType?: string | null;
  documentSize?: number | null;
  documentWidth?: number | null;
  documentHeight?: number | null;
  itemCount: number;
  items: QuoteItem[];
  submittedAt?: Date | string | null;
  reviewedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface QuoteResponse {
  quotes: QuoteRequest[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface LeadResponse {
  leads: LeadCapture[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface StartLeadDTO {
  name: string;
  whatsapp: string;
}

export interface StartLeadResponse {
  lead: LeadCapture;
  user: User;
  provisionalCredentials?: {
    identifier: string;
    password: string;
  };
}

export interface QuoteItemInputDTO {
  productId?: string | null;
  name: string;
  quantity?: number;
  unit?: string | null;
  notes?: string | null;
}

export interface UpdateQuoteDraftDTO {
  title?: string | null;
  customerNote?: string | null;
  items: QuoteItemInputDTO[];
}

export interface UpdateQuoteStatusDTO {
  status: QuoteStatus;
}

export interface UpdateLeadStatusDTO {
  status: LeadStatus;
}
