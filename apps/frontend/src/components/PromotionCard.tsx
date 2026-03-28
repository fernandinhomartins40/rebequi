import { ArrowRight } from 'lucide-react';
import type { Promotion } from '@rebequi/shared/types';
import { Link } from 'react-router-dom';
import { PromotionCountdown } from '@/components/PromotionCountdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getPromotionBadgeLabel, getPromotionHref, getPromotionThemeClasses } from '@/lib/promotion-ui';
import { cn } from '@/lib/utils';

const PROMOTION_IMAGE_FALLBACK =
  'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1400&q=80';

export function PromotionCard({
  className,
  promotion,
}: {
  className?: string;
  promotion: Promotion;
}) {
  const theme = getPromotionThemeClasses(promotion.themeTone);
  const previewCategory = promotion.categories[0];
  const promotionHref = getPromotionHref(promotion.kind, promotion.slug);
  const topBadgeLabel = getPromotionBadgeLabel(promotion) || 'Oferta especial';
  const commercialLabel =
    promotion.offerPricing?.shortLabel && promotion.offerPricing.shortLabel !== topBadgeLabel
      ? promotion.offerPricing.shortLabel
      : undefined;
  const supportText =
    promotion.subtitle || promotion.description || 'Coleção promocional com curadoria especial para sua compra.';
  const contextLabel = commercialLabel || previewCategory;
  const itemSummary =
    promotion.productCount === 1 ? '1 item selecionado' : `${promotion.productCount} itens selecionados`;

  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-[1.5rem] border transition-transform duration-300 hover:-translate-y-1',
        theme.shell,
        className,
      )}
    >
      <Link to={promotionHref} className="relative block aspect-[16/10] overflow-hidden">
        <img
          src={promotion.image?.url || PROMOTION_IMAGE_FALLBACK}
          alt={promotion.image?.alt || promotion.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className={cn('absolute inset-0 bg-gradient-to-b', theme.overlay)} />
        <div className="absolute inset-x-0 top-0 p-4">
          <Badge className={cn('max-w-[70%] truncate border-none shadow-sm', theme.badge)}>{topBadgeLabel}</Badge>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-5">
        <div className="space-y-2">
          <h3 className="line-clamp-2 min-h-[3.5rem] text-lg font-bold leading-tight text-foreground">{promotion.title}</h3>
          <p className="line-clamp-2 min-h-[2.75rem] text-sm leading-6 text-muted-foreground">{supportText}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {contextLabel ? (
            <span className={cn('inline-flex max-w-full rounded-full border px-3 py-1 text-xs font-medium', theme.chip)}>
              <span className="truncate">{contextLabel}</span>
            </span>
          ) : null}
          <span className="text-xs font-medium text-muted-foreground">{itemSummary}</span>
        </div>

        <div className="mt-auto space-y-3 border-t border-black/5 pt-4">
          <PromotionCountdown expiresAt={promotion.expiresAt} compact className="w-full" />

          <Button asChild size="sm" className="w-full rounded-xl">
            <Link to={promotionHref}>
              {promotion.ctaLabel || 'Ver campanha'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
