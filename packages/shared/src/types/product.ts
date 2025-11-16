/**
 * Product Types
 * These types define the shape of product data from the API
 */

export interface ProductImage {
  id: string;
  url: string;
  alt?: string;
  order: number;
  isPrimary: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  price: number;
  originalPrice?: number;
  description?: string;
  shortDesc?: string;
  isOffer: boolean;
  isNew: boolean;
  isFeatured: boolean;
  discount?: number;
  stock: number;
  minStock: number;
  weight?: number;
  dimensions?: string;
  categoryId: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    image?: string;
  };
  images?: ProductImage[];
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  isOffer?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface ProductResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

// Create/Update DTOs
export interface CreateProductDTO {
  name: string;
  slug?: string;
  sku?: string;
  price: number;
  originalPrice?: number;
  description?: string;
  shortDesc?: string;
  isOffer?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  discount?: number;
  stock: number;
  minStock?: number;
  weight?: number;
  dimensions?: string;
  categoryId: string;
  images?: { url: string; alt?: string; order?: number; isPrimary?: boolean }[];
}

export interface UpdateProductDTO {
  name?: string;
  slug?: string;
  sku?: string;
  price?: number;
  originalPrice?: number;
  description?: string;
  shortDesc?: string;
  isOffer?: boolean;
  isNew?: boolean;
  isFeatured?: boolean;
  discount?: number;
  stock?: number;
  minStock?: number;
  weight?: number;
  dimensions?: string;
  categoryId?: string;
  isActive?: boolean;
  images?: { url: string; alt?: string; order?: number; isPrimary?: boolean }[];
}
