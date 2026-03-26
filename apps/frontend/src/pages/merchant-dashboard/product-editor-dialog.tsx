import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';
import type { Product, ProductImage } from '@rebequi/shared/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { createProduct, updateProduct, uploadProductImage } from '@/services/api/products';
import { ProductImageCropDialog } from './image-crop-dialog';
import {
  createObjectPreviewUrl,
  PRODUCT_IMAGE_HEIGHT,
  PRODUCT_IMAGE_WIDTH,
  readFileAsDataUrl,
  revokeObjectPreviewUrl,
} from './image-tools';

type CategoryOption = {
  id: string;
  name: string;
};

type ProductDraftImage = ProductImage & {
  localId: string;
  source: 'stored' | 'new';
  file?: File;
  previewUrl?: string;
};

type ProductFormFields = {
  name: string;
  sku: string;
  price: string;
  originalPrice: string;
  description: string;
  shortDesc: string;
  stock: string;
  minStock: string;
  weight: string;
  dimensions: string;
  discount: string;
  categoryId: string;
  isOffer: boolean;
  isNew: boolean;
  isFeatured: boolean;
  isActive: boolean;
};

function createEmptyFormValues(): ProductFormFields {
  return {
    name: '',
    sku: '',
    price: '',
    originalPrice: '',
    description: '',
    shortDesc: '',
    stock: '0',
    minStock: '0',
    weight: '',
    dimensions: '',
    discount: '',
    categoryId: '',
    isOffer: false,
    isNew: false,
    isFeatured: false,
    isActive: true,
  };
}

function createDraftImageFromProductImage(image: ProductImage, index: number): ProductDraftImage {
  return {
    ...image,
    storageKey: image.storageKey ?? undefined,
    filename: image.filename ?? undefined,
    mimeType: image.mimeType ?? undefined,
    size: image.size ?? undefined,
    width: image.width ?? undefined,
    height: image.height ?? undefined,
    localId: image.id || image.storageKey || `${image.url}-${index}`,
    source: 'stored',
    order: image.order ?? index,
    isPrimary: image.isPrimary ?? index === 0,
  };
}

function normalizeDraftImages(images: ProductDraftImage[]) {
  const ordered = [...images].map((image, index) => ({
    ...image,
    order: index,
  }));
  const primaryIndex = ordered.findIndex((image) => image.isPrimary);

  return ordered.map((image, index) => ({
    ...image,
    isPrimary: primaryIndex === -1 ? index === 0 : index === primaryIndex,
  }));
}

function cleanupDraftImages(images: ProductDraftImage[]) {
  for (const image of images) {
    if (image.source === 'new') {
      revokeObjectPreviewUrl(image.previewUrl);
    }
  }
}

function toOptionalNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const numericValue = Number(trimmed.replace(',', '.'));
  return Number.isNaN(numericValue) ? undefined : numericValue;
}

function buildPayload(fields: ProductFormFields, images: ProductImage[]) {
  const price = toOptionalNumber(fields.price);
  const stock = toOptionalNumber(fields.stock);

  if (price === undefined) {
    throw new Error('Informe um preco valido.');
  }

  if (stock === undefined) {
    throw new Error('Informe um estoque valido.');
  }

  return {
    name: fields.name.trim(),
    sku: fields.sku.trim() || undefined,
    price,
    originalPrice: toOptionalNumber(fields.originalPrice),
    description: fields.description.trim() || undefined,
    shortDesc: fields.shortDesc.trim() || undefined,
    stock,
    minStock: toOptionalNumber(fields.minStock) ?? 0,
    weight: toOptionalNumber(fields.weight),
    dimensions: fields.dimensions.trim() || undefined,
    discount: toOptionalNumber(fields.discount),
    categoryId: fields.categoryId,
    isOffer: fields.isOffer,
    isNew: fields.isNew,
    isFeatured: fields.isFeatured,
    images,
  };
}

function normalizeOptionalImageMetadata<T>(value: T | null | undefined) {
  return value ?? undefined;
}

