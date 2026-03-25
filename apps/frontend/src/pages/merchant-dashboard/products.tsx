import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, Loader2, Pencil, Plus, RefreshCcw, Search, Trash2 } from 'lucide-react';
import type { Product } from '@rebequi/shared/types';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { fetchCategories } from '@/services/api/categories';
import { deleteProduct, fetchAdminProducts } from '@/services/api/products';
import { ProductEditorDialog } from './product-editor-dialog';
import { ADMIN_BASE_PATH } from './config';
import { SectionLeadCard, StatCard } from './components';

type ProductStatusFilter = 'all' | 'active' | 'inactive';

function getPrimaryImage(product: Product) {
  return product.images?.find((image) => image.isPrimary) || product.images?.[0];
}

export function MerchantDashboardProducts() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const deferredSearch = useDeferredValue(search);

  const { data: categoriesData } = useQuery({
    queryKey: ['merchant-dashboard', 'categories'],
    queryFn: fetchCategories,
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

  const refreshQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['merchant-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['products'] }),
    ]);
  };

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      toast({
        title: 'Produto excluido',
        description: 'O produto foi removido da operacao ativa e nao aparecera mais na API publica.',
      });
      await refreshQueries();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao excluir produto',
        description: error instanceof Error ? error.message : 'Erro inesperado ao excluir o produto.',
      });
    },
  });

  const products = adminProducts?.products ?? [];
  const activeProducts = products.filter((product) => product.isActive);
  const inactiveProducts = products.filter((product) => !product.isActive);
  const featuredProducts = products.filter((product) => product.isFeatured);
  const categories = (categoriesData?.categories ?? [])
    .filter((category) => category.isActive)
    .map((category) => ({
      id: category.id,
      name: category.name,
    }));

  const openCreateDialog = () => {
    setSelectedProduct(null);
    setEditorOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setEditorOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Excluir o produto "${product.name}"?`)) {
      return;
    }

    await deleteMutation.mutateAsync(product.id);
  };

  return (
    <div className="space-y-6">
      <SectionLeadCard
        badge="CRUD persistente"
        title="Cadastro operacional de produtos"
        description="Aqui o admin cria, edita e exclui produtos com imagens tratadas no navegador, enviadas ao storage e persistidas com metadados no banco."
        tone="blue"
        actions={
          <>
            <Button onClick={openCreateDialog} className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Plus className="h-4 w-4" />
              Novo produto
            </Button>
            <Button
              variant="outline"
              onClick={() => void refetch()}
              className="gap-2 border-black/10 bg-white/80 text-foreground hover:bg-white"
            >
              <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Atualizar listagem
            </Button>
            <Button asChild variant="outline" className="border-black/10 bg-white/80 text-foreground hover:bg-white">
              <Link to={ADMIN_BASE_PATH}>Voltar ao painel</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Boxes className="h-5 w-5 text-primary" />}
          label="Produtos cadastrados"
          value={`${adminProducts?.total ?? 0}`}
          delta="Lidos da rota admin autenticada"
        />
        <StatCard
          icon={<Boxes className="h-5 w-5 text-primary" />}
          label="Produtos ativos"
          value={`${activeProducts.length}`}
          delta="Expostos na API publica"
        />
        <StatCard
          icon={<Boxes className="h-5 w-5 text-primary" />}
          label="Produtos inativos"
          value={`${inactiveProducts.length}`}
          delta="Mantidos no banco sem publicar"
        />
        <StatCard
          icon={<Boxes className="h-5 w-5 text-primary" />}
          label="Destaques"
          value={`${featuredProducts.length}`}
          delta="Prontos para a vitrine principal"
        />
      </section>

      <Card className="border-[#eadfba] bg-white/92 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
        <CardHeader className="space-y-3">
          <Badge className="w-fit border-none bg-accent text-accent-foreground">Consulta autenticada</Badge>
          <div>
            <CardTitle className="text-2xl">Operar cadastro, estoque e imagens</CardTitle>
            <CardDescription>
              A vitrine publica continua lendo produtos sem login, mas a manutencao fica concentrada aqui.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nome, SKU ou descricao"
                className="pl-9"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ProductStatusFilter)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todos os status</option>
              <option value="active">Somente ativos</option>
              <option value="inactive">Somente inativos</option>
            </select>

            <Button onClick={openCreateDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Cadastrar
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-3xl border border-black/5 bg-slate-50 px-5 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando produtos persistidos...
            </div>
          ) : null}

          {!isLoading && products.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/10 bg-slate-50 px-5 py-16 text-center text-sm text-muted-foreground">
              Nenhum produto encontrado para esse filtro.
            </div>
          ) : null}

          {!isLoading ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {products.map((product) => {
                const primaryImage = getPrimaryImage(product);

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-3xl border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] shadow-[0_20px_55px_-44px_rgba(15,23,42,0.22)]"
                  >
                    <div className="grid gap-0 md:grid-cols-[240px_1fr]">
                      <div className="relative min-h-56 bg-slate-100">
                        {primaryImage ? (
                          <img
                            src={primaryImage.url}
                            alt={primaryImage.alt || product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                            Sem imagem
                          </div>
                        )}
                        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                          <Badge className={product.isActive ? 'bg-primary text-primary-foreground' : 'bg-slate-700 text-white'}>
                            {product.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                          {product.isFeatured ? <Badge className="border-none bg-secondary text-secondary-foreground">Destaque</Badge> : null}
                          {product.isOffer ? <Badge variant="outline">Oferta</Badge> : null}
                          {product.isNew ? <Badge variant="outline">Novo</Badge> : null}
                        </div>
                      </div>

                      <div className="space-y-4 p-5">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div>
                              <h3 className="text-xl font-semibold text-foreground">{product.name}</h3>
                              <p className="text-sm text-muted-foreground">
                                {product.category?.name ?? 'Sem categoria'}{product.sku ? ` | SKU ${product.sku}` : ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Preco</p>
                              <p className="text-2xl font-bold text-foreground">R$ {product.price.toFixed(2)}</p>
                            </div>
                          </div>

                          <p className="text-sm leading-6 text-muted-foreground">
                            {product.shortDesc || product.description || 'Produto sem descricao resumida.'}
                          </p>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                          <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Estoque</p>
                            <p className="mt-1 font-semibold text-foreground">{product.stock}</p>
                          </div>
                          <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Minimo</p>
                            <p className="mt-1 font-semibold text-foreground">{product.minStock}</p>
                          </div>
                          <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Imagens</p>
                            <p className="mt-1 font-semibold text-foreground">{product.images?.length ?? 0}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          <Button onClick={() => openEditDialog(product)} className="gap-2">
                            <Pencil className="h-4 w-4" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => void handleDelete(product)}
                            disabled={deleteMutation.isPending}
                            className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <ProductEditorDialog
        open={editorOpen}
        product={selectedProduct}
        categories={categories}
        onOpenChange={(nextOpen) => {
          setEditorOpen(nextOpen);
          if (!nextOpen) {
            setSelectedProduct(null);
          }
        }}
        onSaved={() => {
          void refreshQueries();
        }}
      />
    </div>
  );
}
