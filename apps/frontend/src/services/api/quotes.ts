import type {
  LeadResponse,
  QuoteRequest,
  QuoteResponse,
  StartLeadDTO,
  StartLeadResponse,
  UpdateLeadStatusDTO,
  UpdateQuoteDraftDTO,
  UpdateQuoteStatusDTO,
} from '@/types';
import { apiFetch } from './client';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ProcessedPublicQuoteResponse = {
  lead: StartLeadResponse['lead'];
  quote: QuoteRequest;
  user: StartLeadResponse['user'];
};

function isApiResponse<T>(payload: unknown): payload is ApiResponse<T> {
  return typeof payload === 'object' && payload !== null && 'success' in payload;
}

function unwrapData<T>(payload: unknown): T {
  if (isApiResponse<T>(payload)) {
    if (!payload.success) {
      throw new Error(payload.error || payload.message || 'Erro na API');
    }

    if (payload.data === undefined) {
      throw new Error('Resposta inesperada da API');
    }

    return payload.data;
  }

  return payload as T;
}

function unwrapPaginated<T>(payload: unknown, key: 'quotes' | 'leads'): QuoteResponse | LeadResponse {
  if (isApiResponse<T[]>(payload)) {
    if (!payload.success) {
      throw new Error(payload.error || payload.message || 'Erro na API');
    }

    const entries = (payload.data as T[]) ?? [];
    return {
      [key]: entries,
      total: payload.pagination?.total ?? entries.length,
      page: payload.pagination?.page ?? 1,
      limit: payload.pagination?.limit ?? entries.length,
      totalPages: payload.pagination?.totalPages ?? 1,
    } as QuoteResponse | LeadResponse;
  }

  return payload as QuoteResponse | LeadResponse;
}

export async function startPublicLead(payload: StartLeadDTO): Promise<StartLeadResponse> {
  const response = await apiFetch<ApiResponse<StartLeadResponse> | StartLeadResponse>('/quotes/public/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return unwrapData<StartLeadResponse>(response);
}

export async function processPublicQuoteDocument(params: {
  leadId: string;
  file: File;
  width?: number;
  height?: number;
}): Promise<ProcessedPublicQuoteResponse> {
  const body = new FormData();
  body.append('leadId', params.leadId);
  body.append('document', params.file);
  if (params.width) body.append('width', String(params.width));
  if (params.height) body.append('height', String(params.height));

  const response = await apiFetch<ApiResponse<ProcessedPublicQuoteResponse> | ProcessedPublicQuoteResponse>(
    '/quotes/public/document',
    {
      method: 'POST',
      body,
    }
  );

  return unwrapData<ProcessedPublicQuoteResponse>(response);
}

export async function createAuthenticatedQuoteDraft(params: {
  file: File;
  width?: number;
  height?: number;
}): Promise<QuoteRequest> {
  const body = new FormData();
  body.append('document', params.file);
  if (params.width) body.append('width', String(params.width));
  if (params.height) body.append('height', String(params.height));

  const response = await apiFetch<ApiResponse<QuoteRequest> | QuoteRequest>('/quotes/me/document', {
    method: 'POST',
    body,
  });

  return unwrapData<QuoteRequest>(response);
}

export async function fetchMyQuotes(): Promise<QuoteRequest[]> {
  const response = await apiFetch<ApiResponse<QuoteRequest[]> | QuoteRequest[]>('/quotes/me');
  return unwrapData<QuoteRequest[]>(response);
}

export async function updateMyQuoteDraft(id: string, payload: UpdateQuoteDraftDTO): Promise<QuoteRequest> {
  const response = await apiFetch<ApiResponse<QuoteRequest> | QuoteRequest>(`/quotes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return unwrapData<QuoteRequest>(response);
}

export async function submitMyQuote(id: string): Promise<QuoteRequest> {
  const response = await apiFetch<ApiResponse<QuoteRequest> | QuoteRequest>(`/quotes/${id}/submit`, {
    method: 'POST',
  });

  return unwrapData<QuoteRequest>(response);
}

export async function fetchAdminQuotes(filters?: { status?: string; page?: number; limit?: number }): Promise<QuoteResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));
  const url = params.toString() ? `/quotes/admin/list?${params.toString()}` : '/quotes/admin/list';
  const response = await apiFetch<ApiResponse<QuoteRequest[]> | QuoteResponse>(url);
  return unwrapPaginated<QuoteRequest>(response, 'quotes') as QuoteResponse;
}

export async function fetchCapturedLeads(filters?: { status?: string; page?: number; limit?: number }): Promise<LeadResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));
  const url = params.toString() ? `/quotes/admin/leads?${params.toString()}` : '/quotes/admin/leads';
  const response = await apiFetch<ApiResponse<StartLeadResponse['lead'][]> | LeadResponse>(url);
  return unwrapPaginated<StartLeadResponse['lead']>(response, 'leads') as LeadResponse;
}

export async function updateAdminQuoteStatus(id: string, payload: UpdateQuoteStatusDTO): Promise<QuoteRequest> {
  const response = await apiFetch<ApiResponse<QuoteRequest> | QuoteRequest>(`/quotes/admin/${id}/status`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return unwrapData<QuoteRequest>(response);
}

export async function updateCapturedLeadStatus(id: string, payload: UpdateLeadStatusDTO) {
  const response = await apiFetch<ApiResponse<StartLeadResponse['lead']> | StartLeadResponse['lead']>(
    `/quotes/admin/leads/${id}/status`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );

  return unwrapData<StartLeadResponse['lead']>(response);
}
