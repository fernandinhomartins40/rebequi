import { NextFunction, Request, Response } from 'express';
import type {
  CreateSaleInput,
  RevenueSummaryQueryInput,
  SaleFiltersInput,
  UpdateSaleStatusInput,
} from '@rebequi/shared/schemas';
import { paginatedResponse, successResponse } from '../utils/response.util.js';
import { SaleService } from '../services/sale.service.js';

export class SaleController {
  private saleService: SaleService;

  constructor() {
    this.saleService = new SaleService();
  }

  createSale = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload: CreateSaleInput = req.body;
      const sale = await this.saleService.createSale(req.user?.userId, payload);
      successResponse(res, sale, 201, 'Venda registrada com sucesso');
    } catch (error) {
      next(error);
    }
  };

  listSales = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = req.query as unknown as SaleFiltersInput;
      const result = await this.saleService.listSales(filters);
      paginatedResponse(res, result.sales, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  };

  getSale = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const sale = await this.saleService.getSaleById(req.params.id);
      successResponse(res, sale, 200);
    } catch (error) {
      next(error);
    }
  };

  updateSaleStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload: UpdateSaleStatusInput = req.body;
      const sale = await this.saleService.updateSaleStatus(req.params.id, payload, req.user!.userId);
      successResponse(res, sale, 200, 'Venda atualizada com sucesso');
    } catch (error) {
      next(error);
    }
  };

  getRevenueSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = req.query as unknown as RevenueSummaryQueryInput;
      const summary = await this.saleService.getRevenueSummary(query);
      successResponse(res, summary, 200);
    } catch (error) {
      next(error);
    }
  };
}
