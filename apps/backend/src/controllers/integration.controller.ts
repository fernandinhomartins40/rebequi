import { NextFunction, Request, Response } from 'express';
import type { OpenRouterUpdateBody, OpenRouterTestBody } from '@rebequi/shared/schemas';
import { ProductRepository } from '../repositories/product.repository.js';
import { IntegrationSettingsService } from '../services/integration-settings.service.js';
import { ValidationError } from '../utils/errors.util.js';
import { successResponse } from '../utils/response.util.js';

export class IntegrationController {
  private settingsService: IntegrationSettingsService;
  private productRepository: ProductRepository;

  constructor() {
    this.settingsService = new IntegrationSettingsService();
    this.productRepository = new ProductRepository();
  }

  getOpenRouter = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const config = await this.settingsService.getOpenRouterPublic();
      successResponse(res, config, 200);
    } catch (error) {
      next(error);
    }
  };

  updateOpenRouter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as OpenRouterUpdateBody;
      const config = await this.settingsService.updateOpenRouter({
        enabled: body.enabled,
        apiKey:
          body.apiKey === undefined
            ? undefined
            : body.apiKey === null || body.apiKey === ''
              ? null
              : body.apiKey,
        primaryModel: body.primaryModel,
        fallbackModel: body.fallbackModel,
        timeoutMs: body.timeoutMs,
        referer: body.referer,
        title: body.title,
      });
      successResponse(res, config, 200, 'OpenRouter atualizado');
    } catch (error) {
      next(error);
    }
  };

  /** Prova de ponta a ponta: roda a cadeia real sobre uma imagem enviada. */
  testRecognition = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        throw new ValidationError('Envie uma imagem de lista para testar a leitura.');
      }

      const catalog = await this.productRepository.findCatalogForMatching();
      const result = await this.settingsService.testRecognition(
        Buffer.from(req.file.buffer),
        catalog.map((product) => ({ id: product.id, name: product.name }))
      );

      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  listVisionModels = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const models = await this.settingsService.listVisionModels();
      successResponse(res, models, 200);
    } catch (error) {
      next(error);
    }
  };

  testOpenRouter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = (req.body ?? {}) as OpenRouterTestBody;
      const result = await this.settingsService.testOpenRouter(body.apiKey);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };
}
