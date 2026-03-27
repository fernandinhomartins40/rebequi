/**
 * Promotion Types
 * Promotional collections displayed in public highlight sections and campaign pages
 */

import type { Product } from './product.js';

export type PromotionTheme = 'gold' | 'blue' | 'green' | 'red' | 'slate';
export type PromotionStatus = 'active' | 'scheduled' | 'expired' | 'inactive';
export type PromotionKind = 'collection' | 'single_product';

export interface PromotionImageAsset {
  url: string;
  alt?: string;
  storageKey?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
}

export interface Promotion {
  id: string;
  name: string;
  slug: string;
  kind: PromotionKind;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  description?: string;
  badgeText?: string;
  ctaLabel?: string;
  disclaimer?: string;
  themeTone: PromotionTheme;
  startsAt?: Date | string | null;
  expiresAt?: Date | string | null;
  sortOrder: number;
  isActive: boolean;
  status: PromotionStatus;
  productCount: number;
  categoryCount: number;
  categories: string[];
  image?: PromotionImageAsset;
  primaryProduct?: Product;
  products?: Product[];
  createdAt: Date | string;
  updatedAt: Date | string;
  deletedAt?: Date | string | null;
}

export interface PromotionFilters {
  search?: string;
  kind?: PromotionKind;
  status?: PromotionStatus | 'all';
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface PromotionResponse {
  promotions: Promotion[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

export interface CreatePromotionDTO {
  name: string;
  slug?: string;
  kind?: PromotionKind;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  description?: string;
  badgeText?: string;
  ctaLabel?: string;
  disclaimer?: string;
  themeTone?: PromotionTheme;
  startsAt?: string;
  expiresAt?: string;
  sortOrder?: number;
  isActive?: boolean;
  image: PromotionImageAsset;
  productIds: string[];
}

export interface UpdatePromotionDTO {
  name?: string;
  slug?: string;
  kind?: PromotionKind;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  badgeText?: string;
  ctaLabel?: string;
  disclaimer?: string;
  themeTone?: PromotionTheme;
  startsAt?: string | null;
  expiresAt?: string | null;
  sortOrder?: number;
  isActive?: boolean;
  image?: PromotionImageAsset;
  productIds?: string[];
}