async function resolveUploadedImages(images: ProductDraftImage[], productName: string) {
  const resolved: ProductImage[] = [];

  for (const image of normalizeDraftImages(images)) {
    if (image.source === 'stored') {
      resolved.push(image);
      continue;
    }

    if (!image.file) {
      throw new Error('Existe uma imagem nova sem arquivo para upload.');
    }

    const storedImage = await uploadProductImage({
      file: image.file,
      alt: image.alt || productName,
      width: PRODUCT_IMAGE_WIDTH,
      height: PRODUCT_IMAGE_HEIGHT,
    });

    resolved.push({
      ...storedImage,
      alt: image.alt || productName,
      order: image.order,
      isPrimary: image.isPrimary,
    });
  }

  return normalizeDraftImages(resolved as ProductDraftImage[]).map((image) => ({
    id: image.id,
    url: image.url,
    alt: image.alt,
    order: image.order,
    isPrimary: image.isPrimary,
    storageKey: normalizeOptionalImageMetadata(image.storageKey),
    filename: normalizeOptionalImageMetadata(image.filename),
    mimeType: normalizeOptionalImageMetadata(image.mimeType),
    size: normalizeOptionalImageMetadata(image.size),
    width: normalizeOptionalImageMetadata(image.width),
    height: normalizeOptionalImageMetadata(image.height),
  }));
}

function ProductImageCard({
  image,
  onMakePrimary,
  onRemove,
}: {
  image: ProductDraftImage;
  onMakePrimary: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-3xl border border-black/5 bg-slate-50 p-3">
      <div className="overflow-hidden rounded-2xl border border-black/5 bg-white">
        <img src={image.previewUrl || image.url} alt={image.alt || 'Imagem do produto'} className="aspect-square w-full object-cover" />
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onMakePrimary}>
          {image.isPrimary ? 'Principal' : 'Tornar principal'}
        </Button>
        <Button type="button" variant="outline" className="border-red-200 text-red-600" onClick={onRemove}>
          <Trash2 className="mr-2 h-4 w-4" />
          Remover
        </Button>
      </div>
    </div>
  );
}

