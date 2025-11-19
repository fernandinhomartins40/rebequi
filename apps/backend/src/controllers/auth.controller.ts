/**
 * Auth Controller
 * Handle authentication HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { successResponse } from '../utils/response.util.js';
import type { LoginInput, RegisterInput } from '@rebequi/shared/schemas';

export class AuthController {
  private authService: AuthService;

  constructor() {
    this.authService = new AuthService();
  }

  /**
   * Register new user
   * POST /api/auth/register
   */
  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: RegisterInput = req.body;
      const result = await this.authService.register(data);
      successResponse(res, result, 201, 'User registered successfully');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Login user
   * POST /api/auth/login
   */
  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: LoginInput = req.body;
      const result = await this.authService.login(data);
      successResponse(res, result, 200, 'Login successful');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get current user profile
   * GET /api/auth/me
   */
  getProfile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new Error('User not authenticated');
      }
      const result = await this.authService.getProfile(req.user.userId);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };
}
