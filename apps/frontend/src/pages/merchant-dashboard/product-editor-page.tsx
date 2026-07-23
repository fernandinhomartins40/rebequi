import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import type { ProductImage } from '@rebequi/shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { fetchCategories } from '@/services/api/categories';
import { createProduct, updateProduct, uploadProductImage } from '@/services/api/products';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, EditorBackLink, EditorError, EditorFooter, EditorLoading, PageHeader } from './components';
import { ProductImageCropDialog } from './image-crop-dialog';
import { fetchAllAdminProductsSnapshot } from './promotion-admin';
import {
  createObjectPreviewUrl,
  PRODUCT_IMAGE_HEIGHT,
  PRODUCT_IMAGE_WIDTH,
  readFileAsDataUrl,
  revokeObjectPreviewUrl,
} from './image-tools';

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
    throw new Error('Informe um preço válido.');
  }

  if (stock === undefined) {
    throw new Error('Informe um estoque válido.');
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
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
      <div className="overflow-hidden rounded-lg border border-border/60 bg-background">
        <img src={image.previewUrl || image.url} alt={image.alt || 'Imagem do produto'} className="aspect-square w-full object-cover" />
      </div>
      <div className="mt-3 flex gap-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onMakePrimary}>
          {image.isPrimary ? 'Principal' : 'Tornar principal'}
        </Button>
        <Button type="button" variant="outline" className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={onRemove}>
          <Trash2 className="mr-2 h-4 w-4" />
          Remover
        </Button>
      </div>
    </div>
  );
}

const BACK_HREF = `${ADMIN_BASE_PATH}/produtos`;

export function MerchantProductEditorPage() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [images, setImages] = useState<ProductDraftImage[]>([]);
  const [cropSourceUrl, setCropSourceUrl] = useState<string>();
  const [cropOriginalFileName, setCropOriginalFileName] = useState('');
  const isEditing = Boolean(productId);

  const categoriesQuery = useQuery({
    queryKey: ['merchant-dashboard', 'categories', 'all'],
    queryFn: () => fetchCategories({ includeInactive: true }),
  });

  const productsQuery = useQuery({
    queryKey: ['merchant-dashboard', 'products-snapshot-all'],
    queryFn: fetchAllAdminProductsSnapshot,
    enabled: isEditing,
  });

  const product = isEditing ? productsQuery.data?.find((item) => item.id === productId) ?? null : null;

  const managedCategories = categoriesQuery.data?.categories ?? [];
  const categories = managedCategories
    .filter((item) => item.isActive || item.id === product?.categoryId)
    .map((item) => ({ id: item.id, name: item.isActive ? item.name : `${item.name} (inativa)` }));

  const { register, handleSubmit, reset, watch, formState } = useForm<ProductFormFields>({
    defaultValues: createEmptyFormValues(),
  });

  useEffect(() => {
    if (!product) {
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
  }, [product, reset]);

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
    onSuccess: async () => {
      toast({
        title: isEditing ? 'Produto atualizado' : 'Produto criado',
        description: 'Os dados e as imagens foram persistidos com sucesso.',
      });
      setImages((current) => {
        cleanupDraftImages(current);
        return [];
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['promotions'] }),
      ]);
      navigate(BACK_HREF);
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
        description: error instanceof Error ? error.message : 'Não foi possível carregar a imagem selecionada.',
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

  if (isEditing && (productsQuery.isLoading || categoriesQuery.isLoading)) {
    return <EditorLoading />;
  }

  if (isEditing && (productsQuery.isError || !product)) {
    return <EditorError message="Produto não encontrado." backTo={BACK_HREF} />;
  }

  return (
    <div className="space-y-6">
      <EditorBackLink to={BACK_HREF} label="Voltar para produtos" />

      <PageHeader
        title={isEditing ? 'Editar produto' : 'Novo produto'}
        description="Preencha os dados do produto e salve as imagens."
      />

      <form
        className="space-y-6"
        onSubmit={handleSubmit((fields) => {
          void saveMutation.mutateAsync(fields);
        })}
      >
        <DashboardPanel title="Dados do produto">
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
              <Label htmlFor="product-price">Preço</Label>
              <Input id="product-price" inputMode="decimal" placeholder="299.90" {...register('price')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-original-price">Preço original</Label>
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
              <Label htmlFor="product-min-stock">Estoque mínimo</Label>
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
              <Label htmlFor="product-dimensions">Dimensões</Label>
              <Input id="product-dimensions" placeholder="30x25x10 cm" {...register('dimensions')} />
            </div>

            <div className="space-y-2 xl:col-span-3">
              <Label htmlFor="product-short-desc">Descrição curta</Label>
              <Textarea id="product-short-desc" rows={3} placeholder="Resumo para cards e seções públicas." {...register('shortDesc')} />
            </div>

            <div className="space-y-2 xl:col-span-3">
              <Label htmlFor="product-description">Descrição completa</Label>
              <Textarea id="product-description" rows={5} placeholder="Descrição detalhada do produto." {...register('description')} />
            </div>
          </section>
        </DashboardPanel>

        <DashboardPanel
          title="Imagens"
          description="As imagens são recortadas em 1:1 e comprimidas antes do upload."
          action={
            <Button type="button" onClick={() => fileInputRef.current?.click()} size="sm" className="gap-2">
              <ImagePlus className="h-4 w-4" />
              Adicionar imagem
            </Button>
          }
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(event) => void handleFileChange(event)}
          />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
              <div className="rounded-lg border border-dashed border-border/70 bg-muted/30 px-5 py-10 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                Nenhuma imagem selecionada.
              </div>
            ) : null}
          </div>
        </DashboardPanel>

        <DashboardPanel title="Publicação" description="Controle onde e como o produto aparece na vitrine.">
          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm">
              <input type="checkbox" {...register('isOffer')} />
              Produto em oferta
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm">
              <input type="checkbox" {...register('isNew')} />
              Sinalizar como novidade
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm">
              <input type="checkbox" {...register('isFeatured')} />
              Exibir em destaque
            </label>
            <label className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm">
              <input type="checkbox" {...register('isActive')} />
              Produto ativo
            </label>
          </section>
        </DashboardPanel>

        <EditorFooter>
          <Button type="button" variant="outline" onClick={() => navigate(BACK_HREF)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={saveMutation.isPending || formState.isSubmitting || !categoryId}>
            {saveMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {isEditing ? 'Salvar alterações' : 'Cadastrar produto'}
          </Button>
        </EditorFooter>
      </form>

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
    </div>
  );
}
