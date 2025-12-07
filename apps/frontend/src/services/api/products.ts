/**
 * Products API Service
 * Handles all product-related API calls
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

const unwrapData = <T>(payload: any): T => {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    const res = payload as ApiResponse<T>;
    if (!res.success) {
      throw new Error(res.error || res.message || 'Erro na API');
    }
    return (res.data as T) ?? ([] as unknown as T);
  }
  return payload as T;
};

const unwrapPaginatedProducts = (payload: any): ProductResponse => {
  if (payload && typeof payload === 'object' && 'success' in payload) {
    const res = payload as ApiResponse<Product[]>;
    if (!res.success) {
      throw new Error(res.error || res.message || 'Erro na API');
    }
    return {
      products: (res.data as Product[]) ?? [],
      total: res.pagination?.total ?? ((res.data as Product[])?.length ?? 0),
      page: res.pagination?.page ?? 1,
      limit: res.pagination?.limit ?? ((res.data as Product[])?.length ?? 0),
      totalPages: res.pagination?.totalPages ?? 1,
    };
  }
  return payload as ProductResponse;
};

/**
 * Fetch all products with optional filters
 */
export async function fetchProducts(
  filters?: ProductFilters
): Promise<ProductResponse> {
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

/**
 * Fetch a single product by ID
 */
export async function fetchProductById(id: string): Promise<Product> {
  return apiFetch<Product>(`/products/${id}`);
}

/**
 * Fetch products by category
 */
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

/**
 * Fetch promotional products
 */
export async function fetchPromotionalProducts(): Promise<Product[]> {
  const data = await apiFetch<ApiResponse<Product[]> | Product[]>('/products/promotional');
  return unwrapData<Product[]>(data);
}

/**
 * Fetch new products
 */
export async function fetchNewProducts(): Promise<Product[]> {
  const data = await apiFetch<ApiResponse<Product[]> | Product[]>('/products/new');
  return unwrapData<Product[]>(data);
}
