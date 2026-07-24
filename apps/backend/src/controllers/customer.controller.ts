import { NextFunction, Request, Response } from 'express';
import type {
  CreateCustomerNoteInput,
  CustomerFiltersInput,
  UpdateCustomerCrmInput,
} from '@rebequi/shared/schemas';
import { paginatedResponse, successResponse } from '../utils/response.util.js';
import { CustomerService } from '../services/customer.service.js';

export class CustomerController {
  private customerService: CustomerService;

  constructor() {
    this.customerService = new CustomerService();
  }

  listCustomers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = req.query as unknown as CustomerFiltersInput;
      const result = await this.customerService.listCustomers(filters);
      paginatedResponse(res, result.customers, result.page, result.limit, result.total, undefined);
    } catch (error) {
      next(error);
    }
  };

  getStageDistribution = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const distribution = await this.customerService.getStageDistribution();
      successResponse(res, distribution, 200);
    } catch (error) {
      next(error);
    }
  };

  getCustomer = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customer = await this.customerService.getCustomerDetail(req.params.id);
      successResponse(res, customer, 200);
    } catch (error) {
      next(error);
    }
  };

  updateCrm = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload: UpdateCustomerCrmInput = req.body;
      const customer = await this.customerService.updateCrm(req.params.id, payload);
      successResponse(res, customer, 200, 'Cliente atualizado com sucesso');
    } catch (error) {
      next(error);
    }
  };

  addNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload: CreateCustomerNoteInput = req.body;
      const note = await this.customerService.addNote(req.params.id, req.user?.userId, payload);
      successResponse(res, note, 201, 'Anotacao adicionada');
    } catch (error) {
      next(error);
    }
  };

  deleteNote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.customerService.deleteNote(req.params.id, req.params.noteId);
      successResponse(res, result, 200, 'Anotacao removida');
    } catch (error) {
      next(error);
    }
  };
}
