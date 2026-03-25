import { Category, CategoryResponse, CreateCategoryDTO, UpdateCategoryDTO } from '@rebequi/shared/types';
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

export async function fetchCategories(options?: { includeInactive?: boolean }): Promise<CategoryResponse> {
  const params = new URLSearchParams();
  if (options?.includeInactive) {
    params.set('includeInactive', 'true');
  }

  const url = params.toString() ? `/categories?${params.toString()}` : '/categories';
  const response = await apiFetch<ApiResponse<CategoryResponse> | CategoryResponse>(url);
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

export async function createCategory(payload: CreateCategoryDTO): Promise<Category> {
  const response = await apiFetch<ApiResponse<Category> | Category>('/categories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return unwrapData<Category>(response);
}

export async function updateCategory(id: string, payload: UpdateCategoryDTO): Promise<Category> {
  const response = await apiFetch<ApiResponse<Category> | Category>(`/categories/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return unwrapData<Category>(response);
}

export async function deleteCategory(id: string): Promise<{ message: string }> {
  const response = await apiFetch<ApiResponse<{ message: string }> | { message: string }>(`/categories/${id}`, {
    method: 'DELETE',
  });

  return unwrapData<{ message: string }>(response);
}
