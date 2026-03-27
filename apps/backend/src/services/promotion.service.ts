import { Prisma, PromotionKind, PromotionTheme } from '@prisma/client';
import { slugify } from '@rebequi/shared/utils';
import type {
  CreatePromotionInput,
  PromotionFiltersInput,
  PromotionImageInput,
  UpdatePromotionInput,
} from '@rebequi/shared/schemas';
import { ProductRepository } from '../repositories/product.repository.js';
import { PromotionRepository } from '../repositories/promotion.repository.js';
import { deleteStoredPromotionImages, storePromotionImage } from './product-image-storage.service.js';
import { ConflictError, NotFoundError, ValidationError } from '../utils/errors.util.js';

type ListPromotionOptions = {
  includeInactive: boolean;
};

export class PromotionService {
  private promotionRepository: PromotionRepository;
  private productRepository: ProductRepository;

  constructor() {
    this.promotionRepository = new PromotionRepository();
    this.productRepository = new ProductRepository();
  }

  async getPublicAll(filters: PromotionFiltersInput) {
    return this.listPromotions(filters, { includeInactive: false });
  }

  async getAdminAll(filters: PromotionFiltersInput) {
    return this.listPromotions(filters, { includeInactive: true });
  }

  async getPublicBySlug(slug: string) {
    const promotion = await this.promotionRepository.findPublicBySlug(slug, this.buildPublicWhere(new Date()));
    if (!promotion) {
      throw new NotFoundError('Promotion not found');
    }

    return this.formatPromotion(promotion);
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

    return storePromotionImage({
      file,
      alt,
      width: normalizedWidth,
      height: normalizedHeight,
    });
  }

  async create(data: CreatePromotionInput) {
    const normalizedName = data.name.trim();
    const slug = data.slug?.trim() || slugify(normalizedName);
    const kind = this.mapKind(data.kind);

    await this.ensureSlugAvailable(slug);
    const productIds = this.normalizeProductIds(data.productIds);
    this.validateProductCountForKind(kind, productIds);
    await this.ensureProductsExist(productIds);

    const promotion = await this.promotionRepository.create({
      name: normalizedName,
      slug,
      kind,
      eyebrow: this.normalizeOptionalString(data.eyebrow),
      title: data.title.trim(),
      subtitle: this.normalizeOptionalString(data.subtitle),
      description: this.normalizeOptionalString(data.description),
      badgeText: this.normalizeOptionalString(data.badgeText),
      ctaLabel: this.normalizeOptionalString(data.ctaLabel) || 'Ver oferta',
      disclaimer: this.normalizeOptionalString(data.disclaimer),
      themeTone: this.mapThemeTone(data.themeTone),
      startsAt: this.normalizeOptionalDate(data.startsAt),
      expiresAt: this.normalizeOptionalDate(data.expiresAt),
      sortOrder: data.sortOrder ?? 0,
      isActive: data.isActive ?? true,
      ...this.mapImageFields(data.image),
      products: {
        create: productIds.map((productId, index) => ({
          order: index,
          product: {
            connect: { id: productId },
          },
        })),
      },
    });

    return this.formatPromotion(promotion);
  }

  async update(id: string, data: UpdatePromotionInput) {
    const currentPromotion = await this.promotionRepository.findById(id);
    if (!currentPromotion) {
      throw new NotFoundError('Promotion not found');
    }

    const updateData: Prisma.PromotionUpdateInput = {};
    const nextKind = data.kind !== undefined ? this.mapKind(data.kind) : currentPromotion.kind;
    const currentProductIds = (currentPromotion.products ?? []).map((item) => item.productId);

    if (data.kind !== undefined && data.productIds === undefined) {
      this.validateProductCountForKind(nextKind, currentProductIds);
    }

    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }

    const nextSlug =
      data.slug !== undefined
        ? data.slug.trim()
        : data.name !== undefined
          ? slugify(data.name.trim())
          : undefined;

    if (nextSlug) {
      await this.ensureSlugAvailable(nextSlug, currentPromotion.id);
      updateData.slug = nextSlug;
    }
    if (data.kind !== undefined) {
      updateData.kind = nextKind;
    }

