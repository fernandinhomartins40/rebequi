import { NextFunction, Request, Response } from 'express';
import type {
  AuthenticatedCheckoutOrderInput,
  OrderFiltersInput,
  PublicCheckoutOrderInput,
  UpdateOrderStatusInput,
} from '@rebequi/shared/schemas';
import { setAuthCookie } from '../utils/cookie.util.js';
import { UnauthorizedError } from '../utils/errors.util.js';
import { paginatedResponse, successResponse } from '../utils/response.util.js';
import { OrderService } from '../services/order.service.js';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  publicCheckout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload: PublicCheckoutOrderInput = req.body;
      const result = await this.orderService.checkoutPublicOrder(payload);

      if (result.token) {
        setAuthCookie(res, result.token);
      }

      successResponse(
        res,
        {
          order: result.order,
          provisionalCredentials: result.provisionalCredentials,
          user: result.user,
          whatsappMessage: result.whatsappMessage,
          whatsappUrl: result.whatsappUrl,
        },
        201,
        'Pedido registrado com sucesso'
      );
    } catch (error) {
      next(error);
    }
  };

  authenticatedCheckout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      const payload: AuthenticatedCheckoutOrderInput = req.body;
      const result = await this.orderService.checkoutAuthenticatedOrder(req.user.userId, payload);

      successResponse(
        res,
        {
          order: result.order,
          whatsappMessage: result.whatsappMessage,
          whatsappUrl: result.whatsappUrl,
        },
        201,
        'Pedido registrado com sucesso'
      );
    } catch (error) {
      next(error);
    }
  };

  markWhatsappRedirected = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) throw new UnauthorizedError('User not authenticated');
      const order = await this.orderService.markOrderWhatsappRedirected(req.params.id, req.user.userId);
      successResponse(res, order, 200, 'Pedido marcado como encaminhado para o WhatsApp');
    } catch (error) {
      next(error);
    }
  };

  listCustomerOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new UnauthorizedError('User not authenticated');
      }

      const orders = await this.orderService.listCustomerOrders(req.user.userId);
      successResponse(res, orders, 200);
    } catch (error) {
      next(error);
    }
  };

  listAdminOrders = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = req.query as unknown as OrderFiltersInput;
      const result = await this.orderService.listAdminOrders(filters, req.user);
      paginatedResponse(res, result.orders, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  };

  getAdminOrder = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await this.orderService.getAdminOrderById(req.params.id, req.user);
      successResponse(res, order, 200);
    } catch (error) {
      next(error);
    }
  };

  updateOrderStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload: UpdateOrderStatusInput = req.body;
      const order = await this.orderService.updateOrderStatus(req.params.id, payload, req.user);
      successResponse(res, order, 200, 'Pedido atualizado com sucesso');
    } catch (error) {
      next(error);
    }
  };
}
