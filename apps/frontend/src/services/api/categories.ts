/**
 * Categories API Service
 * Handles all category-related API calls
 *
 * TODO: Implement these functions when backend is ready
 */

import { Category, CategoryResponse } from '@rebequi/shared/types';
import { apiFetch } from './client';

/**
 * Fetch all categories
 */
export async function fetchCategories(): Promise<CategoryResponse> {
  // TODO: Implement API call
  // return apiFetch<CategoryResponse>('/categories');

  throw new Error('Backend not implemented yet');
}

/**
 * Fetch a single category by ID
 */
export async function fetchCategoryById(id: string): Promise<Category> {
  // TODO: Implement API call
  // return apiFetch<Category>(`/categories/${id}`);

  throw new Error('Backend not implemented yet');
}

/**
 * Fetch a category by slug
 */
export async function fetchCategoryBySlug(slug: string): Promise<Category> {
  // TODO: Implement API call
  // return apiFetch<Category>(`/categories/slug/${slug}`);

  throw new Error('Backend not implemented yet');
}
