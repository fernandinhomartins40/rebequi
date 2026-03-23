/**
 * Products API service.
 */

import { Product, ProductFilters, ProductResponse } from '@rebequi/shared/types';
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

    return (payload.data as T) ?? ([] as unknown as T);
  }

  return payload as T;
}

function unwrapPaginatedProducts(payload: unknown): ProductResponse {
  if (isApiResponse<Product[]>(payload)) {
    if (!payload.success) {
      throw new Error(payload.error || payload.message || 'Erro na API');
    }

    return {
      products: (payload.data as Product[]) ?? [],
      total: payload.pagination?.total ?? ((payload.data as Product[])?.length ?? 0),
      page: payload.pagination?.page ?? 1,
      limit: payload.pagination?.limit ?? ((payload.data as Product[])?.length ?? 0),
      totalPages: payload.pagination?.totalPages ?? 1,
    };
  }

  return payload as ProductResponse;
}

export async function fetchProducts(filters?: ProductFilters): Promise<ProductResponse> {
  const params = new URLSearchParams();

  if (filters?.category) params.append('category', filters.category);
  if (filters?.minPrice) params.append('minPrice', filters.minPrice.toString());
  if (filters?.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
  if (filters?.search) params.append('search', filters.search);
  if (filters?.isOffer !== undefined) params.append('isOffer', filters.isOffer.toString());
  if (filters?.isNew !== undefined) params.append('isNew', filters.isNew.toString());

  const queryString = params.toString();
  const url = queryString ? `/products?${queryString}` : '/products';

  const response = await apiFetch<ApiResponse<Product[]> | ProductResponse>(url);
  return unwrapPaginatedProducts(response);
}

export async function fetchProductById(id: string): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`);
}

export async function fetchProductsByCategory(
  category: string,
  page = 1,
  limit = 12
): Promise<ProductResponse> {
  const response = await apiFetch<ApiResponse<Product[]> | ProductResponse>(
    `/products/category/${category}?page=${page}&limit=${limit}`
  );
  return unwrapPaginatedProducts(response);
}

export async function fetchPromotionalProducts(): Promise<Product[]> {
  const data = await apiFetch<ApiResponse<Product[]> | Product[]>('/products/promotional');
  return unwrapData<Product[]>(data);
}

export async function fetchNewProducts(): Promise<Product[]> {
  const data = await apiFetch<ApiResponse<Product[]> | Product[]>('/products/new');
  return unwrapData<Product[]>(data);
}
