/**
 * Categories API Service
 * Handles all category-related API calls
 */

import { Category, CategoryResponse } from '@rebequi/shared/types';
import { apiFetch } from './client';

/**
 * Fetch all categories
 */
export async function fetchCategories(): Promise<CategoryResponse> {
  return apiFetch<CategoryResponse>('/categories');
}

/**
 * Fetch a single category by ID
 */
export async function fetchCategoryById(id: string): Promise<Category> {
  return apiFetch<Category>(`/categories/${id}`);
}

/**
 * Fetch a category by slug
 */
export async function fetchCategoryBySlug(slug: string): Promise<Category> {
  return apiFetch<Category>(`/categories/slug/${slug}`);
}
