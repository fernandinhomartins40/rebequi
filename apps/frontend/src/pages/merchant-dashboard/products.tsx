import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, Clock3, Pencil, Plus, RefreshCcw, Search, Tags, Trash2 } from 'lucide-react';
import type { Product, Promotion } from '@rebequi/shared/types';
import { useNavigate } from 'react-router-dom';
import { PromotionCountdown } from '@/components/PromotionCountdown';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { formatPromotionStatusLabel, getPromotionStatusTone } from '@/lib/promotion-ui';
import { fetchCategories } from '@/services/api/categories';
import { deleteProduct, fetchAdminProducts } from '@/services/api/products';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, PageHeader, StatCard } from './components';
import { fetchAllAdminPromotionsSnapshot, buildSingleProductOfferMap, pickPrimaryPromotion } from './promotion-admin';

type ProductStatusFilter = 'all' | 'active' | 'inactive';

function getPrimaryImage(product: Product) {
  return product.images?.find((img) => img.isPrimary) || product.images?.[0];
}

function trimText(value?: string | null) {
  return value?.trim() || '';
}

export function MerchantDashboardProducts() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('all');
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

  const products = adminProducts?.products ?? [];
  const singleProductOffers = offersSnapshot?.promotions ?? [];
  const singleProductOffersByProduct = buildSingleProductOfferMap(singleProductOffers);
  const managedCategories = categoriesData?.categories ?? [];
  const activeProducts = products.filter((p) => p.isActive);
  const activeCategories = managedCategories.filter((c) => c.isActive);
  const categoriesInUse = managedCategories.filter((c) => (c.productsCount ?? 0) > 0);
  const activeSingleProductOffers = singleProductOffers.filter((o) => o.status === 'active');
  const productsWithSingleProductOffer = Array.from(singleProductOffersByProduct.keys()).length;

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
    navigate(`${ADMIN_BASE_PATH}/produtos/novo`);
  };

  const openEditDialog = (product: Product) => {
    navigate(`${ADMIN_BASE_PATH}/produtos/${product.id}/editar`);
  };

  const openOfferDialog = (product: Product, _offer?: Promotion | null) => {
    if (!product.isActive) {
      toast({
        variant: 'destructive',
        title: 'Produto inativo',
        description: 'Ative o produto antes de publicar uma oferta individual.',
      });
      return;
    }
    navigate(`${ADMIN_BASE_PATH}/produtos/${product.id}/oferta`);
  };

  const openCreateCategoryDialog = () => {
    navigate(`${ADMIN_BASE_PATH}/produtos/categorias/nova`);
  };

  const openManageCategories = () => {
    navigate(`${ADMIN_BASE_PATH}/produtos/categorias`);
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Excluir o produto "${product.name}"?`)) return;
    await deleteMutation.mutateAsync(product.id);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="Gestão de produtos"
        description="Cadastre, edite e remova produtos, categorias e ofertas individuais."
        actions={
          <>
            <Button onClick={openCreateDialog} size="sm" className="gap-1.5" disabled={!canCreateProduct}>
              <Plus className="h-3.5 w-3.5" />
              Novo produto
            </Button>
            <Button variant="outline" size="sm" onClick={openManageCategories} className="gap-1.5">
              <Tags className="h-3.5 w-3.5" />
              Categorias
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              className="gap-1.5"
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

      {/* Categories — resumo compacto com acesso à página dedicada */}
      <div className="rounded-xl border border-border/70 bg-card p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
              <Tags className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Categorias</p>
              <p className="text-xs text-muted-foreground">
                {isLoadingCategories
                  ? 'Carregando…'
                  : `${managedCategories.length} cadastradas · ${activeCategories.length} ativas · ${categoriesInUse.length} em uso`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" onClick={openManageCategories} className="gap-1.5">
              <Tags className="h-3.5 w-3.5" />
              Gerenciar
            </Button>
            <Button size="sm" onClick={openCreateCategoryDialog} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Nova
            </Button>
          </div>
        </div>

        {!canCreateProduct && !isLoadingCategories ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Nenhuma categoria ativa. Cadastre uma categoria para liberar o cadastro de produtos.
          </div>
        ) : null}
      </div>

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
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProductStatusFilter)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-44"
          >
            <option value="all">Todos os status</option>
            <option value="active">Somente ativos</option>
            <option value="inactive">Somente inativos</option>
          </select>
          <Button onClick={openCreateDialog} size="sm" className="gap-1.5" disabled={!canCreateProduct}>
            <Plus className="h-3.5 w-3.5" />
            Cadastrar
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/70 py-10 text-center text-sm text-muted-foreground">
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
                  className="overflow-hidden rounded-xl border border-border/70 bg-card transition-colors hover:border-border"
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
                          className={product.isActive ? 'bg-emerald-600 text-white' : 'bg-muted-foreground text-white'}
                        >
                          {product.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-3.5">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {product.isFeatured ? <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 text-[10px]">Destaque</Badge> : null}
                          {product.isOffer ? <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px]">Oferta</Badge> : null}
                          {product.isNew ? <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]">Novo</Badge> : null}
                        </div>
                        <h3 className="mt-1 line-clamp-2 text-[15px] font-semibold leading-tight text-foreground">
                          {product.name}
                        </h3>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {product.category?.name ?? 'Sem categoria'}
                          {product.sku ? ` · SKU ${product.sku}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <p className="text-lg font-semibold tabular-nums text-foreground">R$ {product.price.toFixed(2)}</p>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={`font-medium ${product.stock <= 0 ? 'text-red-600' : product.stock <= product.minStock ? 'text-amber-600' : 'text-foreground'}`}>
                            Estoque: {product.stock}
                          </span>
                          <span>·</span>
                          <span>Mín: {product.minStock}</span>
                        </div>
                      </div>

                      {/* Offer section */}
                      <div className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium text-foreground">Oferta individual</p>
                            {primaryOffer ? (
                              <div className="mt-0.5 flex items-center gap-1.5">
                                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${getPromotionStatusTone(primaryOffer.status)}`}>
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
                            className="shrink-0 gap-1.5 text-xs"
                          >
                            <Clock3 className="h-3 w-3" />
                            {primaryOffer ? 'Editar' : 'Criar'}
                          </Button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(product)} className="gap-1.5">
                          <Pencil className="h-3.5 w-3.5" />
                          Editar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleDelete(product)}
                          disabled={deleteMutation.isPending}
                          className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
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

    </div>
  );
}
