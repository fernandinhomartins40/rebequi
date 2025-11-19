/**
 * Category Controller
 * Handle category HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { CategoryService } from '../services/category.service.js';
import { successResponse } from '../utils/response.util.js';
import type { CreateCategoryInput, UpdateCategoryInput } from '@rebequi/shared/schemas';

export class CategoryController {
  private categoryService: CategoryService;

  constructor() {
    this.categoryService = new CategoryService();
  }

  /**
   * Get all categories
   * GET /api/categories
   */
  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const includeInactive = req.query.includeInactive === 'true';
      const result = await this.categoryService.getAll(includeInactive);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get category by ID
   * GET /api/categories/:id
   */
  getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.categoryService.getById(id);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get category by slug
   * GET /api/categories/slug/:slug
   */
  getBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { slug } = req.params;
      const result = await this.categoryService.getBySlug(slug);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create category
   * POST /api/categories
   */
  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: CreateCategoryInput = req.body;
      const result = await this.categoryService.create(data);
      successResponse(res, result, 201, 'Category created successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update category
   * PUT /api/categories/:id
   */
  update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const data: UpdateCategoryInput = req.body;
      const result = await this.categoryService.update(id, data);
      successResponse(res, result, 200, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete category
   * DELETE /api/categories/:id
   */
  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await this.categoryService.delete(id);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };
}
