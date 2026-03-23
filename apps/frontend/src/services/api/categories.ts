import { Category, CategoryResponse } from '@rebequi/shared/types';
import { apiFetch } from './client';

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
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

export async function fetchCategories(): Promise<CategoryResponse> {
  const response = await apiFetch<ApiResponse<CategoryResponse> | CategoryResponse>('/categories');
  return unwrapData<CategoryResponse>(response);
}

export async function fetchCategoryById(id: string): Promise<Category> {
  const response = await apiFetch<ApiResponse<Category> | Category>(`/categories/${id}`);
  return unwrapData<Category>(response);
}

export async function fetchCategoryBySlug(slug: string): Promise<Category> {
  const response = await apiFetch<ApiResponse<Category> | Category>(`/categories/slug/${slug}`);
  return unwrapData<Category>(response);
}
