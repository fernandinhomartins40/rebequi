/**
 * Centralized Types for Frontend
 * Re-export shared types and define local component types
 */

// Re-export from shared package
export type {
  Product,
  ProductImage,
  ProductFilters,
  ProductResponse,
  CreateProductDTO,
  UpdateProductDTO,
  Category,
  CategoryResponse,
  CreateCategoryDTO,
  UpdateCategoryDTO,
  User,
  UserRole,
  LoginDTO,
  RegisterDTO,
  AuthResponse,
} from '@rebequi/shared/types';

// Local component types
export interface SlideData {
  image: string;
  title: string;
  subtitle: string;
  cta: string;
}

export interface CategoryItemData {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

export interface NavigationItem {
  name: string;
  href: string;
}

// API Error types
export interface APIError extends Error {
  statusCode?: number;
  code?: string;
}
