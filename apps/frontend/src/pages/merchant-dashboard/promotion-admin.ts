import type { Promotion, PromotionKind, PromotionResponse, PromotionStatus } from '@rebequi/shared/types';
import { fetchAdminPromotions } from '@/services/api/promotions';

const SNAPSHOT_PAGE_SIZE = 100;

const PROMOTION_STATUS_PRIORITY: Record<PromotionStatus, number> = {
  active: 0,
  scheduled: 1,
  inactive: 2,
  expired: 3,
};

function getPromotionPrimaryProductId(promotion: Promotion) {
  return promotion.primaryProduct?.id || promotion.products?.[0]?.id;
}

function comparePromotionsForQuickAccess(left: Promotion, right: Promotion) {
  const statusDelta = PROMOTION_STATUS_PRIORITY[left.status] - PROMOTION_STATUS_PRIORITY[right.status];
  if (statusDelta !== 0) {
    return statusDelta;
  }

  return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
}

export async function fetchAllAdminPromotionsSnapshot(kind: PromotionKind): Promise<PromotionResponse> {
  const firstPage = await fetchAdminPromotions({ kind, page: 1, limit: SNAPSHOT_PAGE_SIZE });
  const totalPages = firstPage.totalPages ?? Math.max(1, Math.ceil(firstPage.total / SNAPSHOT_PAGE_SIZE));

  if (totalPages <= 1) {
    return firstPage;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchAdminPromotions({ kind, page: index + 2, limit: SNAPSHOT_PAGE_SIZE }),
    ),
  );

  return {
    ...firstPage,
    promotions: [firstPage.promotions, ...remainingPages.map((page) => page.promotions)].flat(),
  };
}

export function pickPrimaryPromotion(promotions: Promotion[]) {
  return [...promotions].sort(comparePromotionsForQuickAccess)[0];
}

export function buildSingleProductOfferMap(promotions: Promotion[]) {
  const groupedOffers = new Map<string, Promotion[]>();

  promotions.forEach((promotion) => {
    const productId = getPromotionPrimaryProductId(promotion);
    if (!productId) {
      return;
    }

    const currentOffers = groupedOffers.get(productId) ?? [];
    currentOffers.push(promotion);
    currentOffers.sort(comparePromotionsForQuickAccess);
    groupedOffers.set(productId, currentOffers);
  });

  return groupedOffers;
}
