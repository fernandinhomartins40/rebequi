import type {
  CreatePromotionDTO,
  Promotion,
  PromotionFilters,
  PromotionImageAsset,
  PromotionResponse,
  UpdatePromotionDTO,
} from '@rebequi/shared/types';
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

function unwrapPaginatedPromotions(payload: unknown): PromotionResponse {
  if (isApiResponse<Promotion[]>(payload)) {
    if (!payload.success) {
      throw new Error(payload.error || payload.message || 'Erro na API');
    }

    const promotions = (payload.data as Promotion[]) ?? [];

    return {
      promotions,
      total: payload.pagination?.total ?? promotions.length,
      page: payload.pagination?.page ?? 1,
      limit: payload.pagination?.limit ?? promotions.length,
      totalPages: payload.pagination?.totalPages ?? 1,
    };
  }

  return payload as PromotionResponse;
}

function buildPromotionsQuery(filters?: PromotionFilters) {
  const params = new URLSearchParams();

  if (filters?.search) params.append('search', filters.search);
  if (filters?.kind) params.append('kind', filters.kind);
  if (filters?.status) params.append('status', filters.status);
  if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
  if (filters?.page !== undefined) params.append('page', String(filters.page));
  if (filters?.limit !== undefined) params.append('limit', String(filters.limit));

  return params.toString();
}

export async function fetchPromotions(filters?: PromotionFilters): Promise<PromotionResponse> {
  const queryString = buildPromotionsQuery(filters);
  const url = queryString ? `/promotions?${queryString}` : '/promotions';
  const response = await apiFetch<ApiResponse<Promotion[]> | PromotionResponse>(url);
  return unwrapPaginatedPromotions(response);
}

export async function fetchPromotionBySlug(slug: string): Promise<Promotion> {
  const response = await apiFetch<ApiResponse<Promotion> | Promotion>(`/promotions/slug/${slug}`);
  return unwrapData<Promotion>(response);
}

export async function fetchAdminPromotions(filters?: PromotionFilters): Promise<PromotionResponse> {
  const queryString = buildPromotionsQuery(filters);
  const url = queryString ? `/promotions/admin/list?${queryString}` : '/promotions/admin/list';
  const response = await apiFetch<ApiResponse<Promotion[]> | PromotionResponse>(url);
  return unwrapPaginatedPromotions(response);
}

export async function createPromotion(payload: CreatePromotionDTO): Promise<Promotion> {
  const response = await apiFetch<ApiResponse<Promotion> | Promotion>('/promotions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return unwrapData<Promotion>(response);
}

export async function updatePromotion(id: string, payload: UpdatePromotionDTO): Promise<Promotion> {
  const response = await apiFetch<ApiResponse<Promotion> | Promotion>(`/promotions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return unwrapData<Promotion>(response);
}

export async function deletePromotion(id: string): Promise<{ message: string }> {
  const response = await apiFetch<ApiResponse<{ message: string }> | { message: string }>(`/promotions/${id}`, {
    method: 'DELETE',
  });

  return unwrapData<{ message: string }>(response);
}

export async function uploadPromotionImage(params: {
  file: File;
  alt?: string;
  width: number;
  height: number;
}): Promise<PromotionImageAsset> {
  const body = new FormData();
  body.append('image', params.file);
  body.append('width', String(params.width));
  body.append('height', String(params.height));
  if (params.alt) {
    body.append('alt', params.alt);
  }

  const response = await apiFetch<ApiResponse<PromotionImageAsset> | PromotionImageAsset>('/promotions/images/upload', {
    method: 'POST',
    body,
  });

  return unwrapData<PromotionImageAsset>(response);
}
