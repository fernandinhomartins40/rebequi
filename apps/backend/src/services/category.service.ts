/**
 * Category Service
 * Business logic for categories
 */

import { CategoryRepository } from '../repositories/category.repository.js';
import { NotFoundError, ConflictError } from '../utils/errors.util.js';
import { slugify } from '@rebequi/shared/utils';
import type { CreateCategoryInput, UpdateCategoryInput } from '@rebequi/shared/schemas';

export class CategoryService {
  private categoryRepository: CategoryRepository;

  constructor() {
    this.categoryRepository = new CategoryRepository();
  }

  /**
   * Get all categories
   */
  async getAll(includeInactive: boolean = false) {
    const categories = await this.categoryRepository.findAll(includeInactive);
    const total = await this.categoryRepository.count();

    return {
      categories: categories.map((cat: any) => ({
        ...cat,
        productsCount: cat._count?.products || 0,
      })),
      total,
    };
  }

  /**
   * Get category by ID
   */
  async getById(id: string) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return {
      ...category,
      productsCount: (category as any)._count?.products || 0,
    };
  }

  /**
   * Get category by slug
   */
  async getBySlug(slug: string) {
    const category = await this.categoryRepository.findBySlug(slug);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return {
      ...category,
      productsCount: (category as any)._count?.products || 0,
    };
  }

  /**
   * Create category
   */
  async create(data: CreateCategoryInput) {
    // Generate slug if not provided
    const slug = data.slug || slugify(data.name);

    // Check if slug already exists
    const existingCategory = await this.categoryRepository.findBySlug(slug);
    if (existingCategory) {
      throw new ConflictError('Category with this slug already exists');
    }

    const category = await this.categoryRepository.create({
      name: data.name,
      slug,
      icon: data.icon,
      image: data.image,
      description: data.description,
      isActive: data.isActive,
    });

    return category;
  }

  /**
   * Update category
   */
  async update(id: string, data: UpdateCategoryInput) {
    // Check if category exists
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    // If updating slug, check if it's already in use
    if (data.slug && data.slug !== category.slug) {
      const existingCategory = await this.categoryRepository.findBySlug(data.slug);
      if (existingCategory) {
        throw new ConflictError('Category with this slug already exists');
      }
    }

    // If updating name and no slug provided, generate new slug
    const updateData = {
      ...data,
      slug: data.slug || (data.name ? slugify(data.name) : undefined),
    };

    const updatedCategory = await this.categoryRepository.update(id, updateData);
    return updatedCategory;
  }

  /**
   * Delete category (soft delete)
   */
  async delete(id: string) {
    const category = await this.categoryRepository.findById(id);
    if (!category) {
      throw new NotFoundError('Category not found');
    }

    const productsCount = (category as any)._count?.products || 0;
    if (productsCount > 0) {
      throw new ConflictError('Category cannot be deleted while products are linked to it');
    }

    await this.categoryRepository.softDelete(id);
    return { message: 'Category deleted successfully' };
  }
}
