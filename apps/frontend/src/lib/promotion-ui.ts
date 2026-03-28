import type { Product, Promotion, PromotionKind, PromotionOfferPricing, PromotionStatus, PromotionTheme } from '@rebequi/shared/types';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const percentageFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function formatPercentage(value: number) {
  return percentageFormatter.format(value);
}

function roundCurrency(value: number) {
  return Number(value.toFixed(2));
}

function getComputedPromotionPricing(offerPricing: PromotionOfferPricing, referencePrice: number) {
  switch (offerPricing.mode) {
    case 'fixed_price': {
      if (offerPricing.promotionalPrice === undefined) {
        return undefined;
      }

      const promotionalPrice = offerPricing.promotionalPrice;
      const hasDiscount = promotionalPrice < referencePrice;

      return {
        price: promotionalPrice,
        originalPrice: hasDiscount ? referencePrice : undefined,
        discount: hasDiscount ? Math.round(((referencePrice - promotionalPrice) / referencePrice) * 100) : undefined,
        offerSummary: `Cada item sai por ${formatCurrency(promotionalPrice)}.`,
      };
    }
    case 'percentage_discount': {
      if (offerPricing.discountPercentage === undefined) {
        return undefined;
      }

      const effectiveUnitPrice = roundCurrency(referencePrice * (1 - offerPricing.discountPercentage / 100));

      return {
        price: effectiveUnitPrice,
        originalPrice: referencePrice,
        discount: Math.round(offerPricing.discountPercentage),
        offerSummary: `${formatPercentage(offerPricing.discountPercentage)}% de desconto neste item.`,
      };
    }
    case 'buy_x_pay_y': {
      if (!offerPricing.minimumQuantity || !offerPricing.payQuantity) {
        return undefined;
      }

      const effectiveUnitPrice = roundCurrency((referencePrice * offerPricing.payQuantity) / offerPricing.minimumQuantity);

      return {
        price: effectiveUnitPrice,
        originalPrice: referencePrice,
        discount: Math.round(100 - (offerPricing.payQuantity / offerPricing.minimumQuantity) * 100),
        offerSummary: `Leve ${offerPricing.minimumQuantity} e pague ${offerPricing.payQuantity}.`,
      };
    }
    case 'bulk_percentage': {
      if (!offerPricing.minimumQuantity || offerPricing.discountPercentage === undefined) {
        return undefined;
      }

      const effectiveUnitPrice = roundCurrency(referencePrice * (1 - offerPricing.discountPercentage / 100));

      return {
        price: effectiveUnitPrice,
        originalPrice: referencePrice,
        discount: Math.round(offerPricing.discountPercentage),
        offerSummary: `A partir de ${offerPricing.minimumQuantity} unidades, este item sai por ${formatCurrency(effectiveUnitPrice)}.`,
      };
    }
    default:
      return undefined;
  }
}

