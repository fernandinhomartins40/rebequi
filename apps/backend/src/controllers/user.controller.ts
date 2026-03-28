import { NextFunction, Request, Response } from 'express';
import type { CreateManagedUserInput, ManagedUserFiltersInput, UpdateManagedUserInput } from '@rebequi/shared/schemas';
import { UserManagementService } from '../services/user-management.service.js';
import { successResponse } from '../utils/response.util.js';
import { UnauthorizedError } from '../utils/errors.util.js';

export class UserController {
  private userManagementService: UserManagementService;

  constructor() {
    this.userManagementService = new UserManagementService();
  }

  listManagedUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = req.query as unknown as ManagedUserFiltersInput;
      const result = await this.userManagementService.listManagedUsers(filters);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  createManagedUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload: CreateManagedUserInput = req.body;
      const user = await this.userManagementService.createManagedUser(payload);
      successResponse(res, user, 201, 'Usuario interno criado com sucesso');
    } catch (error) {
      next(error);
    }
  };

  updateManagedUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      const payload: UpdateManagedUserInput = req.body;
      const user = await this.userManagementService.updateManagedUser(req.user.userId, req.params.id, payload);
      successResponse(res, user, 200, 'Usuario interno atualizado com sucesso');
    } catch (error) {
      next(error);
    }
  };
}
