import { NextFunction, Request, Response } from 'express';
import type { OpenRouterUpdateBody, OpenRouterTestBody } from '@rebequi/shared/schemas';
import { IntegrationSettingsService } from '../services/integration-settings.service.js';
import { successResponse } from '../utils/response.util.js';

export class IntegrationController {
  private settingsService: IntegrationSettingsService;

  constructor() {
    this.settingsService = new IntegrationSettingsService();
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
