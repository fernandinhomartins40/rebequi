/**
 * Products API service.
 */

import type {
  CreateProductDTO,
  Product,
  ProductFilters,
  ProductImage,
  ProductResponse,
  UpdateProductDTO,
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

function unwrapPaginatedProducts(payload: unknown): ProductResponse {
  if (isApiResponse<Product[]>(payload)) {
    if (!payload.success) {
      throw new Error(payload.error || payload.message || 'Erro na API');
    }

    const products = (payload.data as Product[]) ?? [];

    return {
      products,
      total: payload.pagination?.total ?? products.length,
      page: payload.pagination?.page ?? 1,
      limit: payload.pagination?.limit ?? products.length,
      totalPages: payload.pagination?.totalPages ?? 1,
    };
  }

  return payload as ProductResponse;
}

function buildProductsQuery(filters?: ProductFilters) {
  const params = new URLSearchParams();

  if (filters?.category) params.append('category', filters.category);
  if (filters?.minPrice !== undefined) params.append('minPrice', filters.minPrice.toString());
  if (filters?.maxPrice !== undefined) params.append('maxPrice', filters.maxPrice.toString());
  if (filters?.search) params.append('search', filters.search);
  if (filters?.isOffer !== undefined) params.append('isOffer', filters.isOffer.toString());
  if (filters?.isNew !== undefined) params.append('isNew', filters.isNew.toString());
  if (filters?.isFeatured !== undefined) params.append('isFeatured', filters.isFeatured.toString());
  if (filters?.isActive !== undefined) params.append('isActive', filters.isActive.toString());
  if (filters?.page !== undefined) params.append('page', filters.page.toString());
  if (filters?.limit !== undefined) params.append('limit', filters.limit.toString());

  return params.toString();
}

export async function fetchProducts(filters?: ProductFilters): Promise<ProductResponse> {
  const queryString = buildProductsQuery(filters);
  const url = queryString ? `/products?${queryString}` : '/products';
  const response = await apiFetch<ApiResponse<Product[]> | ProductResponse>(url);
  return unwrapPaginatedProducts(response);
}

export async function fetchAdminProducts(filters?: ProductFilters): Promise<ProductResponse> {
  const queryString = buildProductsQuery(filters);
  const url = queryString ? `/products/admin/list?${queryString}` : '/products/admin/list';
  const response = await apiFetch<ApiResponse<Product[]> | ProductResponse>(url);
  return unwrapPaginatedProducts(response);
}

export async function fetchProductById(id: string): Promise<Product> {
  const response = await apiFetch<ApiResponse<Product> | Product>(`/products/${id}`);
  return unwrapData<Product>(response);
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

export async function fetchFeaturedProducts(): Promise<Product[]> {
  const data = await apiFetch<ApiResponse<Product[]> | Product[]>('/products/featured');
  return unwrapData<Product[]>(data);
}

export async function createProduct(payload: CreateProductDTO): Promise<Product> {
  const response = await apiFetch<ApiResponse<Product> | Product>('/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return unwrapData<Product>(response);
}

export async function updateProduct(id: string, payload: UpdateProductDTO): Promise<Product> {
  const response = await apiFetch<ApiResponse<Product> | Product>(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });

  return unwrapData<Product>(response);
}

export async function deleteProduct(id: string) {
  const response = await apiFetch<ApiResponse<{ message: string }> | { message: string }>(`/products/${id}`, {
    method: 'DELETE',
  });

  return unwrapData<{ message: string }>(response);
}

export async function uploadProductImage(params: {
  file: File;
  alt?: string;
  width: number;
  height: number;
}): Promise<ProductImage> {
  const body = new FormData();
  body.append('image', params.file);
  body.append('width', String(params.width));
  body.append('height', String(params.height));
  if (params.alt) {
    body.append('alt', params.alt);
  }

  const response = await apiFetch<ApiResponse<ProductImage> | ProductImage>('/products/images/upload', {
    method: 'POST',
    body,
  });

  return unwrapData<ProductImage>(response);
}
