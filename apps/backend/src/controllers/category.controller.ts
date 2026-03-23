/**
 * Category controller.
 */

import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service.js';
import { successResponse } from '../utils/response.util.js';
import type { CreateCategoryInput, UpdateCategoryInput } from '@rebequi/shared/schemas';

function getRouteParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
}

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const result = await this.categoryService.getAll(includeInactive);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getRouteParam(req.params.id);
      const result = await this.categoryService.getById(id);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  getBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const slug = getRouteParam(req.params.slug);
      const result = await this.categoryService.getBySlug(slug);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: CreateCategoryInput = req.body;
      const result = await this.categoryService.create(data);
      successResponse(res, result, 201, 'Category created successfully');
    } catch (error) {
      next(error);
    }
  };

  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getRouteParam(req.params.id);
      const data: UpdateCategoryInput = req.body;
      const result = await this.categoryService.update(id, data);
      successResponse(res, result, 200, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getRouteParam(req.params.id);
      const result = await this.categoryService.delete(id);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };
}
