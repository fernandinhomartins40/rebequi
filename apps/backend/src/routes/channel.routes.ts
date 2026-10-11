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
import { beginMercadoLivreAuthorization, finishMercadoLivreAuthorization } from '../services/channels/mercado-livre-auth.service.js';
import { getIntegrationOperations, retryIntegrationJob } from '../services/integration-operations.service.js';
import { beginMagaluAuthorization, finishMagaluAuthorization } from '../services/channels/magalu-auth.service.js';

const router: Router = Router();
const channelController = new ChannelController();
const channelRoles = getRolesForMerchantPermission('channels:manage');

const auth = [authenticate, authorize(...channelRoles)] as const;

router.get('/admin/operations', ...auth, async (_req, res, next) => {
  try { res.json({ success: true, data: await getIntegrationOperations() }); }
  catch (error) { next(error); }
});
router.post('/admin/operations/:jobId/retry', ...auth, async (req, res, next) => {
  try { res.json({ success: true, data: await retryIntegrationJob(req.params.jobId, req.user!.userId) }); }
  catch (error) { next(error); }
});

router.post('/admin/:id/authorize', ...auth, async (req, res, next) => {
  try { res.json({ success: true, data: await beginMercadoLivreAuthorization(req.params.id, req.user!.userId) }); }
  catch (error) { next(error); }
});
router.post('/admin/:id/authorize-magalu', ...auth, async (req, res, next) => {
  try { res.json({ success: true, data: await beginMagaluAuthorization(req.params.id, req.user!.userId) }); }
  catch (error) { next(error); }
});
router.get('/oauth/magalu/callback', ...auth, async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer');
  try {
    const id = await finishMagaluAuthorization(String(req.query.state ?? ''), String(req.query.code ?? ''), req.user!.userId);
    res.redirect(`/painel-lojista/painel/canais/${encodeURIComponent(id)}?connected=1`);
  } catch (error) { next(error); }
});
router.get('/oauth/mercado-livre/callback', ...auth, async (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  try {
    const id = await finishMercadoLivreAuthorization(String(req.query.state ?? ''), String(req.query.code ?? ''), req.user!.userId);
    res.redirect(`/painel-lojista/painel/canais/${encodeURIComponent(id)}?connected=1`);
  } catch (error) { next(error); }
});

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
