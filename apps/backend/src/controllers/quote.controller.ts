import { NextFunction, Request, Response } from 'express';
import type {
  LeadFiltersInput,
  QuoteFiltersInput,
  StartLeadInput,
  UpdateLeadStatusInput,
  UpdateQuoteDraftInput,
  UpdateQuoteStatusInput,
} from '@rebequi/shared/schemas';
import { QuoteService } from '../services/quote.service.js';
import { UnauthorizedError } from '../utils/errors.util.js';
import { setAuthCookie } from '../utils/cookie.util.js';
import { paginatedResponse, successResponse } from '../utils/response.util.js';

function getRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] || '';
  }

  return value || '';
}

function parseNumber(value: unknown) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  const numericValue = Number(value);
  return Number.isNaN(numericValue) ? undefined : numericValue;
}

export class QuoteController {
  private quoteService: QuoteService;

  constructor() {
    this.quoteService = new QuoteService();
  }

  startPublicLead = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const data: StartLeadInput = req.body;
      const result = await this.quoteService.startPublicLead(data);
      successResponse(res, result, 201, 'Lead captured successfully');
    } catch (error) {
      next(error);
    }
  };

  processPublicDocument = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const leadId = String(req.body.leadId || '');
      const result = await this.quoteService.processPublicDocument({
        leadId,
        file: req.file,
        width: parseNumber(req.body.width),
        height: parseNumber(req.body.height),
      });

      setAuthCookie(res, result.token);
      successResponse(
        res,
        {
          lead: result.lead,
          quote: result.quote,
          user: result.user,
        },
        201,
        'Quote draft created successfully'
      );
    } catch (error) {
      next(error);
    }
  };

  createAuthenticatedDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      const result = await this.quoteService.createDraftFromAuthenticatedUser({
        userId: req.user.userId,
        file: req.file,
        width: parseNumber(req.body.width),
        height: parseNumber(req.body.height),
      });

      successResponse(res, result, 201, 'Quote draft created successfully');
    } catch (error) {
      next(error);
    }
  };

  getCustomerQuotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      const result = await this.quoteService.getCustomerQuotes(req.user.userId);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  updateCustomerDraft = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      const id = getRouteParam(req.params.id);
      const data: UpdateQuoteDraftInput = req.body;
      const result = await this.quoteService.updateCustomerDraft(req.user.userId, id, data);
      successResponse(res, result, 200, 'Quote draft updated successfully');
    } catch (error) {
      next(error);
    }
  };

  submitCustomerQuote = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      const id = getRouteParam(req.params.id);
      const result = await this.quoteService.submitCustomerQuote(req.user.userId, id);
      successResponse(res, result, 200, 'Quote submitted successfully');
    } catch (error) {
      next(error);
    }
  };

  getAdminQuotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      } as QuoteFiltersInput;

      const result = await this.quoteService.getAdminQuotes(filters);
      paginatedResponse(res, result.quotes, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  };

  getCapturedLeads = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = {
        status: req.query.status as string | undefined,
        page: req.query.page ? Number(req.query.page) : 1,
        limit: req.query.limit ? Number(req.query.limit) : 20,
      } as LeadFiltersInput;

      const result = await this.quoteService.getCapturedLeads(filters);
      paginatedResponse(res, result.leads, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  };

  updateQuoteStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getRouteParam(req.params.id);
      const data: UpdateQuoteStatusInput = req.body;
      const result = await this.quoteService.updateQuoteStatus(id, data);
      successResponse(res, result, 200, 'Quote status updated successfully');
    } catch (error) {
      next(error);
    }
  };

  updateLeadStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = getRouteParam(req.params.id);
      const data: UpdateLeadStatusInput = req.body;
      const result = await this.quoteService.updateLeadStatus(id, data);
      successResponse(res, result, 200, 'Lead status updated successfully');
    } catch (error) {
      next(error);
    }
  };
}
