/**
 * Product Service
 * Business logic for products and product images
 */

import { CategoryRepository } from '../repositories/category.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { deleteStoredProductImages, storeProductImage } from './product-image-storage.service.js';
import { NotFoundError, ValidationError } from '../utils/errors.util.js';
import { slugify } from '@rebequi/shared/utils';
import type {
  CreateProductInput,
  ProductFiltersInput,
  ProductImageInput,
  UpdateProductInput,
} from '@rebequi/shared/schemas';
import type { Prisma } from '@prisma/client';

type ListProductsOptions = {
  enforceActiveOnly: boolean;
};

export class ProductService {
  private productRepository: ProductRepository;
  private categoryRepository: CategoryRepository;

  constructor() {
    this.productRepository = new ProductRepository();
    this.categoryRepository = new CategoryRepository();
  }

  async getAll(filters: ProductFiltersInput) {
    return this.listProducts(filters, { enforceActiveOnly: true });
  }

  async getAdminAll(filters: ProductFiltersInput) {
    return this.listProducts(filters, { enforceActiveOnly: false });
  }

  async getById(id: string) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return this.formatProduct(product);
  }

  async getBySlug(slug: string) {
    const product = await this.productRepository.findBySlug(slug);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    return this.formatProduct(product);
  }

  async getPromotional() {
    const products = await this.productRepository.findPromotional();
    return products.map((product) => this.formatProduct(product));
  }

  async getNew() {
    const products = await this.productRepository.findNew();
    return products.map((product) => this.formatProduct(product));
  }

  async getFeatured() {
    const products = await this.productRepository.findFeatured();
    return products.map((product) => this.formatProduct(product));
  }

  async getByCategory(categorySlug: string, page: number = 1, limit: number = 12) {
    const skip = (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.productRepository.findByCategory(categorySlug, { skip, take: limit }),
      this.productRepository.count({
        category: { slug: categorySlug },
        isActive: true,
      }),
    ]);

    return {
      products: products.map((product) => this.formatProduct(product)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async uploadImage(params: {
    file?: Express.Multer.File;
    alt?: string;
    width?: number;
    height?: number;
  }) {
    const { file, alt, width, height } = params;

    if (!file) {
      throw new ValidationError('Image file is required');
    }

    const normalizedWidth = this.normalizeOptionalPositiveInteger(width);
    const normalizedHeight = this.normalizeOptionalPositiveInteger(height);

    return storeProductImage({
      file,
      alt,
      width: normalizedWidth,
      height: normalizedHeight,
    });
  }

  async create(data: CreateProductInput) {
    await this.ensureCategoryExists(data.categoryId);

    const slug = data.slug || slugify(data.name);
    const images = this.normalizeProductImages(data.images);

    const product = await this.productRepository.create({
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
      ...(images.length > 0
        ? {
            images: {
              create: images.map((image) => this.mapImageToCreateInput(image)),
            },
          }
        : {}),
    });

    return this.formatProduct(product);
  }

  async update(id: string, data: UpdateProductInput) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    const { images, categoryId, ...scalarFields } = data;

    if (categoryId) {
      await this.ensureCategoryExists(categoryId);
    }

    const updateData: Prisma.ProductUpdateInput = {
      ...scalarFields,
    };

    if (data.name && !data.slug) {
      updateData.slug = slugify(data.name);
    }

    if (categoryId) {
      updateData.category = {
        connect: { id: categoryId },
      };
    }

    const nextImages = images ? this.normalizeProductImages(images) : undefined;
    const removedImages =
      nextImages === undefined
        ? []
        : product.images.filter((currentImage) => !this.imageStillReferenced(currentImage, nextImages));

    if (nextImages) {
      updateData.images = {
        deleteMany: {},
        create: nextImages.map((image) => this.mapImageToCreateInput(image)),
      };
    }

    const updatedProduct = await this.productRepository.update(id, updateData);

    if (removedImages.length > 0) {
      await deleteStoredProductImages(removedImages);
    }

    return this.formatProduct(updatedProduct);
  }

  async delete(id: string) {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    await this.productRepository.softDelete(id);
    return { message: 'Product deleted successfully' };
  }

  private async listProducts(filters: ProductFiltersInput, options: ListProductsOptions) {
    const {
      page = 1,
      limit = 12,
      search,
      category,
      minPrice,
      maxPrice,
      isOffer,
      isNew,
      isFeatured,
      isActive,
    } = filters;
    const { enforceActiveOnly } = options;

    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
    };

    if (enforceActiveOnly) {
      where.isActive = isActive ?? true;
    } else if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { shortDesc: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (category) {
      where.category = { slug: category };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    if (isOffer !== undefined) {
      where.isOffer = isOffer;
    }
    if (isNew !== undefined) {
      where.isNew = isNew;
    }
    if (isFeatured !== undefined) {
      where.isFeatured = isFeatured;
    }

    const [products, total] = await Promise.all([
      this.productRepository.findMany({
        skip,
        take: limit,
        where,
        orderBy: { createdAt: 'desc' },
      }),
      this.productRepository.count(where),
    ]);

    return {
      products: products.map((product) => this.formatProduct(product)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.categoryRepository.findById(categoryId);
    if (!category) {
      throw new ValidationError('Category not found');
    }
  }

  private normalizeProductImages(images?: ProductImageInput[]) {
    if (!images || images.length === 0) {
      return [];
    }

    const orderedImages = images
      .map((image, index) => ({
        ...image,
        alt: image.alt?.trim() || undefined,
        order: index,
        isPrimary: image.isPrimary ?? false,
      }))
      .sort((left, right) => left.order - right.order)
      .map((image, index) => ({
        ...image,
        order: index,
      }));

    const primaryIndex = orderedImages.findIndex((image) => image.isPrimary);

    return orderedImages.map((image, index) => ({
      ...image,
      isPrimary: primaryIndex === -1 ? index === 0 : index === primaryIndex,
    }));
  }

  private imageStillReferenced(
    currentImage: { id: string; url: string; storageKey: string | null },
    nextImages: ProductImageInput[]
  ) {
    return nextImages.some((nextImage) => {
      if (nextImage.storageKey && currentImage.storageKey) {
        return nextImage.storageKey === currentImage.storageKey;
      }

      return nextImage.url === currentImage.url;
    });
  }

  private mapImageToCreateInput(image: ProductImageInput): Prisma.ProductImageCreateWithoutProductInput {
    return {
      url: image.url,
      alt: image.alt,
      order: image.order,
      isPrimary: image.isPrimary,
      storageKey: image.storageKey,
      filename: image.filename,
      mimeType: image.mimeType,
      size: image.size,
      width: image.width,
      height: image.height,
    };
  }

  private normalizeOptionalPositiveInteger(value?: number) {
    if (value === undefined || value === null || Number.isNaN(value)) {
      return undefined;
    }

    const normalized = Math.trunc(value);
    if (normalized <= 0) {
      throw new ValidationError('Image dimensions must be positive integers');
    }

    return normalized;
  }

  private normalizeNullableField<T>(value: T | null | undefined) {
    return value ?? undefined;
  }

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
      categoryId: product.categoryId,
      category: product.category
        ? {
            id: product.category.id,
            name: product.category.name,
            slug: product.category.slug,
            icon: product.category.icon,
            image: product.category.image,
          }
        : undefined,
      images:
        product.images?.map((image: any) => ({
          id: image.id,
          url: image.url,
          alt: this.normalizeNullableField(image.alt),
          order: image.order,
          isPrimary: image.isPrimary,
          storageKey: this.normalizeNullableField(image.storageKey),
          filename: this.normalizeNullableField(image.filename),
          mimeType: this.normalizeNullableField(image.mimeType),
          size: this.normalizeNullableField(image.size),
          width: this.normalizeNullableField(image.width),
          height: this.normalizeNullableField(image.height),
        })) || [],
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
    };
  }
}
