import { useDeferredValue, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { ImagePlus, Loader2, Save, Search, Trash2 } from 'lucide-react';
import type {
  Product,
  Promotion,
  PromotionImageAsset,
  PromotionKind,
  PromotionOfferPricing,
  PromotionOfferPricingMode,
  PromotionTheme,
} from '@rebequi/shared/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ModalBody, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalPanel, ModalTitle } from '@/components/ui/modal';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { createPromotion, updatePromotion, uploadPromotionImage } from '@/services/api/promotions';
import { ImageCropDialog } from './image-crop-dialog';
import {
  createObjectPreviewUrl,
  PROMOTION_IMAGE_CONFIG,
  PROMOTION_IMAGE_HEIGHT,
  PROMOTION_IMAGE_WIDTH,
  readFileAsDataUrl,
  revokeObjectPreviewUrl,
} from './image-tools';

type PromotionFormFields = {
  name: string;
  slug: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  description: string;
  badgeText: string;
  ctaLabel: string;
  disclaimer: string;
  themeTone: PromotionTheme;
  startsAt: string;
  expiresAt: string;
  sortOrder: string;
  isActive: boolean;
  pricingMode: PromotionOfferPricingMode | 'none';
  promotionalPrice: string;
  discountPercentage: string;
  minimumQuantity: string;
  payQuantity: string;
};

type PromotionDraftImage = PromotionImageAsset & {
  source: 'stored' | 'new';
  file?: File;
  previewUrl?: string;
};

type PromotionEditorDialogMode = 'default' | 'quick-single-product';

const THEME_OPTIONS: Array<{ label: string; value: PromotionTheme }> = [
  { label: 'Dourado', value: 'gold' },
  { label: 'Azul', value: 'blue' },
  { label: 'Verde', value: 'green' },
  { label: 'Vermelho', value: 'red' },
  { label: 'Slate', value: 'slate' },
];

const PRICING_MODE_OPTIONS: Array<{ label: string; value: PromotionOfferPricingMode | 'none' }> = [
  { label: 'Sem regra comercial', value: 'none' },
  { label: 'Preço promocional', value: 'fixed_price' },
  { label: 'Percentual de desconto', value: 'percentage_discount' },
  { label: 'Leve X, pague Y', value: 'buy_x_pay_y' },
  { label: 'Desconto por quantidade', value: 'bulk_percentage' },
];

function createEmptyValues(): PromotionFormFields {
  return {
    name: '',
    slug: '',
    eyebrow: '',
    title: '',
    subtitle: '',
    description: '',
    badgeText: '',
    ctaLabel: 'Ver oferta',
    disclaimer: '',
    themeTone: 'gold',
    startsAt: '',
    expiresAt: '',
    sortOrder: '0',
    isActive: true,
    pricingMode: 'none',
    promotionalPrice: '',
    discountPercentage: '',
    minimumQuantity: '',
    payQuantity: '',
  };
}

function toOptionalInteger(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return undefined;
  }

  const parsedValue = Number(trimmedValue);
  if (Number.isNaN(parsedValue)) {
    return undefined;
  }

  return Math.max(0, Math.trunc(parsedValue));
}

function toOptionalNumber(value: string) {
  const trimmedValue = value.trim().replace(',', '.');
  if (!trimmedValue) {
    return undefined;
  }

  const parsedValue = Number(trimmedValue);
  if (Number.isNaN(parsedValue)) {
    return undefined;
  }

  return parsedValue;
}

function toOptionalIsoDateTime(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return undefined;
  }

  const date = new Date(trimmedValue);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Informe datas válidas para a promoção.');
  }

  return date.toISOString();
}