export function getPromotionThemeClasses(themeTone: PromotionTheme) {
  switch (themeTone) {
    case 'blue':
      return {
        shell:
          'border-blue-200 bg-[linear-gradient(180deg,rgba(239,246,255,0.96),rgba(255,255,255,0.98))] shadow-[0_24px_60px_-44px_rgba(37,99,235,0.35)]',
        badge: 'bg-blue-600 text-white',
        accent: 'text-blue-700',
        chip: 'border-blue-200 bg-blue-50 text-blue-700',
        overlay: 'from-blue-950/25 via-blue-950/0 to-white/85',
      };
    case 'green':
      return {
        shell:
          'border-emerald-200 bg-[linear-gradient(180deg,rgba(236,253,245,0.96),rgba(255,255,255,0.98))] shadow-[0_24px_60px_-44px_rgba(5,150,105,0.3)]',
        badge: 'bg-emerald-600 text-white',
        accent: 'text-emerald-700',
        chip: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        overlay: 'from-emerald-950/25 via-emerald-950/0 to-white/85',
      };
    case 'red':
      return {
        shell:
          'border-red-200 bg-[linear-gradient(180deg,rgba(254,242,242,0.96),rgba(255,255,255,0.98))] shadow-[0_24px_60px_-44px_rgba(220,38,38,0.28)]',
        badge: 'bg-red-600 text-white',
        accent: 'text-red-700',
        chip: 'border-red-200 bg-red-50 text-red-700',
        overlay: 'from-red-950/25 via-red-950/0 to-white/85',
      };
    case 'slate':
      return {
        shell:
          'border-slate-200 bg-[linear-gradient(180deg,rgba(241,245,249,0.98),rgba(255,255,255,0.98))] shadow-[0_24px_60px_-44px_rgba(15,23,42,0.3)]',
        badge: 'bg-slate-800 text-white',
        accent: 'text-slate-700',
        chip: 'border-slate-200 bg-slate-100 text-slate-700',
        overlay: 'from-slate-950/25 via-slate-950/0 to-white/85',
      };
    case 'gold':
    default:
      return {
        shell:
          'border-amber-200 bg-[linear-gradient(180deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))] shadow-[0_24px_60px_-44px_rgba(217,119,6,0.28)]',
        badge: 'bg-amber-500 text-amber-950',
        accent: 'text-amber-700',
        chip: 'border-amber-200 bg-amber-50 text-amber-800',
        overlay: 'from-amber-950/20 via-amber-950/0 to-white/85',
      };
  }
}

export function formatPromotionStatusLabel(status: PromotionStatus) {
  switch (status) {
    case 'scheduled':
      return 'Agendada';
    case 'expired':
      return 'Encerrada';
    case 'inactive':
      return 'Inativa';
    case 'active':
    default:
      return 'Ativa';
  }
}

export function getPromotionStatusTone(status: PromotionStatus) {
  switch (status) {
    case 'scheduled':
      return 'border-blue-200 bg-blue-50 text-blue-700';
    case 'expired':
      return 'border-red-200 bg-red-50 text-red-700';
    case 'inactive':
      return 'border-slate-200 bg-slate-100 text-slate-700';
    case 'active':
    default:
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
}

export function formatPromotionDate(value?: string | Date | null) {
  if (!value) {
    return 'Não definido';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Data inválida';
  }

  return dateFormatter.format(date);
}

export function formatPromotionWindow(params: {
  startsAt?: string | Date | null;
  expiresAt?: string | Date | null;
}) {
  if (params.startsAt && params.expiresAt) {
    return `${formatPromotionDate(params.startsAt)} até ${formatPromotionDate(params.expiresAt)}`;
  }

  if (params.expiresAt) {
    return `Válida até ${formatPromotionDate(params.expiresAt)}`;
  }

  if (params.startsAt) {
    return `Disponível desde ${formatPromotionDate(params.startsAt)}`;
  }

  return 'Promoção por tempo indeterminado';
}

export function getPromotionHref(kind: PromotionKind, slug: string) {
  return kind === 'single_product' ? `/ofertas/${slug}` : `/promocoes/${slug}`;
}

export function getPromotionBadgeLabel(promotion?: Promotion | null) {
  return promotion?.badgeText || promotion?.offerPricing?.shortLabel;
}

export function getPromotionProductPricingData(promotion: Promotion | undefined, product: Product) {
  const offerPricing = promotion?.offerPricing;

  if (!offerPricing) {
    return {
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      offerSummary: undefined as string | undefined,
    };
  }

  const computedPricing = getComputedPromotionPricing(offerPricing, product.price);

  if (!computedPricing) {
    return {
      price: product.price,
      originalPrice: product.originalPrice,
      discount: product.discount,
      offerSummary: offerPricing.summary,
    };
  }

  return {
    price: computedPricing.price,
    originalPrice: computedPricing.originalPrice ?? product.originalPrice,
    discount: computedPricing.discount ?? product.discount,
    offerSummary: computedPricing.offerSummary,
  };
}
