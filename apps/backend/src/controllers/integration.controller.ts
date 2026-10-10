import { NextFunction, Request, Response } from 'express';
import type { QuoteAiUpdateBody, QuoteAiTestBody } from '@rebequi/shared/schemas';
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

  getAi = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const config = await this.settingsService.getAiPublic();
      successResponse(res, config, 200);
    } catch (error) {
      next(error);
    }
  };

  updateAi = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as QuoteAiUpdateBody;
      const config = await this.settingsService.updateAi(body);
      successResponse(res, config, 200, 'IA de orçamentos atualizada');
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

  testProvider = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = (req.body ?? {}) as QuoteAiTestBody;
      const result = await this.settingsService.testProvider(body.provider);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };
}
