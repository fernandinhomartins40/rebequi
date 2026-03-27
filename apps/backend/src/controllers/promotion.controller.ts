import { NextFunction, Request, Response } from 'express';
import type { CreatePromotionInput, PromotionFiltersInput, UpdatePromotionInput } from '@rebequi/shared/schemas';
import { PromotionService } from '../services/promotion.service.js';
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

function parsePromotionKind(value: unknown) {
  if (value === 'collection' || value === 'single_product') {
    return value;
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

export class PromotionController {
  private promotionService: PromotionService;

  constructor() {
    this.promotionService = new PromotionService();
  }

  getPublicAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters: PromotionFiltersInput = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 12,
        search: req.query.search as string,
        kind: parsePromotionKind(req.query.kind),
      };

      const result = await this.promotionService.getPublicAll(filters);
      paginatedResponse(res, result.promotions, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  };

  getAdminAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const status =
        typeof req.query.status === 'string' &&
        ['active', 'scheduled', 'expired', 'inactive', 'all'].includes(req.query.status)
          ? (req.query.status as PromotionFiltersInput['status'])
          : undefined;

      const filters: PromotionFiltersInput = {
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 50,
        search: req.query.search as string,
        kind: parsePromotionKind(req.query.kind),
        status,
        isActive: parseBooleanQuery(req.query.isActive),
      };

      const result = await this.promotionService.getAdminAll(filters);
      paginatedResponse(res, result.promotions, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  };

  getPublicBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = getRouteParam(req.params.slug);
      const result = await this.promotionService.getPublicBySlug(slug);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  uploadImage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.promotionService.uploadImage({
        file: req.file,
        alt: req.body.alt,
        width: parseNumber(req.body.width),
        height: parseNumber(req.body.height),
      });
      successResponse(res, result, 201, 'Promotion image uploaded successfully');
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: CreatePromotionInput = req.body;
      const result = await this.promotionService.create(data);
      successResponse(res, result, 201, 'Promotion created successfully');
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getRouteParam(req.params.id);
      const data: UpdatePromotionInput = req.body;
      const result = await this.promotionService.update(id, data);
      successResponse(res, result, 200, 'Promotion updated successfully');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getRouteParam(req.params.id);
      const result = await this.promotionService.delete(id);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };
}
