import { Router } from 'express';
import { getRolesForMerchantPermission } from '@rebequi/shared/constants';
import {
  channelFiltersSchema,
  createChannelSchema,
  listingFiltersSchema,
  publishListingSchema,
  updateChannelSchema,
} from '@rebequi/shared/schemas';
import { ChannelController } from '../controllers/channel.controller.js';
import { authenticate, authorize } from '../middleware/auth.middleware.js';
import { validateBody, validateQuery } from '../middleware/validation.middleware.js';

const router: Router = Router();
const channelController = new ChannelController();
const channelRoles = getRolesForMerchantPermission('channels:manage');

const auth = [authenticate, authorize(...channelRoles)] as const;

// Channels
router.get('/admin/list', ...auth, validateQuery(channelFiltersSchema), channelController.listChannels);
router.post('/admin', ...auth, validateBody(createChannelSchema), channelController.createChannel);
router.get('/admin/:id', ...auth, channelController.getChannel);
router.patch('/admin/:id', ...auth, validateBody(updateChannelSchema), channelController.updateChannel);
router.delete('/admin/:id', ...auth, channelController.deleteChannel);
router.post('/admin/:id/test', ...auth, channelController.testChannel);
router.post('/admin/:id/sync', ...auth, channelController.syncChannel);

// Listings (nested under a channel)
router.get('/admin/:id/listings', ...auth, validateQuery(listingFiltersSchema), channelController.listListings);
router.post('/admin/:id/listings', ...auth, validateBody(publishListingSchema), channelController.publishListing);
router.post('/admin/:id/listings/:listingId/sync', ...auth, channelController.syncListing);
router.delete('/admin/:id/listings/:listingId', ...auth, channelController.removeListing);

export default router;
