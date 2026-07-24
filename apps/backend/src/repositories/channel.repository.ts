import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';

const listingInclude = {
  product: {
    select: {
      id: true,
      name: true,
      sku: true,
      price: true,
      stock: true,
      isActive: true,
      images: { where: { isPrimary: true }, take: 1, select: { url: true } },
    },
  },
} satisfies Prisma.ChannelListingInclude;

export class ChannelRepository {
  async createChannel(data: Prisma.ChannelCreateInput) {
    return prisma.channel.create({ data });
  }

  async updateChannel(id: string, data: Prisma.ChannelUpdateInput) {
    return prisma.channel.update({ where: { id }, data });
  }

  async findChannelById(id: string) {
    return prisma.channel.findUnique({ where: { id } });
  }

  async findManyChannels(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ChannelWhereInput;
  }) {
    return prisma.channel.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countChannels(where?: Prisma.ChannelWhereInput) {
    return prisma.channel.count({ where });
  }

  async deleteChannel(id: string) {
    return prisma.channel.delete({ where: { id } });
  }

  /** Contagem de listings por status de sync, para todos os canais informados. */
  async listingCountsByChannel(channelIds: string[]) {
    if (channelIds.length === 0) return [];
    return prisma.channelListing.groupBy({
      by: ['channelId', 'syncStatus'],
      where: { channelId: { in: channelIds } },
      _count: { _all: true },
    });
  }

  async createListing(data: Prisma.ChannelListingCreateInput) {
    return prisma.channelListing.create({ data, include: listingInclude });
  }

  async updateListing(id: string, data: Prisma.ChannelListingUpdateInput) {
    return prisma.channelListing.update({ where: { id }, data, include: listingInclude });
  }

  async findListingById(id: string) {
    return prisma.channelListing.findUnique({ where: { id }, include: listingInclude });
  }

  async findListingByChannelAndProduct(channelId: string, productId: string) {
    return prisma.channelListing.findUnique({
      where: { channelId_productId: { channelId, productId } },
      include: listingInclude,
    });
  }

  async findManyListings(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ChannelListingWhereInput;
  }) {
    return prisma.channelListing.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      include: listingInclude,
      orderBy: { updatedAt: 'desc' },
    });
  }

  async countListings(where?: Prisma.ChannelListingWhereInput) {
    return prisma.channelListing.count({ where });
  }

  async deleteListing(id: string) {
    return prisma.channelListing.delete({ where: { id } });
  }

  /**
   * Estoque unificado: quando o estoque/preço de um produto muda, todos os
   * anúncios SYNCED daquele produto passam a OUT_OF_SYNC (defasados).
   */
  async markProductListingsOutOfSync(productId: string) {
    return prisma.channelListing.updateMany({
      where: { productId, syncStatus: 'SYNCED' },
      data: { syncStatus: 'OUT_OF_SYNC' },
    });
  }
}
