/**
 * Product controller.
 */

import { NextFunction, Request, Response } from 'express';
import type { CreateProductInput, ProductFiltersInput, UpdateProductInput } from '@rebequi/shared/schemas';
import { ProductService } from '../services/product.service.js';
import { paginatedResponse, successResponse } from '../utils/response.util.js';

function getRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
}

function parseBooleanQuery(value: unknown) {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}

function parseNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? undefined : numericValue;
}

export class ProductController {
  private productService: ProductService;

  constructor() {
    this.productService = new ProductService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters: ProductFiltersInput = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 12,
        search: req.query.search as string,
        category: req.query.category as string,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        isOffer: parseBooleanQuery(req.query.isOffer),
        isNew: parseBooleanQuery(req.query.isNew),
        isFeatured: parseBooleanQuery(req.query.isFeatured),
        isActive: req.query.isActive === 'false' ? false : true,
      };

      const result = await this.productService.getAll(filters);
      paginatedResponse(res, result.products, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  };

  getAdminAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters: ProductFiltersInput = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50,
        search: req.query.search as string,
        category: req.query.category as string,
        minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
        maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
        isOffer: parseBooleanQuery(req.query.isOffer),
        isNew: parseBooleanQuery(req.query.isNew),
        isFeatured: parseBooleanQuery(req.query.isFeatured),
        isActive: parseBooleanQuery(req.query.isActive),
      };

      const result = await this.productService.getAdminAll(filters);
      paginatedResponse(res, result.products, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getRouteParam(req.params.id);
      const result = await this.productService.getById(id);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  getBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = getRouteParam(req.params.slug);
      const result = await this.productService.getBySlug(slug);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  getPromotional = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.productService.getPromotional();
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  getNew = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.productService.getNew();
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  getFeatured = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.productService.getFeatured();
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  getByCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const categorySlug = getRouteParam(req.params.categorySlug);
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 12;

      const result = await this.productService.getByCategory(categorySlug, page, limit);
      paginatedResponse(res, result.products, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  };

  uploadImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.productService.uploadImage({
        file: req.file,
        alt: req.body.alt,
        width: parseNumber(req.body.width),
        height: parseNumber(req.body.height),
      });
      successResponse(res, result, 201, 'Product image uploaded successfully');
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: CreateProductInput = req.body;
      const result = await this.productService.create(data);
      successResponse(res, result, 201, 'Product created successfully');
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getRouteParam(req.params.id);
      const data: UpdateProductInput = req.body;
      const result = await this.productService.update(id, data);
      successResponse(res, result, 200, 'Product updated successfully');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getRouteParam(req.params.id);
      const result = await this.productService.delete(id);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };
}
