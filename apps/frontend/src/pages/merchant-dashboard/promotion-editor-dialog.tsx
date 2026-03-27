import { useDeferredValue, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { ImagePlus, Loader2, Save, Search, Trash2 } from 'lucide-react';
import type { Product, Promotion, PromotionImageAsset, PromotionKind, PromotionTheme } from '@rebequi/shared/types';
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
};

type PromotionDraftImage = PromotionImageAsset & {
  source: 'stored' | 'new';
  file?: File;
  previewUrl?: string;
};

const THEME_OPTIONS: Array<{ label: string; value: PromotionTheme }> = [
  { label: 'Dourado', value: 'gold' },
  { label: 'Azul', value: 'blue' },
  { label: 'Verde', value: 'green' },
  { label: 'Vermelho', value: 'red' },
  { label: 'Slate', value: 'slate' },
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

function toOptionalIsoDateTime(value: string) {
  const trimmedValue = value.trim();
  if (!trimmedValue) {
    return undefined;
  }

  const date = new Date(trimmedValue);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Informe datas validas para a promocao.');
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

function buildCreatePayload(
  kind: PromotionKind,
  fields: PromotionFormFields,
  image: PromotionImageAsset,
  productIds: string[],
) {
  const startsAt = toOptionalIsoDateTime(fields.startsAt);
  const expiresAt = toOptionalIsoDateTime(fields.expiresAt);

  if (!expiresAt) {
    throw new Error('Informe a data final da promocao para habilitar o contador.');
  }

  if (startsAt && expiresAt && new Date(expiresAt).getTime() <= new Date(startsAt).getTime()) {
    throw new Error('A data final deve ser posterior ao inicio da promocao.');
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
    throw new Error('Informe a data final da promocao para manter o contador ativo.');
  }

  if (startsAt && expiresAt && new Date(expiresAt).getTime() <= new Date(startsAt).getTime()) {
    throw new Error('A data final deve ser posterior ao inicio da promocao.');
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
    productIds,
  };
}

export function PromotionEditorDialog({
  kind,
  open,
  promotion,
  products,
  onOpenChange,
  onSaved,
}: {
  kind: PromotionKind;
  open: boolean;
  promotion?: Promotion | null;
  products: Product[];
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

  const { register, handleSubmit, reset, watch, formState } = useForm<PromotionFormFields>({
    defaultValues: createEmptyValues(),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!promotion) {
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
    });
    setSelectedProductIds((promotion.products ?? []).map((productItem) => productItem.id));
    setProductSearch('');
    setCategoryFilter('all');
    setDraftImage((current) => {
      cleanupDraftImage(current);
      return buildStoredDraftImage(promotion.image);
    });
  }, [open, promotion, reset]);

  useEffect(() => () => cleanupDraftImage(draftImage), [draftImage]);

  const saveMutation = useMutation({
    mutationFn: async (fields: PromotionFormFields) => {
      if (!fields.name.trim()) {
        throw new Error('Informe o nome interno da promocao.');
      }

      if (!fields.title.trim()) {
        throw new Error('Informe o titulo exibido no card.');
      }

      if (selectedProductIds.length === 0) {
        throw new Error('Selecione pelo menos um produto para a promocao.');
      }

      if (isSingleProductMode && selectedProductIds.length !== 1) {
        throw new Error('Ofertas individuais aceitam exatamente um produto.');
      }

      if (!isSingleProductMode && selectedProductIds.length < 2) {
        throw new Error('Campanhas com pagina dedicada precisam de pelo menos dois produtos.');
      }

      const resolvedImage = await resolvePromotionImage(draftImage, fields.title.trim());

      if (isEditing && promotion) {
        return updatePromotion(promotion.id, buildUpdatePayload(kind, fields, resolvedImage, selectedProductIds));
      }

      return createPromotion(buildCreatePayload(kind, fields, resolvedImage, selectedProductIds));
    },
    onSuccess: () => {
      toast({
        title: isEditing ? 'Promocao atualizada' : 'Promocao criada',
        description: 'O card promocional foi salvo com sucesso.',
      });
      onSaved();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao salvar promocao',
        description: error instanceof Error ? error.message : 'Erro inesperado ao persistir a promocao.',
      });
    },
  });

  const title = watch('title');
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
        description: error instanceof Error ? error.message : 'Nao foi possivel carregar a imagem selecionada.',
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
    setDraftImage((current) => {
      cleanupDraftImage(current);
      return undefined;
    });
  };

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
        <ModalContent size="3xl">
          <ModalHeader>
            <ModalTitle>
              {isEditing
                ? isSingleProductMode
                  ? 'Editar oferta individual'
                  : 'Editar promocao'
                : isSingleProductMode
                  ? 'Nova oferta individual'
                  : 'Nova promocao'}
            </ModalTitle>
            <ModalDescription>
              {isSingleProductMode
                ? 'Crie uma oferta avulsa para um unico produto, com validade, imagem dedicada e contador ativo na vitrine principal.'
                : 'Monte um card promocional com imagem, validade, comunicacao da oferta e produtos vinculados.'}
            </ModalDescription>
          </ModalHeader>

          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={handleSubmit((fields) => {
              void saveMutation.mutateAsync(fields);
            })}
          >
            <ModalBody className="space-y-6">
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
                    <Label htmlFor="promotion-title">Titulo do card</Label>
                    <Input
                      id="promotion-title"
                      placeholder={isSingleProductMode ? 'Furadeira com prazo relampago' : 'Acabamento com preco especial'}
                      {...register('title', { required: true })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="promotion-subtitle">Subtitulo</Label>
                    <Input id="promotion-subtitle" placeholder="Tintas, pinceis e rolos para renovar ambientes" {...register('subtitle')} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="promotion-description">Descricao</Label>
                    <Textarea
                      id="promotion-description"
                      rows={4}
                      placeholder="Texto usado na pagina publica da promocao."
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
                          alt={draftImage.alt || title || 'Imagem da promocao'}
                          className="aspect-[16/10] w-full object-cover"
                        />
                      ) : (
                        <div className="flex aspect-[16/10] items-center justify-center px-6 text-center text-sm text-muted-foreground">
                          {isSingleProductMode
                            ? 'Adicione uma imagem horizontal para destacar esta oferta individual na secao Promocoes imperdiveis.'
                            : 'Adicione uma imagem horizontal para destacar esta campanha na pagina publica.'}
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
                      <Input id="promotion-badge" placeholder="Ate 25% OFF" {...register('badgeText')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promotion-cta">Texto do botao</Label>
                      <Input id="promotion-cta" placeholder="Ver oferta" {...register('ctaLabel')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promotion-starts-at">Inicio</Label>
                      <Input id="promotion-starts-at" type="datetime-local" {...register('startsAt')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promotion-expires-at">Validade</Label>
                      <Input id="promotion-expires-at" type="datetime-local" {...register('expiresAt')} />
                      <p className="text-xs text-muted-foreground">Obrigatorio para manter o contador de termino sempre ativo.</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="promotion-sort-order">Ordem</Label>
                      <Input id="promotion-sort-order" inputMode="numeric" placeholder="0" {...register('sortOrder')} />
                    </div>
                    <label className="flex items-center gap-3 rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 text-sm">
                      <input type="checkbox" {...register('isActive')} />
                      Promocao ativa
                    </label>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="promotion-disclaimer">Mensagem auxiliar</Label>
                    <Textarea
                      id="promotion-disclaimer"
                      rows={3}
                      placeholder="Ex.: Estoque sujeito a disponibilidade durante a campanha."
                      {...register('disclaimer')}
                    />
                  </div>
                </ModalPanel>
              </section>

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
                                <p className="mt-1 text-xs text-amber-700">Produto inativo no catalogo.</p>
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
                    <p className="text-sm font-semibold text-foreground">Catalogo elegivel</p>
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
            </ModalBody>

            <ModalFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending || formState.isSubmitting}>
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditing
                  ? isSingleProductMode
                    ? 'Salvar oferta'
                    : 'Salvar promocao'
                  : isSingleProductMode
                    ? 'Cadastrar oferta'
                    : 'Cadastrar promocao'}
              </Button>
            </ModalFooter>
          </form>
        </ModalContent>
      </Dialog>

      <ImageCropDialog
        open={Boolean(cropSourceUrl)}
        fileName={cropOriginalFileName}
        sourceUrl={cropSourceUrl}
        title="Recortar imagem da promocao"
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
