import { Prisma } from '@prisma/client';
import type {
  ChannelFiltersInput,
  CreateChannelInput,
  ListingFiltersInput,
  UpdateChannelInput,
} from '@rebequi/shared/schemas';
import { ChannelRepository } from '../repositories/channel.repository.js';
import { ProductRepository } from '../repositories/product.repository.js';
import { decryptSecret, encryptSecret } from '../utils/crypto.util.js';
import { NotFoundError, ValidationError } from '../utils/errors.util.js';
import { logger } from '../utils/logger.util.js';
import { getChannelAdapter, type ChannelCredentials, type ListingProductSnapshot } from './channels/index.js';
import { getMercadoLivreCredentials } from './channels/mercado-livre-auth.service.js';
import { getCloudCredentials } from './channels/cloud-credentials.service.js';

type PersistedChannel = NonNullable<Awaited<ReturnType<ChannelRepository['findChannelById']>>>;
type PersistedListing = NonNullable<Awaited<ReturnType<ChannelRepository['findListingById']>>>;

export class ChannelService {
  private repository: ChannelRepository;
  private productRepository: ProductRepository;

  constructor() {
    this.repository = new ChannelRepository();
    this.productRepository = new ProductRepository();
  }

  // ── Channels ──────────────────────────────────────────────────────────────

  async listChannels(filters: ChannelFiltersInput) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.ChannelWhereInput = {};
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;

    const [channels, total] = await Promise.all([
      this.repository.findManyChannels({ skip, take: limit, where }),
      this.repository.countChannels(where),
    ]);

    const counts = await this.repository.listingCountsByChannel(channels.map((c) => c.id));

    return {
      channels: channels.map((channel) => this.formatChannel(channel, counts)),
      limit,
      page,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getChannel(id: string) {
    const channel = await this.repository.findChannelById(id);
    if (!channel) throw new NotFoundError('Canal nao encontrado');
    const counts = await this.repository.listingCountsByChannel([id]);
    return this.formatChannel(channel, counts);
  }

  async createChannel(data: CreateChannelInput) {
    const channel = await this.repository.createChannel({
      type: data.type,
      name: data.name.trim(),
      externalId: data.externalId?.trim() || null,
      credentials: data.credentials ? this.encryptCredentials(data.credentials) : null,
      status: 'DISCONNECTED',
    });
    return this.formatChannel(channel, []);
  }

  async updateChannel(id: string, data: UpdateChannelInput) {
    const channel = await this.repository.findChannelById(id);
    if (!channel) throw new NotFoundError('Canal nao encontrado');

    const update: Prisma.ChannelUpdateInput = {};
    if (data.name !== undefined) update.name = data.name.trim();
    if (data.externalId !== undefined) update.externalId = data.externalId?.trim() || null;
    if (data.isActive !== undefined) update.isActive = data.isActive;
    if (data.credentials !== undefined) {
      update.credentials = this.encryptCredentials(data.credentials);
      update.status = 'DISCONNECTED';
    }

    const updated = await this.repository.updateChannel(id, update);
    const counts = await this.repository.listingCountsByChannel([id]);
    return this.formatChannel(updated, counts);
  }

  async deleteChannel(id: string) {
    const channel = await this.repository.findChannelById(id);
    if (!channel) throw new NotFoundError('Canal nao encontrado');
    // Preserve bindings and commercial history; disconnect rather than cascade-delete.
    await this.repository.updateChannel(id, { isActive: false, status: 'DISCONNECTED', credentials: null });
    return { deleted: true };
  }

  async testChannel(id: string) {
    const channel = await this.repository.findChannelById(id);
    if (!channel) throw new NotFoundError('Canal nao encontrado');

    const adapter = getChannelAdapter(channel.type);
    const credentials = channel.type === 'MERCADO_LIVRE' ? await getMercadoLivreCredentials(channel.id)
      : channel.type === 'AMAZON' || channel.type === 'MAGALU' ? await getCloudCredentials(channel.id, channel.type) : this.decryptCredentials(channel);
    const result = await adapter.testConnection(credentials);

    await this.repository.updateChannel(id, {
      status: result.ok ? 'CONNECTED' : 'ERROR',
      lastError: result.ok ? null : result.message,
      ...(result.externalId ? { externalId: result.externalId } : {}),
    });

    return result;
  }

  // ── Listings ──────────────────────────────────────────────────────────────

  async listListings(channelId: string, filters: ListingFiltersInput) {
    const channel = await this.repository.findChannelById(channelId);
    if (!channel) throw new NotFoundError('Canal nao encontrado');

    const page = filters.page ?? 1;
    const limit = filters.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: Prisma.ChannelListingWhereInput = { channelId };
    if (filters.syncStatus) where.syncStatus = filters.syncStatus;
    if (filters.search?.trim()) {
      const search = filters.search.trim();
      where.product = {
        is: {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
          ],
        },
      };
    }

    const [listings, total] = await Promise.all([
      this.repository.findManyListings({ skip, take: limit, where }),
      this.repository.countListings(where),
    ]);

    return {
      limit,
      listings: listings.map((listing) => this.formatListing(listing)),
      page,
      total,
      totalPages: Math.ceil(total / limit),
    };
  }

