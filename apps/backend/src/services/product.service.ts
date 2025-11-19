/**
 * Product Service
 * Business logic for products
 */

import { ProductRepository } from '../repositories/product.repository.js';
import { CategoryRepository } from '../repositories/category.repository.js';
import { NotFoundError, ValidationError } from '../utils/errors.util.js';
import { slugify } from '@rebequi/shared/utils';
import type { CreateProductInput, UpdateProductInput, ProductFiltersInput } from '@rebequi/shared/schemas';

export class ProductService {
  private productRepository: ProductRepository;
  private categoryRepository: CategoryRepository;

  constructor() {
    this.productRepository = new ProductRepository();
    this.categoryRepository = new CategoryRepository();
  }

  /**
   * Get all products with filters and pagination
   */
  async getAll(filters: ProductFiltersInput) {
    const { page = 1, limit = 12, search, category, minPrice, maxPrice, isOffer, isNew, isFeatured, isActive } = filters;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {
      isActive: isActive ?? true,
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = { slug: category };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }

    if (isOffer !== undefined) where.isOffer = isOffer;
    if (isNew !== undefined) where.isNew = isNew;
    if (isFeatured !== undefined) where.isFeatured = isFeatured;

    const [products, total] = await Promise.all([
      this.productRepository.findMany({ skip, take: limit, where }),
      this.productRepository.count(where),
    ]);

    return {
      products: products.map((p: any) => this.formatProduct(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get product by ID
   */
  async getById(id: string) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return this.formatProduct(product);
  }

  /**
   * Get product by slug
   */
  async getBySlug(slug: string) {
    const product = await this.productRepository.findBySlug(slug);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return this.formatProduct(product);
  }

  /**
   * Get promotional products
   */
  async getPromotional() {
    const products = await this.productRepository.findPromotional();
    return products.map((p: any) => this.formatProduct(p));
  }

  /**
   * Get new products
   */
  async getNew() {
    const products = await this.productRepository.findNew();
    return products.map((p: any) => this.formatProduct(p));
  }

  /**
   * Get featured products
   */
  async getFeatured() {
    const products = await this.productRepository.findFeatured();
    return products.map((p: any) => this.formatProduct(p));
  }

  /**
   * Get products by category
   */
  async getByCategory(categorySlug: string, page: number = 1, limit: number = 12) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.productRepository.findByCategory(categorySlug, { skip, take: limit }),
      this.productRepository.count({ category: { slug: categorySlug } }),
    ]);

    return {
      products: products.map((p: any) => this.formatProduct(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Create product
   */
  async create(data: CreateProductInput) {
    // Verify category exists
    const category = await this.categoryRepository.findById(data.categoryId);
    if (!category) {
      throw new ValidationError('Category not found');
    }

    // Generate slug if not provided
    const slug = data.slug || slugify(data.name);

    // Prepare product data
    const productData: any = {
      name: data.name,
      slug,
      sku: data.sku,
      price: data.price,
      originalPrice: data.originalPrice,
      description: data.description,
      shortDesc: data.shortDesc,
      isOffer: data.isOffer ?? false,
      isNew: data.isNew ?? false,
      isFeatured: data.isFeatured ?? false,
      discount: data.discount,
      stock: data.stock,
      minStock: data.minStock ?? 0,
      weight: data.weight,
      dimensions: data.dimensions,
      category: {
        connect: { id: data.categoryId },
      },
    };

    // Add images if provided
    if (data.images && data.images.length > 0) {
      productData.images = {
        create: data.images.map((img, index) => ({
          url: img.url,
          alt: img.alt,
          order: img.order ?? index,
          isPrimary: img.isPrimary ?? index === 0,
        })),
      };
    }

    const product = await this.productRepository.create(productData);
    return this.formatProduct(product);
  }

  /**
   * Update product
   */
  async update(id: string, data: UpdateProductInput) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Verify category if changing
    if (data.categoryId) {
      const category = await this.categoryRepository.findById(data.categoryId);
      if (!category) {
        throw new ValidationError('Category not found');
      }
    }

    const updateData: any = { ...data };

    // Generate slug if name is updated and no slug provided
    if (data.name && !data.slug) {
      updateData.slug = slugify(data.name);
    }

    // Update category connection if provided
    if (data.categoryId) {
      updateData.category = {
        connect: { id: data.categoryId },
      };
      delete updateData.categoryId;
    }

    const updatedProduct = await this.productRepository.update(id, updateData);
    return this.formatProduct(updatedProduct);
  }

  /**
   * Delete product (soft delete)
   */
  async delete(id: string) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    await this.productRepository.softDelete(id);
    return { message: 'Product deleted successfully' };
  }

  /**
   * Format product for response
   */
  private formatProduct(product: any) {
    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      price: product.price,
      originalPrice: product.originalPrice,
      description: product.description,
      shortDesc: product.shortDesc,
      isOffer: product.isOffer,
      isNew: product.isNew,
      isFeatured: product.isFeatured,
      discount: product.discount,
      stock: product.stock,
      minStock: product.minStock,
      weight: product.weight,
      dimensions: product.dimensions,
      category: product.category ? {
        id: product.category.id,
        name: product.category.name,
        slug: product.category.slug,
        icon: product.category.icon,
        image: product.category.image,
      } : undefined,
      images: product.images?.map((img: any) => ({
        id: img.id,
        url: img.url,
        alt: img.alt,
        order: img.order,
        isPrimary: img.isPrimary,
      })) || [],
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
  }
}