    if (data.eyebrow !== undefined) {
      updateData.eyebrow = this.normalizeNullableOptionalString(data.eyebrow);
    }
    if (data.title !== undefined) {
      updateData.title = data.title.trim();
    }
    if (data.subtitle !== undefined) {
      updateData.subtitle = this.normalizeNullableOptionalString(data.subtitle);
    }
    if (data.description !== undefined) {
      updateData.description = this.normalizeNullableOptionalString(data.description);
    }
    if (data.badgeText !== undefined) {
      updateData.badgeText = this.normalizeNullableOptionalString(data.badgeText);
    }
    if (data.ctaLabel !== undefined) {
      updateData.ctaLabel = this.normalizeNullableOptionalString(data.ctaLabel) || 'Ver oferta';
    }
    if (data.disclaimer !== undefined) {
      updateData.disclaimer = this.normalizeNullableOptionalString(data.disclaimer);
    }
    if (data.themeTone !== undefined) {
      updateData.themeTone = this.mapThemeTone(data.themeTone);
    }
    if (data.startsAt !== undefined) {
      updateData.startsAt = this.normalizeNullableDate(data.startsAt);
    }
    if (data.expiresAt !== undefined) {
      updateData.expiresAt = this.normalizeNullableDate(data.expiresAt);
    }
    if (data.sortOrder !== undefined) {
      updateData.sortOrder = data.sortOrder;
    }
    if (data.isActive !== undefined) {
      updateData.isActive = data.isActive;
    }
    if (data.image !== undefined) {
      Object.assign(updateData, this.mapImageFields(data.image));
    }
    if (data.productIds !== undefined) {
      const productIds = this.normalizeProductIds(data.productIds);
      this.validateProductCountForKind(nextKind, productIds);
      await this.ensureProductsExist(productIds);
      updateData.products = {
        deleteMany: {},
        create: productIds.map((productId, index) => ({
          order: index,
          product: {
            connect: { id: productId },
          },
        })),
      };
    }

