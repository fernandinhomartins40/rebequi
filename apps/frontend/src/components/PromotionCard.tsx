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
  const previewCategories = promotion.categories.slice(0, 2);
  const promotionHref = getPromotionHref(promotion.kind, promotion.slug);
  const topBadgeLabel = getPromotionBadgeLabel(promotion) || 'Oferta especial';
  const commercialLabel =
    promotion.offerPricing?.shortLabel && promotion.offerPricing.shortLabel !== topBadgeLabel
      ? promotion.offerPricing.shortLabel
      : undefined;

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-[1.5rem] border transition-transform duration-300 hover:-translate-y-1',
        theme.shell,
        className,
      )}
    >
      <div className="relative aspect-[16/9] overflow-hidden">
        <img
          src={promotion.image?.url || PROMOTION_IMAGE_FALLBACK}
          alt={promotion.image?.alt || promotion.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className={cn('absolute inset-0 bg-gradient-to-b', theme.overlay)} />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-4">
          <Badge className={cn('border-none shadow-sm', theme.badge)}>{topBadgeLabel}</Badge>
          <span className="inline-flex items-center rounded-full border border-white/60 bg-white/88 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
            {promotion.productCount} itens
          </span>
        </div>
      </div>

      <div className="space-y-3.5 p-4">
        {promotion.eyebrow ? (
          <p className={cn('text-[11px] font-semibold uppercase tracking-[0.24em]', theme.accent)}>{promotion.eyebrow}</p>
        ) : null}

        <div className="space-y-1.5">
          <h3 className="line-clamp-2 text-lg font-bold leading-tight text-foreground">{promotion.title}</h3>
          <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
            {promotion.subtitle || promotion.description || 'Coleção promocional com curadoria especial para sua compra.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {commercialLabel ? (
            <span className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-medium', theme.chip)}>
              {commercialLabel}
            </span>
          ) : null}
          {previewCategories.map((category) => (
            <span key={category} className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-medium', theme.chip)}>
              {category}
            </span>
          ))}
          {promotion.categoryCount > previewCategories.length ? (
            <span className="inline-flex rounded-full border border-black/5 bg-white/80 px-3 py-1 text-xs font-medium text-foreground">
              +{promotion.categoryCount - previewCategories.length} categoria{promotion.categoryCount - previewCategories.length > 1 ? 's' : ''}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <PromotionCountdown expiresAt={promotion.expiresAt} compact className="w-fit" />

          <Button asChild size="sm" className="w-full rounded-xl sm:w-auto">
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