export function ProductEditorDialog({
  categories,
  onOpenChange,
  onSaved,
  open,
  product,
}: {
  categories: CategoryOption[];
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
  open: boolean;
  product?: Product | null;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [images, setImages] = useState<ProductDraftImage[]>([]);
  const [cropSourceUrl, setCropSourceUrl] = useState<string>();
  const [cropOriginalFileName, setCropOriginalFileName] = useState('');
  const isEditing = Boolean(product);

  const { register, handleSubmit, reset, watch, formState } = useForm<ProductFormFields>({
    defaultValues: createEmptyFormValues(),
  });

  useEffect(() => {
    if (!open) {
      return;
    }

    if (!product) {
      reset(createEmptyFormValues());
      setImages((current) => {
        cleanupDraftImages(current);
        return [];
      });
      return;
    }

    reset({
      name: product.name,
      sku: product.sku || '',
      price: String(product.price),
      originalPrice: product.originalPrice ? String(product.originalPrice) : '',
      description: product.description || '',
      shortDesc: product.shortDesc || '',
      stock: String(product.stock),
      minStock: String(product.minStock ?? 0),
      weight: product.weight ? String(product.weight) : '',
      dimensions: product.dimensions || '',
      discount: product.discount ? String(product.discount) : '',
      categoryId: product.categoryId,
      isOffer: product.isOffer,
      isNew: product.isNew,
      isFeatured: product.isFeatured,
      isActive: product.isActive,
    });

    setImages((current) => {
      cleanupDraftImages(current);
      return normalizeDraftImages((product.images || []).map(createDraftImageFromProductImage));
    });
  }, [open, product, reset]);

  useEffect(() => () => cleanupDraftImages(images), [images]);

  const saveMutation = useMutation({
    mutationFn: async (fields: ProductFormFields) => {
      const uploadedImages = await resolveUploadedImages(images, fields.name.trim());
      if (uploadedImages.length === 0) {
        throw new Error('Adicione pelo menos uma imagem para o produto.');
      }

      if (!fields.categoryId) {
        throw new Error('Selecione uma categoria.');
      }

      const payload = {
        ...buildPayload(fields, uploadedImages),
        isActive: fields.isActive,
      };

      return isEditing && product ? updateProduct(product.id, payload) : createProduct(payload);
    },
    onSuccess: () => {
      toast({
        title: isEditing ? 'Produto atualizado' : 'Produto criado',
        description: 'Os dados e as imagens foram persistidos com sucesso.',
      });
      setImages((current) => {
        cleanupDraftImages(current);
        return [];
      });
      onSaved();
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao salvar produto',
        description: error instanceof Error ? error.message : 'Erro inesperado ao persistir o produto.',
      });
    },
  });

  const categoryId = watch('categoryId');

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

    setImages((current) =>
      normalizeDraftImages([
        ...current,
        {
          localId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          source: 'new',
          file,
          previewUrl,
          url: previewUrl,
          alt: watch('name') || file.name.replace(/\.[^.]+$/, ''),
          order: current.length,
          isPrimary: current.length === 0,
          width: PRODUCT_IMAGE_WIDTH,
          height: PRODUCT_IMAGE_HEIGHT,
          filename: file.name,
          mimeType: file.type,
          size: file.size,
        },
      ])
    );
  };

  const handleRemoveImage = (image: ProductDraftImage) => {
    if (image.source === 'new') {
      revokeObjectPreviewUrl(image.previewUrl);
    }

    setImages((current) => normalizeDraftImages(current.filter((item) => item.localId !== image.localId)));
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setCropSourceUrl(undefined);
            setCropOriginalFileName('');
            setImages((current) => {
              cleanupDraftImages(current);
              return [];
            });
          }
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto border-[#eadfba] bg-[linear-gradient(180deg,#fffef8,#ffffff)] sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar produto' : 'Novo produto'}</DialogTitle>
            <DialogDescription>Preencha os dados do produto e salve as imagens.</DialogDescription>
          </DialogHeader>

          <form
            className="space-y-6"
            onSubmit={handleSubmit((fields) => {
              void saveMutation.mutateAsync(fields);
            })}
          >
            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="product-name">Nome</Label>
                <Input id="product-name" placeholder="Ex.: Furadeira de Impacto 650W" {...register('name', { required: true })} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-category">Categoria</Label>
                <select
                  id="product-category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  {...register('categoryId', { required: true })}
                >
                  <option value="">Selecione</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-price">Preco</Label>
                <Input id="product-price" inputMode="decimal" placeholder="299.90" {...register('price')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-original-price">Preco original</Label>
                <Input id="product-original-price" inputMode="decimal" placeholder="349.90" {...register('originalPrice')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-discount">Desconto (%)</Label>
                <Input id="product-discount" inputMode="numeric" placeholder="15" {...register('discount')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-stock">Estoque</Label>
                <Input id="product-stock" inputMode="numeric" placeholder="12" {...register('stock')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-min-stock">Estoque minimo</Label>
                <Input id="product-min-stock" inputMode="numeric" placeholder="3" {...register('minStock')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-sku">SKU</Label>
                <Input id="product-sku" placeholder="FER-FUR-001" {...register('sku')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-weight">Peso (kg)</Label>
                <Input id="product-weight" inputMode="decimal" placeholder="2.4" {...register('weight')} />
              </div>

              <div className="space-y-2 xl:col-span-2">
                <Label htmlFor="product-dimensions">Dimensoes</Label>
                <Input id="product-dimensions" placeholder="30x25x10 cm" {...register('dimensions')} />
              </div>

              <div className="space-y-2 xl:col-span-3">
                <Label htmlFor="product-short-desc">Descricao curta</Label>
                <Textarea id="product-short-desc" rows={3} placeholder="Resumo para cards e secoes publicas." {...register('shortDesc')} />
              </div>

              <div className="space-y-2 xl:col-span-3">
                <Label htmlFor="product-description">Descricao completa</Label>
                <Textarea id="product-description" rows={5} placeholder="Descricao detalhada do produto." {...register('description')} />
              </div>
            </section>

            <section className="rounded-3xl border border-[#eadfba] bg-white/92 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Imagens</h3>
                  <p className="text-sm text-muted-foreground">As imagens sao recortadas em 1:1 e comprimidas antes do upload.</p>
                </div>

                <Button type="button" onClick={() => fileInputRef.current?.click()} className="gap-2">
                  <ImagePlus className="h-4 w-4" />
                  Adicionar imagem
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => void handleFileChange(event)}
              />

              <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {images.map((image) => (
                  <ProductImageCard
                    key={image.localId}
                    image={image}
                    onMakePrimary={() =>
                      setImages((current) =>
                        normalizeDraftImages(
                          current.map((item) => ({
                            ...item,
                            isPrimary: item.localId === image.localId,
                          }))
                        )
                      )
                    }
                    onRemove={() => handleRemoveImage(image)}
                  />
                ))}
                {images.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-black/10 bg-slate-50 px-5 py-10 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                    Nenhuma imagem selecionada.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <label className="flex items-center gap-3 rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 text-sm">
                <input type="checkbox" {...register('isOffer')} />
                Produto em oferta
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 text-sm">
                <input type="checkbox" {...register('isNew')} />
                Sinalizar como novidade
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 text-sm">
                <input type="checkbox" {...register('isFeatured')} />
                Exibir em destaque
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 text-sm">
                <input type="checkbox" {...register('isActive')} />
                Produto ativo
              </label>
            </section>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saveMutation.isPending || formState.isSubmitting || !categoryId}>
                {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isEditing ? 'Salvar alteracoes' : 'Cadastrar produto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ProductImageCropDialog
        open={Boolean(cropSourceUrl)}
        fileName={cropOriginalFileName}
        sourceUrl={cropSourceUrl}
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