    const updatedPromotion = await this.promotionRepository.update(id, updateData);
    return this.formatPromotion(updatedPromotion);
  }

  async delete(id: string) {
    const promotion = await this.promotionRepository.findById(id);
    if (!promotion) {
      throw new NotFoundError('Promotion not found');
    }

    await this.promotionRepository.softDelete(id);
    await deleteStoredPromotionImages([{ storageKey: promotion.imageStorageKey }]);
    return { message: 'Promotion deleted successfully' };
  }

  private async listPromotions(filters: PromotionFiltersInput, options: ListPromotionOptions) {
    const {
      page = 1,
      limit = 12,
      search,
      kind,
      status,
      isActive,
    } = filters;
    const referenceDate = new Date();
    const skip = (page - 1) * limit;
    const where = options.includeInactive
      ? this.buildAdminWhere({ search, kind, status, isActive }, referenceDate)
      : this.buildPublicWhere(referenceDate, search, kind);

    const [promotions, total] = await Promise.all([
      options.includeInactive
        ? this.promotionRepository.findAdminMany({
            skip,
            take: limit,
            where,
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          })
        : this.promotionRepository.findPublicMany({
            skip,
            take: limit,
            where,
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
          }),
      this.promotionRepository.count(where),
    ]);

    return {
      promotions: promotions.map((promotion) => this.formatPromotion(promotion)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private buildPublicWhere(referenceDate: Date, search?: string, kind?: string): Prisma.PromotionWhereInput {
    const conditions: Prisma.PromotionWhereInput[] = [
      { isActive: true },
      {
        OR: [
          { startsAt: null },
          { startsAt: { lte: referenceDate } },
        ],
      },
      {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: referenceDate } },
        ],
      },
      {
        products: {
          some: {
            product: {
              deletedAt: null,
              isActive: true,
              stock: { gt: 0 },
            },
          },
        },
      },
    ];

    if (search) {
      conditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { subtitle: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (kind) {
      conditions.push({ kind: this.mapKind(kind) });
    }

    return { AND: conditions };
  }

  private buildAdminWhere(
    filters: Pick<PromotionFiltersInput, 'search' | 'kind' | 'status' | 'isActive'>,
    referenceDate: Date,
  ): Prisma.PromotionWhereInput {
    const conditions: Prisma.PromotionWhereInput[] = [];

    if (filters.search) {
      conditions.push({
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { title: { contains: filters.search, mode: 'insensitive' } },
          { subtitle: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      });
    }

    if (filters.isActive !== undefined) {
      conditions.push({ isActive: filters.isActive });
    }

    if (filters.kind) {
      conditions.push({ kind: this.mapKind(filters.kind) });
    }

    if (filters.status && filters.status !== 'all') {
      if (filters.status === 'inactive') {
        conditions.push({ isActive: false });
      }

      if (filters.status === 'scheduled') {
        conditions.push({
          isActive: true,
          startsAt: { gt: referenceDate },
        });
      }

      if (filters.status === 'expired') {
        conditions.push({
          isActive: true,
          expiresAt: { lte: referenceDate },
        });
      }

      if (filters.status === 'active') {
        conditions.push({
          isActive: true,
          OR: [
            { startsAt: null },
            { startsAt: { lte: referenceDate } },
          ],
        });
        conditions.push({
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: referenceDate } },
          ],
        });
      }
    }

    return conditions.length > 0 ? { AND: conditions } : {};
  }

  private async ensureSlugAvailable(slug: string, ignoreId?: string) {
    const existingPromotion = await this.promotionRepository.findBySlug(slug);
    if (existingPromotion && existingPromotion.id !== ignoreId) {
      throw new ConflictError('Promotion with this slug already exists');
    }
  }

  private normalizeProductIds(productIds: string[]) {
    const uniqueIds = Array.from(new Set(productIds.map((value) => value.trim()).filter(Boolean)));

    if (uniqueIds.length === 0) {
      throw new ValidationError('Select at least one product for the promotion');
    }

    return uniqueIds;
  }

  private validateProductCountForKind(kind: PromotionKind, productIds: string[]) {
    if (kind === PromotionKind.SINGLE_PRODUCT && productIds.length !== 1) {
      throw new ValidationError('Single-product offers must contain exactly one product');
    }

    if (kind === PromotionKind.COLLECTION && productIds.length < 2) {
      throw new ValidationError('Promotional collections must contain at least two products');
    }
  }

  private async ensureProductsExist(productIds: string[]) {
    const products = await this.productRepository.findByIds(productIds);

    if (products.length !== productIds.length) {
      throw new ValidationError('One or more products selected for the promotion were not found');
    }
  }

  private normalizeOptionalString(value?: string | null) {
    const trimmedValue = value?.trim();
    return trimmedValue || undefined;
  }

  private normalizeNullableOptionalString(value?: string | null) {
    const trimmedValue = value?.trim();
    return trimmedValue || null;
  }

  private normalizeOptionalDate(value?: string | null) {
    if (!value) {
      return undefined;
    }

    const normalized = new Date(value);
    if (Number.isNaN(normalized.getTime())) {
      throw new ValidationError('Invalid promotion date');
    }

    return normalized;
  }

  private normalizeNullableDate(value?: string | null) {
    if (value === null) {
      return null;
    }

    return this.normalizeOptionalDate(value);
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

  private mapThemeTone(value?: string | null) {
    switch (value) {
      case 'blue':
        return PromotionTheme.BLUE;
      case 'green':
        return PromotionTheme.GREEN;
      case 'red':
        return PromotionTheme.RED;
      case 'slate':
        return PromotionTheme.SLATE;
      case 'gold':
      case undefined:
      case null:
        return PromotionTheme.GOLD;
      default:
        throw new ValidationError('Invalid promotion theme');
    }
  }

  private mapKind(value?: string | null) {
    switch (value) {
      case 'single_product':
        return PromotionKind.SINGLE_PRODUCT;
      case 'collection':
      case undefined:
      case null:
        return PromotionKind.COLLECTION;
      default:
        throw new ValidationError('Invalid promotion kind');
    }
  }

  private formatKind(value: PromotionKind) {
    switch (value) {
      case PromotionKind.SINGLE_PRODUCT:
        return 'single_product';
      case PromotionKind.COLLECTION:
      default:
        return 'collection';
    }
  }

  private formatThemeTone(value: PromotionTheme) {
    switch (value) {
      case PromotionTheme.BLUE:
        return 'blue';
      case PromotionTheme.GREEN:
        return 'green';
      case PromotionTheme.RED:
        return 'red';
      case PromotionTheme.SLATE:
        return 'slate';
      case PromotionTheme.GOLD:
      default:
        return 'gold';
    }
  }

  private mapImageFields(image: PromotionImageInput) {
    return {
      imageUrl: image.url,
      imageAlt: this.normalizeOptionalString(image.alt),
      imageStorageKey: image.storageKey,
      imageFilename: image.filename,
      imageMimeType: image.mimeType,
      imageSize: image.size,
      imageWidth: image.width,
      imageHeight: image.height,
    };
  }

  private getPromotionStatus(promotion: {
    isActive: boolean;
    startsAt?: Date | null;
    expiresAt?: Date | null;
  }) {
    const now = Date.now();
    const startsAt = promotion.startsAt ? new Date(promotion.startsAt).getTime() : undefined;
    const expiresAt = promotion.expiresAt ? new Date(promotion.expiresAt).getTime() : undefined;

    if (!promotion.isActive) {
      return 'inactive' as const;
    }

    if (startsAt && startsAt > now) {
      return 'scheduled' as const;
    }

    if (expiresAt && expiresAt <= now) {
      return 'expired' as const;
    }

    return 'active' as const;
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
          alt: image.alt ?? undefined,
          order: image.order,
          isPrimary: image.isPrimary,
          storageKey: image.storageKey ?? undefined,
          filename: image.filename ?? undefined,
          mimeType: image.mimeType ?? undefined,
          size: image.size ?? undefined,
          width: image.width ?? undefined,
          height: image.height ?? undefined,
        })) || [],
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      deletedAt: product.deletedAt,
    };
  }

  private formatPromotion(promotion: any) {
    const products = (promotion.products ?? []).map((item: any) => this.formatProduct(item.product));
    const categories = Array.from(
      new Set(
        products
          .map((product) => product.category?.name)
          .filter((value): value is string => Boolean(value))
      )
    );

    return {
      id: promotion.id,
      name: promotion.name,
      slug: promotion.slug,
      kind: this.formatKind(promotion.kind),
      eyebrow: promotion.eyebrow ?? undefined,
      title: promotion.title,
      subtitle: promotion.subtitle ?? undefined,
      description: promotion.description ?? undefined,
      badgeText: promotion.badgeText ?? undefined,
      ctaLabel: promotion.ctaLabel ?? 'Ver oferta',
      disclaimer: promotion.disclaimer ?? undefined,
      themeTone: this.formatThemeTone(promotion.themeTone),
      startsAt: promotion.startsAt,
      expiresAt: promotion.expiresAt,
      sortOrder: promotion.sortOrder,
      isActive: promotion.isActive,
      status: this.getPromotionStatus(promotion),
      productCount: products.length,
      categoryCount: categories.length,
      categories,
      primaryProduct: products[0],
      image: promotion.imageUrl
        ? {
            url: promotion.imageUrl,
            alt: promotion.imageAlt ?? undefined,
            storageKey: promotion.imageStorageKey ?? undefined,
            filename: promotion.imageFilename ?? undefined,
            mimeType: promotion.imageMimeType ?? undefined,
            size: promotion.imageSize ?? undefined,
            width: promotion.imageWidth ?? undefined,
            height: promotion.imageHeight ?? undefined,
          }
        : undefined,
      products,
      createdAt: promotion.createdAt,
      updatedAt: promotion.updatedAt,
      deletedAt: promotion.deletedAt,
    };
  }
}
