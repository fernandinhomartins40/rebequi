/**
 * Product Types
 * These types define the shape of product data from the future API
 */

export interface Product {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  description?: string;
  isOffer?: boolean;
  isNew?: boolean;
  discount?: number;
  stock?: number;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  isOffer?: boolean;
  isNew?: boolean;
}

export interface ProductResponse {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}
