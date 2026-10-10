import { DashboardSearch } from "@/components/dashboard/DashboardList";
import { DashboardLoading, DashboardError, DashboardEmpty } from "@/components/dashboard/DashboardList";
import { useDeferredValue, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock3, Pencil, Plus, RefreshCcw, Tags, Trash2, MoreHorizontal } from 'lucide-react';
import type { Product } from '@rebequi/shared/types';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { formatPromotionStatusLabel } from '@/lib/promotion-ui';
import { formatCurrency } from '@/lib/sale-ui';
import { DashboardCatalogRecord, DashboardThumbnail, DashboardPagination } from '@/components/dashboard/DashboardCatalog';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { fetchCategories } from '@/services/api/categories';
import { deleteProduct, fetchAdminProducts } from '@/services/api/products';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, PageHeader } from './components';
import { fetchAllAdminPromotionsSnapshot, buildSingleProductOfferMap, pickPrimaryPromotion } from './promotion-admin';

type ProductStatusFilter = 'all' | 'active' | 'inactive';

function getPrimaryImage(product: Product) {
  return product.images?.find((img) => img.isPrimary) || product.images?.[0];
}


export function MerchantDashboardProducts() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('all');
  const [page, setPage] = useState(1);
  const pageSize = 12;
  const deferredSearch = useDeferredValue(search);

  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['merchant-dashboard', 'categories', 'all'],
    queryFn: () => fetchCategories({ includeInactive: true }),
  });

  const {
    data: adminProducts,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['merchant-dashboard', 'products-admin', deferredSearch, statusFilter, page],
    queryFn: () =>
      fetchAdminProducts({
        search: deferredSearch.trim() || undefined,
        isActive: statusFilter === 'all' ? undefined : statusFilter === 'active',
        limit: pageSize,
        page,
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
  const activeCategories = managedCategories.filter((c) => c.isActive);
  const activeSingleProductOffers = singleProductOffers.filter((o) => o.status === 'active');
  useEffect(() => {
    if (adminProducts && page > Math.max(1, adminProducts.totalPages)) setPage(Math.max(1, adminProducts.totalPages));
  }, [adminProducts, page]);
  const changePage = (next: number) => {
    setPage(next);
    document.getElementById('product-list')?.scrollIntoView({ block: 'start', behavior: 'instant' });
  };
  const changeSearch = (value: string) => { setSearch(value); setPage(1); };
  const changeStatus = (value: ProductStatusFilter) => { setStatusFilter(value); setPage(1); };

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

  const openOfferDialog = (product: Product) => {
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
        title="Produtos"
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

      <div className="dashboard-catalog-summary">
        <span><strong>{adminProducts?.total ?? '—'}</strong> {search || statusFilter !== 'all' ? 'resultados' : 'produtos'}</span>
        <span><strong>{activeSingleProductOffers.length}</strong> ofertas ativas</span>
        <span><strong>{activeCategories.length}</strong> categorias ativas</span>
      </div>
      {!canCreateProduct && !isLoadingCategories ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
        Cadastre uma categoria ativa para adicionar produtos.
        <Button variant="outline" size="sm" onClick={openCreateCategoryDialog} className="ml-2">Criar categoria</Button>
      </div> : null}

      {/* Products */}
      <DashboardPanel id="product-list" title="Catálogo" contentClassName="dashboard-catalog-content" action={<span className="text-xs text-muted-foreground">12 por página</span>}>
        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <DashboardSearch value={search} onChange={changeSearch} placeholder="Buscar por nome, SKU ou descrição…" />
          <select
            value={statusFilter}
            aria-label="Status dos produtos" onChange={(e) => changeStatus(e.target.value as ProductStatusFilter)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-44"
          >
            <option value="all">Todos os status</option>
            <option value="active">Somente ativos</option>
            <option value="inactive">Somente inativos</option>
          </select>

        </div>

        {isLoading ? (
          <DashboardLoading />
        ) : isError ? (
          <DashboardError message="Não foi possível carregar produtos." onRetry={() => void refetch()} retrying={isFetching} />
        ) : products.length === 0 ? (
          <DashboardEmpty title="Nenhum resultado encontrado" description="Nenhum produto encontrado para esse filtro." action={search || statusFilter !== 'all' ? <Button variant="outline" size="sm" onClick={() => { changeSearch(''); changeStatus('all'); }}>Limpar filtros</Button> : <Button size="sm" onClick={openCreateDialog} disabled={!canCreateProduct}>Cadastrar produto</Button>} />
        ) : (
          <>
            <div className="dashboard-catalog-header" aria-hidden="true"><span>Produto</span><span>Preço</span><span>Estoque</span><span>Situação</span><span className="text-right">Ações</span></div>
            <div aria-busy={isFetching}>
              {products.map((product) => {
                const image = getPrimaryImage(product);
                const offer = pickPrimaryPromotion(singleProductOffersByProduct.get(product.id) ?? []);
                return <DashboardCatalogRecord key={product.id}
                  image={<DashboardThumbnail key={image?.url ?? product.id} src={image?.url} alt={product.name} />}
                  title={<Link to={`${ADMIN_BASE_PATH}/produtos/${product.id}/editar`}>{product.name}</Link>}
                  subtitle={<>{product.category?.name ?? 'Sem categoria'}{product.sku ? <span className="block">SKU {product.sku}</span> : null}</>}
                  price={formatCurrency(product.price)}
                  stock={<><strong className={product.stock <= 0 ? 'text-red-700' : product.stock <= product.minStock ? 'text-amber-700' : ''}>{product.stock} un.</strong><span className="text-muted-foreground">{product.stock <= 0 ? 'Sem estoque' : product.stock <= product.minStock ? 'Estoque baixo' : `Mínimo ${product.minStock}`}</span></>}
                  status={<><Badge variant="outline" className={product.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'}>{product.isActive ? 'Ativo' : 'Inativo'}</Badge>{offer ? <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">{offer.status === 'active' ? 'Em oferta' : formatPromotionStatusLabel(offer.status)}</Badge> : product.isOffer ? <Badge variant="outline">Oferta</Badge> : null}</>}
                  actions={<>
                    <Button variant="outline" size="sm" onClick={() => openEditDialog(product)} aria-label={`Editar ${product.name}`}>Editar</Button>
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label={`Mais ações para ${product.name}`}><MoreHorizontal size={18} /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => openEditDialog(product)}><Pencil size={15} className="mr-2" />Editar produto</DropdownMenuItem>
                        <DropdownMenuItem disabled={!product.isActive} onSelect={() => openOfferDialog(product)}><Clock3 size={15} className="mr-2" />{offer ? 'Gerenciar oferta' : 'Criar oferta'}</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem disabled={deleteMutation.isPending} onSelect={() => void handleDelete(product)} className="text-red-700"><Trash2 size={15} className="mr-2" />Excluir produto</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </>}
                />;
              })}
            </div>
            <DashboardPagination page={page} total={adminProducts?.total ?? 0} pageSize={pageSize} onChange={changePage} busy={isFetching} />
          </>
        )}
      </DashboardPanel>
    </div>
  );
}
