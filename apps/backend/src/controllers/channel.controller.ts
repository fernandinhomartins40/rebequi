import { NextFunction, Request, Response } from 'express';
import type {
  ChannelFiltersInput,
  CreateChannelInput,
  ListingFiltersInput,
  PublishListingInput,
  UpdateChannelInput,
} from '@rebequi/shared/schemas';
import { paginatedResponse, successResponse } from '../utils/response.util.js';
import { ChannelService } from '../services/channel.service.js';

export class ChannelController {
  private channelService: ChannelService;

  constructor() {
    this.channelService = new ChannelService();
  }

  listChannels = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = req.query as unknown as ChannelFiltersInput;
      const result = await this.channelService.listChannels(filters);
      paginatedResponse(res, result.channels, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  };

  getChannel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const channel = await this.channelService.getChannel(req.params.id);
      successResponse(res, channel, 200);
    } catch (error) {
      next(error);
    }
  };

  createChannel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload: CreateChannelInput = req.body;
      const channel = await this.channelService.createChannel(payload);
      successResponse(res, channel, 201, 'Canal criado com sucesso');
    } catch (error) {
      next(error);
    }
  };

  updateChannel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload: UpdateChannelInput = req.body;
      const channel = await this.channelService.updateChannel(req.params.id, payload);
      successResponse(res, channel, 200, 'Canal atualizado com sucesso');
    } catch (error) {
      next(error);
    }
  };

  deleteChannel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.channelService.deleteChannel(req.params.id);
      successResponse(res, result, 200, 'Canal removido');
    } catch (error) {
      next(error);
    }
  };

  testChannel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.channelService.testChannel(req.params.id);
      successResponse(res, result, 200);
    } catch (error) {
      next(error);
    }
  };

  syncChannel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.channelService.syncChannel(req.params.id);
      successResponse(res, result, 200, result.message);
    } catch (error) {
      next(error);
    }
  };

  listListings = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const filters = req.query as unknown as ListingFiltersInput;
      const result = await this.channelService.listListings(req.params.id, filters);
      paginatedResponse(res, result.listings, result.page, result.limit, result.total);
    } catch (error) {
      next(error);
    }
  };

  publishListing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const payload: PublishListingInput = req.body;
      const result = await this.channelService.publishListing(req.params.id, payload.productId);
      successResponse(res, result, 201, result.message);
    } catch (error) {
      next(error);
    }
  };

  syncListing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.channelService.assertListingChannel(req.params.id, req.params.listingId);
      const result = await this.channelService.syncListing(req.params.listingId);
      successResponse(res, result, 200, result.message);
    } catch (error) {
      next(error);
    }
  };

  removeListing = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.channelService.assertListingChannel(req.params.id, req.params.listingId);
      const result = await this.channelService.removeListing(req.params.listingId);
      successResponse(res, result, 200, 'Anuncio removido');
    } catch (error) {
      next(error);
    }
  };
}
