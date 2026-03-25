/**
 * Category Types
 * These types define the shape of category data from the API
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
  image?: string;
  description?: string;
  productsCount?: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
}

export interface CategoryResponse {
  categories: Category[];
  total: number;
}

// Create/Update DTOs
export interface CreateCategoryDTO {
  name: string;
  slug?: string;
  icon?: string;
  image?: string;
  description?: string;
  isActive?: boolean;
}

export interface UpdateCategoryDTO {
  name?: string;
  slug?: string;
  icon?: string;
  image?: string;
  description?: string;
  isActive?: boolean;
}
