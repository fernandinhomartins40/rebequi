import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, Clock3, Loader2, Pencil, Plus, RefreshCcw, Search, Tags, Trash2 } from 'lucide-react';
import type { Category, Product, Promotion } from '@rebequi/shared/types';
import { Link } from 'react-router-dom';
import { PromotionCountdown } from '@/components/PromotionCountdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { formatPromotionStatusLabel, getPromotionStatusTone } from '@/lib/promotion-ui';
import { deleteCategory, fetchCategories } from '@/services/api/categories';
import { deleteProduct, fetchAdminProducts } from '@/services/api/products';
import { CategoryEditorDialog } from './category-editor-dialog';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, PageHeader, SectionHeader, StatCard } from './components';
import { ProductEditorDialog } from './product-editor-dialog';
import { fetchAllAdminPromotionsSnapshot, buildSingleProductOfferMap, pickPrimaryPromotion } from './promotion-admin';
import { PromotionEditorDialog } from './promotion-editor-dialog';

type ProductStatusFilter = 'all' | 'active' | 'inactive';

function getPrimaryImage(product: Product) {
  return product.images?.find((img) => img.isPrimary) || product.images?.[0];
}

function trimText(value?: string | null) {
  return value?.trim() || '';
}

export function MerchantDashboardProducts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [categoryEditorOpen, setCategoryEditorOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [offerEditorOpen, setOfferEditorOpen] = useState(false);
  const [selectedOfferProduct, setSelectedOfferProduct] = useState<Product | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<Promotion | null>(null);
  const deferredSearch = useDeferredValue(search);

  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['merchant-dashboard', 'categories', 'all'],
    queryFn: () => fetchCategories({ includeInactive: true }),
  });

  const {
    data: adminProducts,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['merchant-dashboard', 'products-admin', deferredSearch, statusFilter],
    queryFn: () =>
      fetchAdminProducts({
        search: deferredSearch.trim() || undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
        limit: 100,
      }),
  });

  const { data: offersSnapshot } = useQuery({
    queryKey: ['merchant-dashboard', 'single-product-offers-snapshot'],
    queryFn: () => fetchAllAdminPromotionsSnapshot('single_product'),
  });

  const refreshQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['merchant-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
      queryClient.invalidateQueries({ queryKey: ['promotions'] }),
    ]);
  };

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      toast({ title: 'Produto excluído', description: 'Produto removido com sucesso.' });
      await refreshQueries();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao excluir produto',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
      });
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: async () => {
      toast({ title: 'Categoria excluída', description: 'Categoria removida com sucesso.' });
      await refreshQueries();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao excluir categoria',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
      });
    },
  });

  const products = adminProducts?.products ?? [];
  const singleProductOffers = offersSnapshot?.promotions ?? [];
  const singleProductOffersByProduct = buildSingleProductOfferMap(singleProductOffers);
  const managedCategories = categoriesData?.categories ?? [];
  const activeProducts = products.filter((p) => p.isActive);
  const activeCategories = managedCategories.filter((c) => c.isActive);
  const categoriesInUse = managedCategories.filter((c) => (c.productsCount ?? 0) > 0);
  const activeSingleProductOffers = singleProductOffers.filter((o) => o.status === 'active');
  const productsWithSingleProductOffer = Array.from(singleProductOffersByProduct.keys()).length;

  const categories = managedCategories
    .filter((c) => c.isActive || c.id === selectedProduct?.categoryId)
    .map((c) => ({ id: c.id, name: c.isActive ? c.name : `${c.name} (inativa)` }));

  const canCreateProduct = activeCategories.length > 0;

  const openCreateDialog = () => {
    if (!canCreateProduct) {
      toast({
        variant: 'destructive',
        title: 'Cadastre uma categoria antes',
        description: 'Crie pelo menos uma categoria ativa para cadastrar produtos.',
      });
      return;
    }
    setSelectedProduct(null);
    setEditorOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setEditorOpen(true);
  };

  const openOfferDialog = (product: Product, offer?: Promotion | null) => {
    if (!product.isActive) {
      toast({
        variant: 'destructive',
        title: 'Produto inativo',
        description: 'Ative o produto antes de publicar uma oferta individual.',
      });
      return;
    }
    setSelectedOfferProduct(product);
    setSelectedOffer(offer ?? null);
    setOfferEditorOpen(true);
  };

  const openCreateCategoryDialog = () => {
    setSelectedCategory(null);
    setCategoryEditorOpen(true);
  };

  const openEditCategoryDialog = (category: Category) => {
    setSelectedCategory(category);
    setCategoryEditorOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Excluir o produto "${product.name}"?`)) return;
    await deleteMutation.mutateAsync(product.id);
  };

  const handleDeleteCategory = async (category: Category) => {
    if ((category.productsCount ?? 0) > 0) {
      toast({
        variant: 'destructive',
        title: 'Categoria em uso',
        description: 'Remova ou recategorize os produtos vinculados antes de excluir a categoria.',
      });
      return;
    }
    if (!window.confirm(`Excluir a categoria "${category.name}"?`)) return;
    await deleteCategoryMutation.mutateAsync(category.id);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="Gestão de produtos"
        description="Cadastre, edite e remova produtos, categorias e ofertas individuais."
        actions={
          <>
            <Button onClick={openCreateDialog} size="sm" className="gap-1.5 rounded-xl" disabled={!canCreateProduct}>
              <Plus className="h-3.5 w-3.5" />
              Novo produto
            </Button>
            <Button variant="outline" size="sm" onClick={openCreateCategoryDialog} className="gap-1.5 rounded-xl">
              <Tags className="h-3.5 w-3.5" />
              Nova categoria
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="gap-1.5 rounded-xl"
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Boxes className="h-4 w-4" />}
          label="Produtos cadastrados"
          value={`${adminProducts?.total ?? 0}`}
          tone="default"
        />
        <StatCard
          icon={<Boxes className="h-4 w-4" />}
          label="Produtos ativos"
          value={`${activeProducts.length}`}
          tone="green"
          delta="Visíveis na vitrine"
        />
        <StatCard
          icon={<Clock3 className="h-4 w-4" />}
          label="Com oferta individual"
          value={`${productsWithSingleProductOffer}`}
          tone="blue"
        />
        <StatCard
          icon={<Clock3 className="h-4 w-4" />}
          label="Ofertas ativas agora"
          value={`${activeSingleProductOffers.length}`}
          tone={activeSingleProductOffers.length > 0 ? 'yellow' : 'default'}
        />
      </section>

      {/* Categories */}
      <DashboardPanel
        title="Categorias"
        description={`${managedCategories.length} cadastradas · ${activeCategories.length} ativas · ${categoriesInUse.length} em uso`}
        accent="yellow"
        action={
          <Button size="sm" onClick={openCreateCategoryDialog} className="gap-1.5 rounded-xl">
            <Plus className="h-3.5 w-3.5" />
            Nova
          </Button>
        }
      >
        {!canCreateProduct ? (
          <div className="mb-4 rounded-xl border border-brand-yellow/30 bg-brand-yellow/10 px-4 py-3 text-sm text-foreground">
            Nenhuma categoria ativa. Cadastre uma categoria para liberar o cadastro de produtos.
          </div>
        ) : null}

        {isLoadingCategories ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Carregando categorias…
          </div>
        ) : managedCategories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Nenhuma categoria cadastrada.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-border/50 md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-bold">Categoria</TableHead>
                    <TableHead className="font-bold">Detalhes</TableHead>
                    <TableHead className="w-28 text-center font-bold">Produtos</TableHead>
                    <TableHead className="w-44 text-right font-bold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {managedCategories.map((category) => {
                    const productsCount = category.productsCount ?? 0;
                    const hasLinkedProducts = productsCount > 0;
                    const canDelete = !hasLinkedProducts && !deleteCategoryMutation.isPending;
                    const description = trimText(category.description) || 'Sem descrição.';
                    const icon = trimText(category.icon) || '—';

                    return (
                      <TableRow key={category.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-bold text-foreground">{category.name}</p>
                            <Badge
                              variant="outline"
                              className={category.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-border/60 bg-muted text-muted-foreground'}
                            >
                              {category.isActive ? 'Ativa' : 'Inativa'}
                            </Badge>
                            {hasLinkedProducts ? (
                              <Badge variant="outline" className="border-brand-yellow/30 bg-brand-yellow/10 text-foreground">Em uso</Badge>
                            ) : null}
                          </div>
                          <p className="mt-0.5 max-w-xs truncate text-xs text-muted-foreground" title={description}>
                            {description}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground">Slug: <span className="font-mono font-medium text-foreground">{category.slug}</span></p>
                          <p className="text-xs text-muted-foreground">Ícone: <span className="font-medium text-foreground">{icon}</span></p>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-muted px-2.5 py-0.5 text-sm font-bold text-foreground">
                            {productsCount}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditCategoryDialog(category)} className="gap-1.5 rounded-lg">
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleDeleteCategory(category)}
                              disabled={!canDelete}
                              className="gap-1.5 rounded-lg border-brand-red/20 text-brand-red hover:bg-brand-red/5 hover:text-brand-red disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Excluir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-2 md:hidden">
              {managedCategories.map((category) => {
                const productsCount = category.productsCount ?? 0;
                const hasLinkedProducts = productsCount > 0;
                const canDelete = !hasLinkedProducts && !deleteCategoryMutation.isPending;
                const description = trimText(category.description) || 'Sem descrição.';

                return (
                  <div
                    key={category.id}
                    className="rounded-xl border border-border/50 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-bold text-foreground">{category.name}</h3>
                          <Badge
                            variant="outline"
                            className={category.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-border/60 bg-muted text-muted-foreground'}
                          >
                            {category.isActive ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">Slug: {category.slug}</p>
                      </div>
                      <div className="rounded-lg border border-border/40 bg-muted/50 px-3 py-2 text-center">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Produtos</p>
                        <p className="text-lg font-extrabold text-foreground">{productsCount}</p>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{description}</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditCategoryDialog(category)} className="gap-1.5 rounded-lg">
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDeleteCategory(category)}
                        disabled={!canDelete}
                        className="gap-1.5 rounded-lg border-brand-red/20 text-brand-red hover:bg-brand-red/5 hover:text-brand-red disabled:opacity-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Excluir
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </DashboardPanel>

      {/* Products */}
      <DashboardPanel title="Produtos cadastrados" description="Gerencie seus produtos, preços e ofertas." accent="blue">
        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, SKU ou descrição…"
              className="pl-9 rounded-xl"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProductStatusFilter)}
            className="h-10 rounded-xl border border-input bg-background px-3 py-2 text-sm sm:w-44"
          >
            <option value="all">Todos os status</option>
            <option value="active">Somente ativos</option>
            <option value="inactive">Somente inativos</option>
          </select>
          <Button onClick={openCreateDialog} size="sm" className="gap-1.5 rounded-xl" disabled={!canCreateProduct}>
            <Plus className="h-3.5 w-3.5" />
            Cadastrar
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            Nenhum produto encontrado para esse filtro.
          </div>
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
            {products.map((product) => {
              const primaryImage = getPrimaryImage(product);
              const productSummary = product.shortDesc || product.description || 'Sem descrição.';
              const productOffers = singleProductOffersByProduct.get(product.id) ?? [];
              const primaryOffer = pickPrimaryPromotion(productOffers);

              return (
                <article
                  key={product.id}
                  className="overflow-hidden rounded-2xl bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex gap-0">
                    {/* Image */}
                    <div className="relative w-28 shrink-0 bg-muted sm:w-36">
                      {primaryImage ? (
                        <img
                          src={primaryImage.url}
                          alt={primaryImage.alt || product.name}
                          className="h-full w-full object-cover"
                          style={{ minHeight: '9rem' }}
                        />
                      ) : (
                        <div className="flex h-full min-h-36 w-full items-center justify-center text-xs text-muted-foreground">
                          Sem imagem
                        </div>
                      )}
                      <div className="absolute left-2 top-2 flex flex-col gap-1">
                        <Badge
                          className={product.isActive ? 'bg-emerald-600 text-white rounded-lg' : 'bg-muted-foreground text-white rounded-lg'}
                        >
                          {product.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3.5">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {product.isFeatured ? <Badge variant="outline" className="border-brand-blue/20 bg-brand-blue/5 text-brand-blue text-[10px] rounded-lg">Destaque</Badge> : null}
                          {product.isOffer ? <Badge variant="outline" className="border-brand-yellow/30 bg-brand-yellow/10 text-foreground text-[10px] rounded-lg">Oferta</Badge> : null}
                          {product.isNew ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-600 text-[10px] rounded-lg">Novo</Badge> : null}
                        </div>
                        <h3 className="mt-1 line-clamp-2 text-[15px] font-bold leading-tight text-foreground">
                          {product.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {product.category?.name ?? 'Sem categoria'}
                          {product.sku ? ` · SKU ${product.sku}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <p className="text-lg font-bold text-foreground">R$ {product.price.toFixed(2)}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={`font-bold ${product.stock <= 0 ? 'text-brand-red' : product.stock <= product.minStock ? 'text-brand-yellow' : 'text-foreground'}`}>
                            Estoque: {product.stock}
                          </span>
                          <span>·</span>
                          <span>Mín: {product.minStock}</span>
                        </div>
                      </div>

                      {/* Offer section */}
                      <div className="rounded-xl border border-border/40 bg-muted/30 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-bold text-foreground">Oferta individual</p>
                            {primaryOffer ? (
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[10px] font-bold ${getPromotionStatusTone(primaryOffer.status)}`}>
                                  {formatPromotionStatusLabel(primaryOffer.status)}
                                </span>
                                <PromotionCountdown expiresAt={primaryOffer.expiresAt} compact />
                              </div>
                            ) : (
                              <p className="text-[11px] text-muted-foreground">Nenhuma oferta ativa</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant={primaryOffer ? 'outline' : 'default'}
                            onClick={() => openOfferDialog(product, primaryOffer)}
                            disabled={!product.isActive}
                            className="shrink-0 gap-1.5 text-xs rounded-xl"
                          >
                            <Clock3 className="h-3 w-3" />
                            {primaryOffer ? 'Editar' : 'Criar'}
                          </Button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(product)} className="gap-1.5 rounded-lg">
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleDelete(product)}
                          disabled={deleteMutation.isPending}
                          className="gap-1.5 rounded-lg border-brand-red/20 text-brand-red hover:bg-brand-red/5 hover:text-brand-red"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </DashboardPanel>

      <ProductEditorDialog
        open={editorOpen}
        product={selectedProduct}
        categories={categories}
        onOpenChange={(nextOpen) => {
          setEditorOpen(nextOpen);
          if (!nextOpen) setSelectedProduct(null);
        }}
        onSaved={() => { void refreshQueries(); }}
      />

      <PromotionEditorDialog
        kind="single_product"
        mode="quick-single-product"
        open={offerEditorOpen}
        promotion={selectedOffer}
        products={products}
        initialProductId={selectedOfferProduct?.id}
        onOpenChange={(nextOpen) => {
          setOfferEditorOpen(nextOpen);
          if (!nextOpen) {
            setSelectedOfferProduct(null);
            setSelectedOffer(null);
          }
        }}
        onSaved={() => { void refreshQueries(); }}
      />

      <CategoryEditorDialog
        open={categoryEditorOpen}
        category={selectedCategory}
        onOpenChange={(nextOpen) => {
          setCategoryEditorOpen(nextOpen);
          if (!nextOpen) setSelectedCategory(null);
        }}
        onSaved={() => { void refreshQueries(); }}
      />
    </div>
  );
}
