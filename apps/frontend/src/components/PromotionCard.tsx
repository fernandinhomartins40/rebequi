import { ArrowRight, Boxes, CalendarClock, Layers3 } from 'lucide-react';
import type { Promotion } from '@rebequi/shared/types';
import { Link } from 'react-router-dom';
import { PromotionCountdown } from '@/components/PromotionCountdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatPromotionWindow, getPromotionHref, getPromotionThemeClasses } from '@/lib/promotion-ui';

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
  const previewCategories = promotion.categories.slice(0, 3);
  const promotionHref = getPromotionHref(promotion.kind, promotion.slug);

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-[1.75rem] border transition-transform duration-300 hover:-translate-y-1',
        theme.shell,
        className,
      )}
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={promotion.image?.url || PROMOTION_IMAGE_FALLBACK}
          alt={promotion.image?.alt || promotion.title}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          loading="lazy"
        />
        <div className={cn('absolute inset-0 bg-gradient-to-b', theme.overlay)} />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Badge className={cn('border-none shadow-sm', theme.badge)}>
            {promotion.badgeText || 'Oferta especial'}
          </Badge>
          <span className="inline-flex items-center rounded-full border border-white/60 bg-white/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
            {promotion.productCount} itens
          </span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="space-y-2">
          {promotion.eyebrow ? (
            <p className={cn('text-xs font-semibold uppercase tracking-[0.24em]', theme.accent)}>{promotion.eyebrow}</p>
          ) : null}
          <div className="space-y-2">
            <h3 className="text-xl font-bold leading-tight text-foreground">{promotion.title}</h3>
            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
              {promotion.subtitle || promotion.description || 'Coleção promocional com curadoria especial para sua compra.'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {previewCategories.map((category) => (
            <span
              key={category}
              className={cn('inline-flex rounded-full border px-3 py-1 text-xs font-medium', theme.chip)}
            >
              {category}
            </span>
          ))}
          {promotion.categoryCount > previewCategories.length ? (
            <span className="inline-flex rounded-full border border-black/5 bg-white/80 px-3 py-1 text-xs font-medium text-foreground">
              +{promotion.categoryCount - previewCategories.length} categorias
            </span>
          ) : null}
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-2xl border border-black/5 bg-white/75 px-3 py-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <Boxes className="h-3.5 w-3.5" />
              {promotion.kind === 'single_product' ? 'Produto' : 'Produtos'}
            </div>
            <p className="mt-2 text-lg font-semibold text-foreground">{promotion.productCount}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white/75 px-3 py-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <Layers3 className="h-3.5 w-3.5" />
              Categorias
            </div>
            <p className="mt-2 text-lg font-semibold text-foreground">{promotion.categoryCount}</p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-white/75 px-3 py-3">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              Prazo
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-medium text-foreground">
              {formatPromotionWindow({
                startsAt: promotion.startsAt,
                expiresAt: promotion.expiresAt,
              })}
            </p>
          </div>
        </div>

        <PromotionCountdown expiresAt={promotion.expiresAt} compact />

        <Button asChild className="w-full justify-between rounded-2xl">
          <Link to={promotionHref}>
            {promotion.ctaLabel || 'Ver oferta'}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
