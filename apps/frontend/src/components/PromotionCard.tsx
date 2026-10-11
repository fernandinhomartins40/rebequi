import { ArrowRight } from 'lucide-react';
import type { Promotion } from '@rebequi/shared/types';
import { Link } from 'react-router-dom';
import { PromotionCountdown } from '@/components/PromotionCountdown';
import { Button } from '@/components/ui/button';
import { getPromotionBadgeLabel, getPromotionHref } from '@/lib/promotion-ui';
import { cn } from '@/lib/utils';

const PROMOTION_IMAGE_FALLBACK =
  '/placeholder.svg';

export function PromotionCard({
  className,
  promotion,
}: {
  className?: string;
  promotion: Promotion;
}) {
  const previewCategory = promotion.categories[0];
  const promotionHref = getPromotionHref(promotion.kind, promotion.slug);
  const topBadgeLabel = getPromotionBadgeLabel(promotion) || 'Oferta especial';
  const supportText =
    promotion.subtitle || promotion.description || 'Confira os produtos em destaque nesta campanha.';
  const itemSummary =
    promotion.productCount === 1 ? '1 item' : `${promotion.productCount} itens`;

  return (
    <article
      className={cn(
        'group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/70 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md',
        className,
      )}
    >
      {/* Imagem */}
      <Link to={promotionHref} className="relative block aspect-[16/10] overflow-hidden bg-slate-100">
        <img
          src={promotion.image?.url || PROMOTION_IMAGE_FALLBACK}
          alt={promotion.image?.alt || promotion.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        {/* Badge sobreposto */}
        <div className="absolute left-3 top-3">
          <span className="inline-flex items-center rounded-full bg-brand-yellow px-2.5 py-1 text-[11px] font-bold text-foreground shadow-sm">
            {topBadgeLabel}
          </span>
        </div>
      </Link>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col p-4">
        <div className="space-y-1.5">
          <h3 className="line-clamp-2 text-base font-bold leading-snug text-foreground">
            {promotion.title}
          </h3>
          <p className="line-clamp-2 text-sm text-muted-foreground">{supportText}</p>
        </div>

        {/* Categoria + contagem */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {previewCategory ? (
            <span className="inline-flex max-w-[10rem] truncate rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-foreground">
              {previewCategory}
            </span>
          ) : null}
          <span className="text-[11px] text-muted-foreground">{itemSummary} selecionados</span>
        </div>

        {/* Countdown + CTA */}
        <div className="mt-auto space-y-3 border-t border-slate-100 pt-4">
          <PromotionCountdown expiresAt={promotion.expiresAt} compact className="w-full" />

          <Button asChild size="sm" className="w-full gap-1.5">
            <Link to={promotionHref}>
              {promotion.ctaLabel || 'Ver oferta'}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