  async publishListing(channelId: string, productId: string) {
    const channel = await this.repository.findChannelById(channelId);
    if (!channel) throw new NotFoundError('Canal nao encontrado');
    if (!channel.isActive) throw new ValidationError('Ative o canal antes de publicar.');

    const product = await this.productRepository.findById(productId);
    if (!product) throw new NotFoundError('Produto nao encontrado');
    if (!product.isActive) throw new ValidationError('Ative o produto antes de publicá-lo em um canal.');

    const existing = await this.repository.findListingByChannelAndProduct(channelId, productId);
    if (existing) {
      throw new ValidationError('Este produto já está vinculado a este canal.');
    }

    const snapshot = this.toSnapshot(product);
    const adapter = getChannelAdapter(channel.type);
    const result = await adapter.publishListing(this.decryptCredentials(channel), snapshot);
    if (!result.ok) throw new ValidationError(result.message);

    const listing = await this.repository.createListing({
      channel: { connect: { id: channelId } },
      product: { connect: { id: productId } },
      externalListingId: result.externalListingId ?? null,
      externalUrl: result.externalUrl ?? null,
      syncStatus: result.ok ? 'SYNCED' : 'ERROR',
      publishedPrice: result.ok ? snapshot.price : null,
      publishedStock: result.ok ? snapshot.stock : null,
      lastSyncedAt: result.ok ? new Date() : null,
      lastError: result.ok ? null : result.message,
    });

    return { listing: this.formatListing(listing), message: result.message };
  }

  async syncListing(listingId: string) {
    const listing = await this.repository.findListingById(listingId);
    if (!listing) throw new NotFoundError('Anuncio nao encontrado');

    const channel = await this.repository.findChannelById(listing.channelId);
    if (!channel) throw new NotFoundError('Canal nao encontrado');
    if (!channel.isActive) throw new ValidationError('Canal desativado. Nenhuma alteração foi enviada.');

    const product = await this.productRepository.findById(listing.productId);
    if (!product) throw new NotFoundError('Produto nao encontrado');

    const snapshot = this.toSnapshot(product);
    const adapter = getChannelAdapter(channel.type);
    const result = await adapter.syncListing(this.decryptCredentials(channel), listing.externalListingId, snapshot);

    const updated = await this.repository.updateListing(listingId, {
      syncStatus: result.ok ? 'SYNCED' : 'ERROR',
      publishedPrice: result.ok ? snapshot.price : listing.publishedPrice,
      publishedStock: result.ok ? snapshot.stock : listing.publishedStock,
      lastSyncedAt: result.ok ? new Date() : listing.lastSyncedAt,
      lastError: result.ok ? null : result.message,
    });

    return { listing: this.formatListing(updated), message: result.message };
  }

  async assertListingChannel(channelId: string, listingId: string) {
    const listing = await this.repository.findListingById(listingId);
    if (!listing || listing.channelId !== channelId) throw new NotFoundError('Anúncio não encontrado neste canal');
  }

  /** Sincroniza todos os anúncios defasados de um canal de uma vez. */
  async syncChannel(channelId: string) {
    const channel = await this.repository.findChannelById(channelId);
    if (!channel) throw new NotFoundError('Canal nao encontrado');

    const pending = await this.repository.findManyListings({
      where: { channelId, syncStatus: { in: ['OUT_OF_SYNC', 'ERROR', 'DRAFT'] } },
      take: 500,
    });

    let synced = 0;
    let failed = 0;
    for (const listing of pending) {
      try {
        const result = await this.syncListing(listing.id);
        if (result.listing.syncStatus === 'SYNCED') synced += 1;
        else failed += 1;
      } catch (error) {
        failed += 1;
        logger.error('Falha ao sincronizar anúncio', { listingId: listing.id, error });
      }
    }

    await this.repository.updateChannel(channelId, { lastSyncedAt: new Date() });

    return {
      channelId,
      synced,
      failed,
      message: `${synced} anúncio(s) sincronizado(s)${failed > 0 ? `, ${failed} com falha` : ''}.`,
    };
  }

