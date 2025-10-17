/**
 * Category Types
 * These types define the shape of category data from the future API
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  description?: string;
  productsCount?: number;
}

export interface CategoryResponse {
  categories: Category[];
  total: number;
}
