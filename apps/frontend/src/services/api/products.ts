/**
 * Products API Service
 * Handles all product-related API calls
 */

import { Product, ProductFilters, ProductResponse } from '@rebequi/shared/types';
import { apiFetch } from './client';

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

  return apiFetch<ProductResponse>(url);
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
  return apiFetch<ProductResponse>(
    `/products/category/${category}?page=${page}&limit=${limit}`
  );
}

/**
 * Fetch promotional products
 */
export async function fetchPromotionalProducts(): Promise<Product[]> {
  const data = await apiFetch<Product[]>('/products/promotional');
  return data;
}

/**
 * Fetch new products
 */
export async function fetchNewProducts(): Promise<Product[]> {
  const data = await apiFetch<Product[]>('/products/new');
  return data;
}