  async removeListing(listingId: string) {
    const listing = await this.repository.findListingById(listingId);
    if (!listing) throw new NotFoundError('Anuncio nao encontrado');

    const channel = await this.repository.findChannelById(listing.channelId);
    if (channel) {
      const adapter = getChannelAdapter(channel.type);
      const result = await adapter.removeListing(this.decryptCredentials(channel), listing.externalListingId);
      if (!result.ok) throw new ValidationError(result.message);
    }

    await this.repository.deleteListing(listingId);
    return { deleted: true };
  }

  /**
   * Estoque unificado: chamado pelos fluxos que alteram estoque/preço (venda) para
   * marcar os anúncios do produto como defasados. Falha aqui não deve derrubar a
   * venda — por isso é best-effort.
   */
  async markProductDirty(productId: string) {
    try {
      await this.repository.markProductListingsOutOfSync(productId);
    } catch (error) {
      logger.error('Falha ao marcar anúncios como defasados', { productId, error });
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  private toSnapshot(product: {
    id: string;
    name: string;
    sku: string | null;
    price: number;
    stock: number;
    reservedStock?: number;
    description: string | null;
  }): ListingProductSnapshot {
    return {
      productId: product.id,
      name: product.name,
      sku: product.sku,
      price: product.price,
      stock: Math.max(0, product.stock - (product.reservedStock ?? 0)),
      description: product.description,
    };
  }

  private encryptCredentials(credentials: ChannelCredentials): string {
    return encryptSecret(JSON.stringify(credentials));
  }

  private decryptCredentials(channel: PersistedChannel): ChannelCredentials {
    if (!channel.credentials) return {};
    try {
      return JSON.parse(decryptSecret(channel.credentials)) as ChannelCredentials;
    } catch (error) {
      logger.error('Falha ao decriptar credenciais do canal', { channelId: channel.id, error });
      return {};
    }
  }

  private formatChannel(
    channel: PersistedChannel,
    counts: Array<{ channelId: string; syncStatus: string; _count: { _all: number } }>
  ) {
    const own = counts.filter((c) => c.channelId === channel.id);
    const by = (status: string) => own.find((c) => c.syncStatus === status)?._count._all ?? 0;
    const total = own.reduce((sum, c) => sum + c._count._all, 0);

    return {
      id: channel.id,
      type: channel.type,
      name: channel.name,
      status: channel.status,
      externalId: channel.externalId,
      isActive: channel.isActive,
      hasCredentials: Boolean(channel.credentials),
      capabilities: {
        accountAuthorization: channel.type === 'MERCADO_LIVRE' || channel.type === 'MAGALU',
        accountValidation: channel.type !== 'MANUAL' && channel.type !== 'SHOPEE',
        publish: channel.type === 'MANUAL', sync: channel.type === 'MANUAL',
        mode: channel.type === 'MANUAL' ? 'manual' : channel.type === 'SHOPEE' ? 'pending' : 'account-only',
      },
      lastSyncedAt: channel.lastSyncedAt,
      lastError: channel.lastError,
      listingCounts: {
        total,
        synced: by('SYNCED'),
        outOfSync: by('OUT_OF_SYNC'),
        draft: by('DRAFT'),
        error: by('ERROR'),
      },
      createdAt: channel.createdAt,
      updatedAt: channel.updatedAt,
    };
  }

  private formatListing(listing: PersistedListing) {
    return {
      id: listing.id,
      channelId: listing.channelId,
      productId: listing.productId,
      product: listing.product
        ? {
            id: listing.product.id,
            name: listing.product.name,
            sku: listing.product.sku,
            price: listing.product.price,
            stock: Math.max(0, listing.product.stock - listing.product.reservedStock),
            isActive: listing.product.isActive,
            imageUrl: listing.product.images?.[0]?.url ?? null,
          }
        : null,
      externalListingId: listing.externalListingId,
      externalUrl: listing.externalUrl,
      syncStatus: listing.syncStatus,
      publishedPrice: listing.publishedPrice,
      publishedStock: listing.publishedStock,
      lastSyncedAt: listing.lastSyncedAt,
      lastError: listing.lastError,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
    };
  }
}
