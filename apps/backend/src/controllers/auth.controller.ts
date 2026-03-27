/**
 * Auth Controller
 * Handle authentication HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { successResponse } from '../utils/response.util.js';
import { setAuthCookie, clearAuthCookie } from '../utils/cookie.util.js';
import { UnauthorizedError } from '../utils/errors.util.js';
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateAdminCredentialsInput,
} from '@rebequi/shared/schemas';

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
      const { user, token } = await this.authService.register(data);
      setAuthCookie(res, token);
      successResponse(res, { user }, 201, 'User registered successfully');
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
      const { user, token } = await this.authService.login(data);
      setAuthCookie(res, token);
      successResponse(res, { user }, 200, 'Login successful');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Logout user (clear auth cookie)
   * POST /api/auth/logout
   */
  logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      clearAuthCookie(res);
      successResponse(res, null, 200, 'Logout successful');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update default admin credentials (first access)
   * POST /api/auth/admin/update-credentials
   */
  updateAdminCredentials = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: UpdateAdminCredentialsInput = req.body;
      const { user, token } = await this.authService.updateAdminCredentials(data);
      setAuthCookie(res, token);
      successResponse(res, { user }, 200, 'Admin credentials updated');
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update password for the currently authenticated user.
   * POST /api/auth/change-password
   */
  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      const data: ChangePasswordInput = req.body;
      const { user, token } = await this.authService.changePassword(req.user.userId, data);
      setAuthCookie(res, token);
      successResponse(res, { user }, 200, 'Password updated successfully');
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
        throw new UnauthorizedError('User not authenticated');
      }
      const result = await this.authService.getProfile(req.user.userId);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };
}
