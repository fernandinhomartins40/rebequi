/**
 * Products API Service
 * Handles all product-related API calls
 *
 * TODO: Implement these functions when backend is ready
 */

import { Product, ProductFilters, ProductResponse } from '@rebequi/shared/types';
import { apiFetch } from './client';

/**
 * Fetch all products with optional filters
 */
export async function fetchProducts(
  filters?: ProductFilters
): Promise<ProductResponse> {
  // TODO: Implement API call
  // const queryParams = new URLSearchParams(filters as any).toString();
  // return apiFetch<ProductResponse>(`/products?${queryParams}`);

  throw new Error('Backend not implemented yet');
}

/**
 * Fetch a single product by ID
 */
export async function fetchProductById(id: string): Promise<Product> {
  // TODO: Implement API call
  // return apiFetch<Product>(`/products/${id}`);

  throw new Error('Backend not implemented yet');
}

/**
 * Fetch products by category
 */
export async function fetchProductsByCategory(
  category: string,
  page = 1,
  limit = 12
): Promise<ProductResponse> {
  // TODO: Implement API call
  // return apiFetch<ProductResponse>(`/products/category/${category}?page=${page}&limit=${limit}`);

  throw new Error('Backend not implemented yet');
}

/**
 * Fetch promotional products
 */
export async function fetchPromotionalProducts(): Promise<Product[]> {
  // TODO: Implement API call
  // const response = await apiFetch<ProductResponse>('/products?isOffer=true');
  // return response.products;

  throw new Error('Backend not implemented yet');
}

/**
 * Fetch new products
 */
export async function fetchNewProducts(): Promise<Product[]> {
  // TODO: Implement API call
  // const response = await apiFetch<ProductResponse>('/products?isNew=true');
  // return response.products;

  throw new Error('Backend not implemented yet');
}