function toDateTimeLocalValue(value?: string | Date | null) {
  if (!value) {
    return '';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const pad = (input: number) => String(input).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildStoredDraftImage(image?: Promotion['image']): PromotionDraftImage | undefined {
  if (!image?.url) {
    return undefined;
  }

  return {
    ...image,
    source: 'stored',
  };
}

function buildDraftImageFromProduct(product?: Product | null): PromotionDraftImage | undefined {
  const primaryImage = product?.images?.find((image) => image.isPrimary) || product?.images?.[0];

  if (!primaryImage?.url) {
    return undefined;
  }

  return {
    url: primaryImage.url,
    alt: primaryImage.alt || product?.name,
    storageKey: primaryImage.storageKey,
    filename: primaryImage.filename,
    mimeType: primaryImage.mimeType,
    size: primaryImage.size,
    width: primaryImage.width,
    height: primaryImage.height,
    source: 'stored',
  };
}

function cleanupDraftImage(image?: PromotionDraftImage) {
  if (image?.source === 'new') {
    revokeObjectPreviewUrl(image.previewUrl);
  }
}

async function resolvePromotionImage(image: PromotionDraftImage | undefined, title: string) {
  if (!image) {
    throw new Error('Adicione uma imagem para o card promocional.');
  }

  if (image.source === 'stored') {
    return {
      url: image.url,
      alt: image.alt || title,
      storageKey: image.storageKey,
      filename: image.filename,
      mimeType: image.mimeType,
      size: image.size,
      width: image.width,
      height: image.height,
    };
  }

  if (!image.file) {
    throw new Error('Existe uma imagem promocional sem arquivo para upload.');
  }

  const storedImage = await uploadPromotionImage({
    file: image.file,
    alt: image.alt || title,
    width: PROMOTION_IMAGE_WIDTH,
    height: PROMOTION_IMAGE_HEIGHT,
  });

  return {
    ...storedImage,
    alt: image.alt || title,
  };
}

function trimText(value?: string | null) {
  return value?.trim() || '';
}

function addDays(date: Date, amount: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function getDefaultQuickOfferExpiryValue() {
  const expiryDate = addDays(new Date(), 7);
  expiryDate.setHours(23, 59, 0, 0);
  return toDateTimeLocalValue(expiryDate);
}

function buildQuickOfferValues(product: Product): PromotionFormFields {
  return {
    name: `Oferta ${product.name}`,
    slug: '',
    eyebrow: 'Promoção imperdível',
    title: product.name,
    subtitle: trimText(product.shortDesc),
    description: trimText(product.description) || trimText(product.shortDesc),
    badgeText: product.discount ? `${product.discount}% OFF` : 'Oferta especial',
    ctaLabel: 'Ver oferta',
    disclaimer: '',
    themeTone: 'red',
    startsAt: '',
    expiresAt: getDefaultQuickOfferExpiryValue(),
    sortOrder: '0',
    isActive: true,
    pricingMode: 'none',
    promotionalPrice: '',
    discountPercentage: product.discount ? String(product.discount) : '',
    minimumQuantity: '',
    payQuantity: '',
  };
}

function buildOfferPricingFormValues(offerPricing?: PromotionOfferPricing) {
  if (!offerPricing) {
    return {
      pricingMode: 'none' as const,
      promotionalPrice: '',
      discountPercentage: '',
      minimumQuantity: '',
      payQuantity: '',
    };
  }

  return {
    pricingMode: offerPricing.mode,
    promotionalPrice: offerPricing.promotionalPrice !== undefined ? String(offerPricing.promotionalPrice) : '',
    discountPercentage: offerPricing.discountPercentage !== undefined ? String(offerPricing.discountPercentage) : '',
    minimumQuantity: offerPricing.minimumQuantity !== undefined ? String(offerPricing.minimumQuantity) : '',
    payQuantity: offerPricing.payQuantity !== undefined ? String(offerPricing.payQuantity) : '',
  };
}

function buildOfferPricingPayload(
  fields: PromotionFormFields,
  options?: {
    clearWhenNone?: boolean;
  },
): PromotionOfferPricing | null | undefined {
  const pricingMode = fields.pricingMode;

  if (pricingMode === 'none') {
    return options?.clearWhenNone ? null : undefined;
  }

  if (pricingMode === 'fixed_price') {
    const promotionalPrice = toOptionalNumber(fields.promotionalPrice);
    if (!promotionalPrice || promotionalPrice <= 0) {
      throw new Error('Informe um preço promocional válido.');
    }

    return {
      mode: 'fixed_price',
      promotionalPrice,
    };
  }

  if (pricingMode === 'percentage_discount') {
    const discountPercentage = toOptionalNumber(fields.discountPercentage);
    if (!discountPercentage || discountPercentage <= 0 || discountPercentage > 100) {
      throw new Error('Informe um percentual de desconto válido.');
    }

    return {
      mode: 'percentage_discount',
      discountPercentage,
    };
  }

  if (pricingMode === 'buy_x_pay_y') {
    const minimumQuantity = toOptionalInteger(fields.minimumQuantity);
    const payQuantity = toOptionalInteger(fields.payQuantity);

    if (!minimumQuantity || minimumQuantity < 2) {
      throw new Error('Informe quantas unidades o cliente precisa levar.');
    }

    if (!payQuantity || payQuantity < 1) {
      throw new Error('Informe quantas unidades serão cobradas.');
    }

    if (payQuantity >= minimumQuantity) {
      throw new Error('Na regra Leve X, pague Y, a quantidade cobrada deve ser menor que a quantidade levada.');
    }

    return {
      mode: 'buy_x_pay_y',
      minimumQuantity,
      payQuantity,
    };
  }

  const minimumQuantity = toOptionalInteger(fields.minimumQuantity);
  const discountPercentage = toOptionalNumber(fields.discountPercentage);

  if (!minimumQuantity || minimumQuantity < 2) {
    throw new Error('Informe a quantidade mínima para liberar o desconto.');
  }

  if (!discountPercentage || discountPercentage <= 0 || discountPercentage > 100) {
    throw new Error('Informe um percentual de desconto válido.');
  }

  return {
    mode: 'bulk_percentage',
    minimumQuantity,
    discountPercentage,
  };
}

function buildCreatePayload(
  kind: PromotionKind,
  fields: PromotionFormFields,
  image: PromotionImageAsset,
  productIds: string[],
) {
  const startsAt = toOptionalIsoDateTime(fields.startsAt);
  const expiresAt = toOptionalIsoDateTime(fields.expiresAt);

  if (!expiresAt) {
    throw new Error('Informe a data final da promoção para habilitar o contador.');
  }

  if (startsAt && expiresAt && new Date(expiresAt).getTime() <= new Date(startsAt).getTime()) {
    throw new Error('A data final deve ser posterior ao início da promoção.');
  }

  return {
    name: fields.name.trim(),
    slug: trimText(fields.slug) || undefined,
    kind,
    eyebrow: trimText(fields.eyebrow) || undefined,
    title: fields.title.trim(),
    subtitle: trimText(fields.subtitle) || undefined,
    description: trimText(fields.description) || undefined,
    badgeText: trimText(fields.badgeText) || undefined,
    ctaLabel: trimText(fields.ctaLabel) || undefined,
    disclaimer: trimText(fields.disclaimer) || undefined,
    themeTone: fields.themeTone,
    startsAt,
    expiresAt,
    sortOrder: toOptionalInteger(fields.sortOrder) ?? 0,
    isActive: fields.isActive,
    image,
    offerPricing: buildOfferPricingPayload(fields),
    productIds,
  };
}

function buildUpdatePayload(
  kind: PromotionKind,
  fields: PromotionFormFields,
  image: PromotionImageAsset,
  productIds: string[],
) {
  const startsAt = toOptionalIsoDateTime(fields.startsAt);
  const expiresAt = toOptionalIsoDateTime(fields.expiresAt);

  if (!expiresAt) {
    throw new Error('Informe a data final da promoção para manter o contador ativo.');
  }

  if (startsAt && expiresAt && new Date(expiresAt).getTime() <= new Date(startsAt).getTime()) {
    throw new Error('A data final deve ser posterior ao início da promoção.');
  }

  return {
    name: fields.name.trim(),
    slug: trimText(fields.slug) || undefined,
    kind,
    eyebrow: trimText(fields.eyebrow) || undefined,
    title: fields.title.trim(),
    subtitle: trimText(fields.subtitle) || undefined,
    description: trimText(fields.description) || undefined,
    badgeText: trimText(fields.badgeText) || undefined,
    ctaLabel: trimText(fields.ctaLabel) || undefined,
    disclaimer: trimText(fields.disclaimer) || undefined,
    themeTone: fields.themeTone,
    startsAt: startsAt ?? null,
    expiresAt,
    sortOrder: toOptionalInteger(fields.sortOrder) ?? 0,
    isActive: fields.isActive,
    image,
    offerPricing: buildOfferPricingPayload(fields, { clearWhenNone: true }),
    productIds,
  };
}

export function PromotionEditorDialog({
  kind,
  mode = 'default',
  open,
  promotion,
  products,
  initialProductId,
  onOpenChange,
  onSaved,
}: {
  kind: PromotionKind;
  mode?: PromotionEditorDialogMode;
  open: boolean;
  promotion?: Promotion | null;
  products: Product[];
  initialProductId?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draftImage, setDraftImage] = useState<PromotionDraftImage>();
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [cropSourceUrl, setCropSourceUrl] = useState<string>();
  const [cropOriginalFileName, setCropOriginalFileName] = useState('');
  const deferredProductSearch = useDeferredValue(productSearch);
  const isEditing = Boolean(promotion);
  const isSingleProductMode = kind === 'single_product';
  const isQuickSingleProductMode = isSingleProductMode && mode === 'quick-single-product';
  const initialProduct = initialProductId ? products.find((product) => product.id === initialProductId) ?? null : null;
  const isProductSelectionLocked = isQuickSingleProductMode && Boolean(initialProduct);

  const { register, handleSubmit, reset, watch, formState } = useForm<PromotionFormFields>({
    defaultValues: createEmptyValues(),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!promotion) {
      if (isQuickSingleProductMode && initialProduct) {
        reset(buildQuickOfferValues(initialProduct));
        setSelectedProductIds([initialProduct.id]);
        setProductSearch(initialProduct.name);
        setCategoryFilter(initialProduct.category?.name || 'all');
        setDraftImage((current) => {
          cleanupDraftImage(current);
          return buildDraftImageFromProduct(initialProduct);
        });
        return;
      }

      reset(createEmptyValues());
      setSelectedProductIds([]);
      setProductSearch('');
      setCategoryFilter('all');
      setDraftImage((current) => {
        cleanupDraftImage(current);
        return undefined;
      });
      return;
    }

    reset({
      name: promotion.name,
      slug: promotion.slug || '',
      eyebrow: promotion.eyebrow || '',
      title: promotion.title,
      subtitle: promotion.subtitle || '',
      description: promotion.description || '',
      badgeText: promotion.badgeText || '',
      ctaLabel: promotion.ctaLabel || 'Ver oferta',
      disclaimer: promotion.disclaimer || '',
      themeTone: promotion.themeTone,
      startsAt: toDateTimeLocalValue(promotion.startsAt),
      expiresAt: toDateTimeLocalValue(promotion.expiresAt),
      sortOrder: String(promotion.sortOrder ?? 0),
      isActive: promotion.isActive,
      ...buildOfferPricingFormValues(promotion.offerPricing),
    });
    setSelectedProductIds((promotion.products ?? []).map((productItem) => productItem.id));
    setProductSearch('');
    setCategoryFilter('all');
    setDraftImage((current) => {
      cleanupDraftImage(current);
      return buildStoredDraftImage(promotion.image) || buildDraftImageFromProduct(promotion.primaryProduct || promotion.products?.[0]);
    });
  }, [initialProduct, isQuickSingleProductMode, open, products, promotion, reset]);

  useEffect(() => () => cleanupDraftImage(draftImage), [draftImage]);

  const saveMutation = useMutation({
    mutationFn: async (fields: PromotionFormFields) => {
      const primarySelectedProduct =
        (selectedProductIds[0] ? products.find((product) => product.id === selectedProductIds[0]) : null) || initialProduct;
      const resolvedName =
        fields.name.trim() ||
        (isQuickSingleProductMode && primarySelectedProduct ? `Oferta ${primarySelectedProduct.name}` : '');

      if (!resolvedName) {
        throw new Error('Informe o nome interno da promoção.');
      }

      if (!fields.title.trim()) {
        throw new Error('Informe o título exibido no card.');
      }

      if (selectedProductIds.length === 0) {
        throw new Error('Selecione pelo menos um produto para a promoção.');
      }

      if (isSingleProductMode && selectedProductIds.length !== 1) {
        throw new Error('Ofertas individuais aceitam exatamente um produto.');
      }

      if (!isSingleProductMode && selectedProductIds.length < 2) {
        throw new Error('Campanhas com página dedicada precisam de pelo menos dois produtos.');
      }

      const normalizedFields = {
        ...fields,
        name: resolvedName,
      };
      const resolvedImage = await resolvePromotionImage(draftImage, fields.title.trim());

      if (isEditing && promotion) {
        return updatePromotion(promotion.id, buildUpdatePayload(kind, normalizedFields, resolvedImage, selectedProductIds));
      }

      return createPromotion(buildCreatePayload(kind, normalizedFields, resolvedImage, selectedProductIds));
    },
    onSuccess: () => {
      toast({
        title: isEditing ? 'Promoção atualizada' : 'Promoção criada',
        description: 'O card promocional foi salvo com sucesso.',
      });
      onSaved();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao salvar promoção',
        description: error instanceof Error ? error.message : 'Erro inesperado ao persistir a promoção.',
      });
    },
  });

  const title = watch('title');
  const pricingMode = watch('pricingMode');
  const activeProducts = products.filter((product) => product.isActive);
  const categoryOptions = Array.from(
    new Set(
      activeProducts
        .map((product) => product.category?.name)
        .filter((value): value is string => Boolean(value))
    )
  ).sort((left, right) => left.localeCompare(right));

  const selectedProducts = selectedProductIds
    .map((productId) => products.find((product) => product.id === productId))
    .filter((product): product is Product => Boolean(product));
  const lockedProduct = selectedProducts[0] || initialProduct;
  const quickModeBaseImage = buildDraftImageFromProduct(lockedProduct);
  const pricingPanelTitle = isSingleProductMode ? 'Condição da oferta' : 'Regra comercial da campanha';
  const pricingPanelDescription = isSingleProductMode
    ? `Defina como o cliente verá o benefício desta oferta. Base atual do produto: ${
        lockedProduct ? `R$ ${lockedProduct.price.toFixed(2)}` : 'produto não selecionado'
      }.`
    : selectedProductIds.length > 0
      ? `A mesma regra será aplicada aos ${selectedProductIds.length} produto${selectedProductIds.length > 1 ? 's' : ''} selecionado${selectedProductIds.length > 1 ? 's' : ''}, respeitando o preço-base de cada item.`
      : 'Selecione os produtos da campanha para aplicar uma mesma regra comercial ao conjunto.';

  const availableProducts = activeProducts.filter((product) => {
    if (categoryFilter !== 'all' && product.category?.name !== categoryFilter) {
      return false;
    }

    const searchValue = deferredProductSearch.trim().toLowerCase();
    if (!searchValue) {
      return true;
    }

    return [product.name, product.sku, product.category?.name, product.shortDesc]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(searchValue));
  });

  const handleToggleProduct = (productId: string) => {
    setSelectedProductIds((current) => {
      if (current.includes(productId)) {
        return current.filter((value) => value !== productId);
      }

      if (isSingleProductMode) {
        return [productId];
      }

      return [...current, productId];
    });
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    try {
      setCropSourceUrl(await readFileAsDataUrl(file));
      setCropOriginalFileName(file.name);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Falha ao abrir imagem',
        description: error instanceof Error ? error.message : 'Não foi possível carregar a imagem selecionada.',
      });
    }
  };

  const handleCroppedImage = async (file: File) => {
    const previewUrl = createObjectPreviewUrl(file);

    setDraftImage((current) => {
      cleanupDraftImage(current);
      return {
        source: 'new',
        file,
        previewUrl,
        url: previewUrl,
        alt: title?.trim() || file.name.replace(/\.[^.]+$/, ''),
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        width: PROMOTION_IMAGE_WIDTH,
        height: PROMOTION_IMAGE_HEIGHT,
      };
    });
  };

  const handleRemoveDraftImage = () => {
    const fallbackImage = isQuickSingleProductMode ? quickModeBaseImage : undefined;

    setDraftImage((current) => {
      cleanupDraftImage(current);
      return fallbackImage;
    });
  };

  const renderOfferPricingFields = (compact: boolean) => (
    <div className="space-y-4 rounded-[1.5rem] border border-black/5 bg-slate-50/80 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{pricingPanelTitle}</p>
        <p className="text-xs leading-5 text-muted-foreground">{pricingPanelDescription}</p>
      </div>

      <div className={`grid gap-4 ${compact ? '' : 'md:grid-cols-2'}`}>
        <div className="space-y-2">
          <Label htmlFor="promotion-pricing-mode">Como a promoção funciona</Label>
          <select
            id="promotion-pricing-mode"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            {...register('pricingMode')}
          >
            {PRICING_MODE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {pricingMode === 'fixed_price' ? (
          <div className="space-y-2">
            <Label htmlFor="promotion-promotional-price">Preço promocional</Label>
            <Input id="promotion-promotional-price" inputMode="decimal" placeholder="149,90" {...register('promotionalPrice')} />
          </div>
        ) : null}

        {pricingMode === 'percentage_discount' ? (
          <div className="space-y-2">
            <Label htmlFor="promotion-discount-percentage">Percentual de desconto</Label>
            <Input id="promotion-discount-percentage" inputMode="decimal" placeholder="15" {...register('discountPercentage')} />
          </div>
        ) : null}

        {pricingMode === 'buy_x_pay_y' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="promotion-minimum-quantity-buy">Leva quantas unidades</Label>
              <Input id="promotion-minimum-quantity-buy" inputMode="numeric" placeholder="2" {...register('minimumQuantity')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promotion-pay-quantity">Paga quantas unidades</Label>
              <Input id="promotion-pay-quantity" inputMode="numeric" placeholder="1" {...register('payQuantity')} />
            </div>
          </>
        ) : null}

        {pricingMode === 'bulk_percentage' ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="promotion-minimum-quantity-bulk">Quantidade mínima</Label>
              <Input id="promotion-minimum-quantity-bulk" inputMode="numeric" placeholder="5" {...register('minimumQuantity')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promotion-bulk-discount-percentage">Desconto liberado</Label>
              <Input id="promotion-bulk-discount-percentage" inputMode="decimal" placeholder="10" {...register('discountPercentage')} />
            </div>
          </>
        ) : null}
      </div>

      {pricingMode === 'fixed_price' ? (
        <p className="text-xs text-muted-foreground">
          {isSingleProductMode
            ? 'Exemplo: de R$ 199,90 por R$ 149,90.'
            : 'Define um preço unitário promocional igual para todos os produtos participantes.'}
        </p>
      ) : null}

      {pricingMode === 'percentage_discount' ? (
        <p className="text-xs text-muted-foreground">
          {isSingleProductMode
            ? 'Exemplo: 15% OFF no valor unitário do produto.'
            : 'Aplica o mesmo percentual de desconto sobre o preço atual de cada item da campanha.'}
        </p>
      ) : null}

      {pricingMode === 'buy_x_pay_y' ? (
        <p className="text-xs text-muted-foreground">
          {isSingleProductMode
            ? 'Exemplo: leve 2 unidades e pague apenas 1.'
            : 'Usa a mesma mecânica de quantidade para todos os produtos vinculados à campanha.'}
        </p>
      ) : null}

      {pricingMode === 'bulk_percentage' ? (
        <p className="text-xs text-muted-foreground">
          {isSingleProductMode
            ? 'Exemplo: a partir de 5 unidades, o cliente ganha 10% de desconto.'
            : 'Libera o mesmo desconto por quantidade em cada item participante da campanha.'}
        </p>
      ) : null}
    </div>
  );

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setCropSourceUrl(undefined);
            setCropOriginalFileName('');
          }
          onOpenChange(nextOpen);
        }}
      >
        <ModalContent size={isQuickSingleProductMode ? '2xl' : '3xl'}>
          <ModalHeader>
            <ModalTitle>
              {isQuickSingleProductMode
                ? isEditing
                  ? 'Editar oferta rápida'
                  : 'Criar oferta rápida'
                : isEditing
                  ? isSingleProductMode
                    ? 'Editar oferta individual'
                    : 'Editar promoção'
                  : isSingleProductMode
                    ? 'Nova oferta individual'
                    : 'Nova promoção'}
            </ModalTitle>
            <ModalDescription>
              {isQuickSingleProductMode
                ? 'Configure a oferta deste produto sem sair da página. Os dados principais já entram preenchidos para acelerar o cadastro.'
                : isSingleProductMode
                  ? 'Crie uma oferta avulsa para um único produto, com validade, imagem dedicada e contador ativo na vitrine principal.'
                  : 'Monte um card promocional com imagem, validade, comunicação da oferta e produtos vinculados.'}
            </ModalDescription>
          </ModalHeader>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={handleSubmit((fields) => {
              void saveMutation.mutateAsync(fields);
            })}
          >
            <ModalBody className="space-y-6">
              {isQuickSingleProductMode ? (
                <section className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
                  <ModalPanel className="space-y-4">
                    <div className="space-y-2">
                      <Label>Produto selecionado</Label>
                      {lockedProduct ? (
                        <article className="overflow-hidden rounded-[1.5rem] border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.94))]">
                          <div className="grid gap-0 sm:grid-cols-[120px_minmax(0,1fr)]">
                            <div className="overflow-hidden bg-slate-100">
                              {lockedProduct.images?.[0]?.url ? (
                                <img
                                  src={lockedProduct.images[0].url}
                                  alt={lockedProduct.images[0].alt || lockedProduct.name}
                                  className="aspect-[4/3] h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex aspect-[4/3] h-full items-center justify-center text-sm text-muted-foreground">
                                  Sem imagem
                                </div>
                              )}
                            </div>
                            <div className="space-y-3 p-4">
                              <div className="space-y-1">
                                <p className="line-clamp-2 text-base font-semibold text-foreground">{lockedProduct.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {lockedProduct.category?.name ?? 'Sem categoria'}
                                  {lockedProduct.sku ? ` | SKU ${lockedProduct.sku}` : ''}
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <span className="inline-flex rounded-full border border-black/5 bg-slate-50 px-3 py-1 text-xs text-foreground">
                                  Preço:
                                  <span className="ml-1.5 font-semibold">R$ {lockedProduct.price.toFixed(2)}</span>
                                </span>
                                <span className="inline-flex rounded-full border border-black/5 bg-slate-50 px-3 py-1 text-xs text-foreground">
                                  Estoque:
                                  <span className="ml-1.5 font-semibold">{lockedProduct.stock}</span>
                                </span>
                              </div>
                              <p className="text-xs leading-5 text-muted-foreground">
                                Esta oferta será vinculada a este produto e exibida na seção Promoções imperdíveis.
                              </p>
                            </div>
                          </div>
                        </article>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-black/10 bg-slate-50 px-5 py-8 text-sm text-muted-foreground">
                          Selecione um produto válido para criar a oferta rápida.
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Imagem do card</Label>
                      <div className="overflow-hidden rounded-[1.5rem] border border-black/5 bg-slate-50">
                        {draftImage ? (
                          <img
                            src={draftImage.previewUrl || draftImage.url}
                            alt={draftImage.alt || title || 'Imagem da promoção'}
                            className="aspect-[16/10] w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[16/10] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                            {quickModeBaseImage
                              ? 'Use uma imagem horizontal para destacar o card na home. Se nada for enviado, a imagem principal do produto é reaproveitada.'
                              : 'Use uma imagem horizontal para destacar o card na home.'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={() => fileInputRef.current?.click()} className="gap-2">
                        <ImagePlus className="h-4 w-4" />
                        {draftImage ? 'Trocar imagem' : 'Adicionar imagem'}
                      </Button>
                      {draftImage?.source === 'new' ? (
                        <Button type="button" variant="outline" onClick={handleRemoveDraftImage} className="gap-2 border-red-200 text-red-600">
                          <Trash2 className="h-4 w-4" />
                          {quickModeBaseImage ? 'Voltar para imagem do produto' : 'Remover imagem'}
                        </Button>
                      ) : null}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => void handleFileChange(event)}
                    />
                  </ModalPanel>

                  <ModalPanel className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="promotion-title">Título do card</Label>
                        <Input id="promotion-title" placeholder="Ex.: Furadeira com prazo relâmpago" {...register('title', { required: true })} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="promotion-badge">Selo da oferta</Label>
                        <Input id="promotion-badge" placeholder="Ex.: Oferta especial" {...register('badgeText')} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="promotion-expires-at">Validade</Label>
                        <Input id="promotion-expires-at" type="datetime-local" {...register('expiresAt')} />
                        <p className="text-xs text-muted-foreground">Já sugerimos um prazo inicial de 7 dias. Ajuste se precisar.</p>
                      </div>
                    </div>

                    {renderOfferPricingFields(true)}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="promotion-subtitle">Chamada curta</Label>
                        <Input id="promotion-subtitle" placeholder="Texto curto que aparece no card da oferta" {...register('subtitle')} />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="promotion-description">Descrição</Label>
                        <Textarea
                          id="promotion-description"
                          rows={4}
                          placeholder="Texto usado na página pública da oferta."
                          {...register('description')}
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-3 rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 text-sm">
                      <input type="checkbox" {...register('isActive')} />
                      Publicar oferta assim que salvar
                    </label>

                    <details className="rounded-[1.5rem] border border-black/5 bg-slate-50/80 p-4">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
                        Ajustes avançados
                      </summary>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="promotion-name">Nome interno</Label>
                          <Input id="promotion-name" placeholder="Ex.: Oferta Furadeira Pro" {...register('name')} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="promotion-slug">Slug</Label>
                          <Input id="promotion-slug" placeholder="oferta-furadeira-pro" {...register('slug')} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="promotion-eyebrow">Selo superior</Label>
                          <Input id="promotion-eyebrow" placeholder="Promoções imperdíveis" {...register('eyebrow')} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="promotion-cta">Texto do botão</Label>
                          <Input id="promotion-cta" placeholder="Ver oferta" {...register('ctaLabel')} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="promotion-theme">Tema visual</Label>
                          <select
                            id="promotion-theme"
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            {...register('themeTone')}
                          >
                            {THEME_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="promotion-starts-at">Início</Label>
                          <Input id="promotion-starts-at" type="datetime-local" {...register('startsAt')} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="promotion-sort-order">Ordem</Label>
                          <Input id="promotion-sort-order" inputMode="numeric" placeholder="0" {...register('sortOrder')} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="promotion-disclaimer">Mensagem auxiliar</Label>
                          <Textarea
                            id="promotion-disclaimer"
                            rows={3}
                            placeholder="Ex.: Estoque sujeito à disponibilidade durante a campanha."
                            {...register('disclaimer')}
                          />
                        </div>
                      </div>
                    </details>
                  </ModalPanel>
                </section>
              ) : (
                <section className="grid gap-4 xl:grid-cols-2">
                  <ModalPanel className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="promotion-name">Nome interno</Label>
                      <Input
                        id="promotion-name"
                        placeholder={isSingleProductMode ? 'Ex.: Oferta Furadeira Pro' : 'Ex.: Semana da pintura'}
                        {...register('name', { required: true })}
                      />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="promotion-slug">Slug</Label>
                        <Input id="promotion-slug" placeholder="semana-da-pintura" {...register('slug')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="promotion-theme">Tema visual</Label>
                        <select
                          id="promotion-theme"
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          {...register('themeTone')}
                        >
                          {THEME_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="promotion-eyebrow">Selo superior</Label>
                      <Input id="promotion-eyebrow" placeholder="Ofertas em destaque" {...register('eyebrow')} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="promotion-title">Título do card</Label>
                      <Input
                        id="promotion-title"
                        placeholder={isSingleProductMode ? 'Furadeira com prazo relâmpago' : 'Acabamento com preço especial'}
                        {...register('title', { required: true })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="promotion-subtitle">Subtítulo</Label>
                      <Input id="promotion-subtitle" placeholder="Tintas, pincéis e rolos para renovar ambientes" {...register('subtitle')} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="promotion-description">Descrição</Label>
                      <Textarea
                        id="promotion-description"
                        rows={4}
                        placeholder="Texto usado na página pública da promoção."
                        {...register('description')}
                      />
                    </div>
                  </ModalPanel>

                  <ModalPanel className="space-y-4">
                    <div className="space-y-2">
                      <Label>Imagem do card</Label>
                      <div className="overflow-hidden rounded-[1.5rem] border border-black/5 bg-slate-50">
                        {draftImage ? (
                          <img
                            src={draftImage.previewUrl || draftImage.url}
                            alt={draftImage.alt || title || 'Imagem da promoção'}
                            className="aspect-[16/10] w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-[16/10] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                            {isSingleProductMode
                              ? 'Adicione uma imagem horizontal para destacar esta oferta individual na seção Promoções imperdíveis.'
                              : 'Adicione uma imagem horizontal para destacar esta campanha na página pública.'}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" onClick={() => fileInputRef.current?.click()} className="gap-2">
                        <ImagePlus className="h-4 w-4" />
                        {draftImage ? 'Trocar imagem' : 'Adicionar imagem'}
                      </Button>
                      {draftImage ? (
                        <Button type="button" variant="outline" onClick={handleRemoveDraftImage} className="gap-2 border-red-200 text-red-600">
                          <Trash2 className="h-4 w-4" />
                          Remover
                        </Button>
                      ) : null}
                    </div>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                      onChange={(event) => void handleFileChange(event)}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="promotion-badge">Badge</Label>
                        <Input id="promotion-badge" placeholder="Até 25% OFF" {...register('badgeText')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="promotion-cta">Texto do botão</Label>
                        <Input id="promotion-cta" placeholder="Ver oferta" {...register('ctaLabel')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="promotion-starts-at">Início</Label>
                        <Input id="promotion-starts-at" type="datetime-local" {...register('startsAt')} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="promotion-expires-at">Validade</Label>
                        <Input id="promotion-expires-at" type="datetime-local" {...register('expiresAt')} />
                        <p className="text-xs text-muted-foreground">Obrigatório para manter o contador de término sempre ativo.</p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="promotion-sort-order">Ordem</Label>
                        <Input id="promotion-sort-order" inputMode="numeric" placeholder="0" {...register('sortOrder')} />
                      </div>
                      <label className="flex items-center gap-3 rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 text-sm">
                        <input type="checkbox" {...register('isActive')} />
                        Promoção ativa
                      </label>
                    </div>

                    {renderOfferPricingFields(false)}

                    <div className="space-y-2">
                      <Label htmlFor="promotion-disclaimer">Mensagem auxiliar</Label>
                      <Textarea
                        id="promotion-disclaimer"
                        rows={3}
                        placeholder="Ex.: Estoque sujeito à disponibilidade durante a campanha."
                        {...register('disclaimer')}
                      />
                    </div>
                  </ModalPanel>
                </section>
              )}

              {!isProductSelectionLocked ? (
                <ModalPanel className="space-y-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {isSingleProductMode ? 'Produto da oferta' : 'Produtos vinculados'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {isSingleProductMode
                          ? 'Selecione exatamente um produto ativo para esta oferta avulsa.'
                          : 'Selecione produtos ativos de uma ou mais categorias para compor este card.'}
                      </p>
                    </div>
                    <div className="rounded-full border border-black/5 bg-slate-50 px-4 py-2 text-sm font-semibold text-foreground">
                      {selectedProductIds.length} selecionados
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={productSearch}
                        onChange={(event) => setProductSearch(event.target.value)}
                        placeholder="Buscar por nome, SKU ou categoria"
                        className="pl-9"
                      />
                    </div>

                    <select
                      value={categoryFilter}
                      onChange={(event) => setCategoryFilter(event.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="all">Todas as categorias</option>
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-foreground">Selecionados</p>
                      <div className="app-scrollbar max-h-[20rem] space-y-3 overflow-y-auto pr-1">
                        {selectedProducts.map((product) => {
                          const previewImage = product.images?.[0]?.url;

                          return (
                            <article key={product.id} className="flex gap-3 rounded-2xl border border-black/5 bg-slate-50 p-3">
                              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white">
                                {previewImage ? (
                                  <img src={previewImage} alt={product.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">Sem imagem</div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-foreground">{product.name}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {product.category?.name ?? 'Sem categoria'}
                                  {product.sku ? ` | SKU ${product.sku}` : ''}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-foreground">R$ {product.price.toFixed(2)}</p>
                                {!product.isActive ? (
                                  <p className="mt-1 text-xs text-amber-700">Produto inativo no catálogo.</p>
                                ) : null}
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleProduct(product.id)}
                                className="self-start border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                Remover
                              </Button>
                            </article>
                          );
                        })}

                        {selectedProducts.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-black/10 bg-white px-5 py-10 text-center text-sm text-muted-foreground">
                            Nenhum produto selecionado.
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-foreground">Catálogo elegível</p>
                      <div className="app-scrollbar max-h-[20rem] space-y-3 overflow-y-auto pr-1">
                        {availableProducts.map((product) => {
                          const isSelected = selectedProductIds.includes(product.id);
                          const previewImage = product.images?.[0]?.url;

                          return (
                            <article
                              key={product.id}
                              className={`flex gap-3 rounded-2xl border p-3 transition-colors ${
                                isSelected
                                  ? 'border-primary/20 bg-primary/5'
                                  : 'border-black/5 bg-white'
                              }`}
                            >
                              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-50">
                                {previewImage ? (
                                  <img src={previewImage} alt={product.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-[11px] text-muted-foreground">Sem imagem</div>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate font-semibold text-foreground">{product.name}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {product.category?.name ?? 'Sem categoria'}
                                  {product.sku ? ` | SKU ${product.sku}` : ''}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-foreground">R$ {product.price.toFixed(2)}</p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                variant={isSelected ? 'outline' : 'default'}
                                onClick={() => handleToggleProduct(product.id)}
                              >
                                {isSelected ? 'Remover' : 'Adicionar'}
                              </Button>
                            </article>
                          );
                        })}

                        {availableProducts.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-black/10 bg-white px-5 py-10 text-center text-sm text-muted-foreground">
                            Nenhum produto encontrado para esse filtro.
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </ModalPanel>
              ) : null}
            </ModalBody>

            <ModalFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending || formState.isSubmitting}>
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isQuickSingleProductMode
                  ? isEditing
                    ? 'Salvar oferta rápida'
                    : 'Publicar oferta rápida'
                  : isEditing
                    ? isSingleProductMode
                      ? 'Salvar oferta'
                      : 'Salvar promoção'
                    : isSingleProductMode
                      ? 'Cadastrar oferta'
                      : 'Cadastrar promoção'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Dialog>

      <ImageCropDialog
        open={Boolean(cropSourceUrl)}
        fileName={cropOriginalFileName}
        sourceUrl={cropSourceUrl}
        title="Recortar imagem da promoção"
        config={PROMOTION_IMAGE_CONFIG}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setCropSourceUrl(undefined);
            setCropOriginalFileName('');
          }
        }}
        onConfirm={async (file) => {
          await handleCroppedImage(file);
          setCropSourceUrl(undefined);
          setCropOriginalFileName('');
        }}
      />
    </>
  );
}
