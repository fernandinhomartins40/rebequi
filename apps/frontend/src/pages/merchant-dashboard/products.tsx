import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, Loader2, Pencil, Plus, RefreshCcw, Search, Tags, Trash2 } from 'lucide-react';
import type { Category, Product } from '@rebequi/shared/types';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { deleteCategory, fetchCategories } from '@/services/api/categories';
import { deleteProduct, fetchAdminProducts } from '@/services/api/products';
import { CategoryEditorDialog } from './category-editor-dialog';
import { ADMIN_BASE_PATH } from './config';
import { SectionLeadCard, StatCard } from './components';
import { ProductEditorDialog } from './product-editor-dialog';

type ProductStatusFilter = 'all' | 'active' | 'inactive';

function getPrimaryImage(product: Product) {
  return product.images?.find((image) => image.isPrimary) || product.images?.[0];
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

  const refreshQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['merchant-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['products'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
    ]);
  };

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: async () => {
      toast({
        title: 'Produto excluido',
        description: 'Produto removido com sucesso.',
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

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: async () => {
      toast({
        title: 'Categoria excluida',
        description: 'Categoria removida com sucesso.',
      });
      await refreshQueries();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao excluir categoria',
        description: error instanceof Error ? error.message : 'Erro inesperado ao excluir a categoria.',
      });
    },
  });

  const products = adminProducts?.products ?? [];
  const managedCategories = categoriesData?.categories ?? [];
  const activeProducts = products.filter((product) => product.isActive);
  const inactiveProducts = products.filter((product) => !product.isActive);
  const featuredProducts = products.filter((product) => product.isFeatured);
  const activeCategories = managedCategories.filter((category) => category.isActive);
  const inactiveCategories = managedCategories.filter((category) => !category.isActive);
  const categoriesInUse = managedCategories.filter((category) => (category.productsCount ?? 0) > 0);

  const categories = managedCategories
    .filter((category) => category.isActive || category.id === selectedProduct?.categoryId)
    .map((category) => ({
      id: category.id,
      name: category.isActive ? category.name : `${category.name} (inativa)`,
    }));

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

  const openCreateCategoryDialog = () => {
    setSelectedCategory(null);
    setCategoryEditorOpen(true);
  };

  const openEditCategoryDialog = (category: Category) => {
    setSelectedCategory(category);
    setCategoryEditorOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (!window.confirm(`Excluir o produto "${product.name}"?`)) {
      return;
    }

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

    if (!window.confirm(`Excluir a categoria "${category.name}"?`)) {
      return;
    }

    await deleteCategoryMutation.mutateAsync(category.id);
  };

  return (
    <div className="space-y-6">
      <SectionLeadCard
        badge="Produtos"
        title="Gestao de produtos"
        description="Cadastre, edite e remova produtos com persistencia de dados e imagens. As categorias tambem sao administradas nesta tela."
        tone="blue"
        actions={
          <>
            <Button onClick={openCreateDialog} className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Plus className="h-4 w-4" />
              Novo produto
            </Button>
            <Button
              variant="outline"
              onClick={openCreateCategoryDialog}
              className="gap-2 border-black/10 bg-white/80 text-foreground hover:bg-white"
            >
              <Tags className="h-4 w-4" />
              Nova categoria
            </Button>
            <Button
              variant="outline"
              onClick={() => void refetch()}
              className="gap-2 border-black/10 bg-white/80 text-foreground hover:bg-white"
            >
              <RefreshCcw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button asChild variant="outline" className="border-black/10 bg-white/80 text-foreground hover:bg-white">
              <Link to={ADMIN_BASE_PATH}>Visao geral</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Boxes className="h-5 w-5 text-primary" />}
          label="Produtos cadastrados"
          value={`${adminProducts?.total ?? 0}`}
          delta="Base administrativa"
        />
        <StatCard
          icon={<Boxes className="h-5 w-5 text-primary" />}
          label="Produtos ativos"
          value={`${activeProducts.length}`}
          delta="Visiveis na vitrine"
        />
        <StatCard
          icon={<Tags className="h-5 w-5 text-primary" />}
          label="Categorias ativas"
          value={`${activeCategories.length}`}
          delta="Disponiveis no formulario"
        />
        <StatCard
          icon={<Tags className="h-5 w-5 text-primary" />}
          label="Categorias em uso"
          value={`${categoriesInUse.length}`}
          delta="Com produtos vinculados"
        />
      </section>

      <Card className="border-[#eadfba] bg-white/92 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
        <CardHeader className="space-y-3">
          <Badge className="w-fit border-none bg-accent text-accent-foreground">Categorias</Badge>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">Gerenciamento de categorias</CardTitle>
              <CardDescription>Crie, edite e remova categorias usadas no cadastro e na edicao de produtos.</CardDescription>
            </div>
            <Button onClick={openCreateCategoryDialog} className="gap-2">
              <Plus className="h-4 w-4" />
              Cadastrar categoria
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {!canCreateProduct ? (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
              Nenhuma categoria ativa disponivel. Cadastre uma categoria para liberar o cadastro de produtos.
            </div>
          ) : null}

          {isLoadingCategories ? (
            <div className="flex items-center justify-center gap-2 rounded-3xl border border-black/5 bg-slate-50 px-5 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando categorias...
            </div>
          ) : null}

          {!isLoadingCategories && managedCategories.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-black/10 bg-slate-50 px-5 py-16 text-center text-sm text-muted-foreground">
              Nenhuma categoria cadastrada.
            </div>
          ) : null}

          {!isLoadingCategories ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {managedCategories.map((category) => {
                const productsCount = category.productsCount ?? 0;
                const canDeleteCategory = productsCount === 0 && !deleteCategoryMutation.isPending;

                return (
                  <article
                    key={category.id}
                    className="rounded-3xl border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-5 shadow-[0_20px_55px_-44px_rgba(15,23,42,0.22)]"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-semibold text-foreground">{category.name}</h3>
                          <Badge className={category.isActive ? 'bg-primary text-primary-foreground' : 'bg-slate-700 text-white'}>
                            {category.isActive ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Slug: {category.slug}</p>
                      </div>

                      <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3 text-right">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Produtos</p>
                        <p className="mt-1 text-xl font-bold text-foreground">{productsCount}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Icone</p>
                        <p className="mt-1 font-semibold text-foreground">{trimText(category.icon) || 'Nao definido'}</p>
                      </div>
                      <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3">
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Status no formulario</p>
                        <p className="mt-1 font-semibold text-foreground">{category.isActive ? 'Disponivel para novos produtos' : 'Oculta para novos cadastros'}</p>
                      </div>
                    </div>

                    <p className="mt-4 text-sm leading-6 text-muted-foreground">
                      {trimText(category.description) || 'Sem descricao cadastrada para esta categoria.'}
                    </p>

                    {productsCount > 0 ? (
                      <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        Esta categoria possui produtos vinculados e nao pode ser excluida.
                      </div>
                    ) : null}

                    <div className="mt-4 flex flex-wrap gap-3">
                      <Button onClick={() => openEditCategoryDialog(category)} className="gap-2">
                        <Pencil className="h-4 w-4" />
                        Editar categoria
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => void handleDeleteCategory(category)}
                        disabled={!canDeleteCategory}
                        className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir categoria
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-[#eadfba] bg-white/92 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
        <CardHeader className="space-y-3">
          <Badge className="w-fit border-none bg-accent text-accent-foreground">Admin</Badge>
          <div>
            <CardTitle className="text-2xl">Produtos cadastrados</CardTitle>
            <CardDescription>Consulta administrativa da base de produtos.</CardDescription>
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

            <Button onClick={openCreateDialog} className="gap-2" disabled={!canCreateProduct}>
              <Plus className="h-4 w-4" />
              Cadastrar
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center gap-2 rounded-3xl border border-black/5 bg-slate-50 px-5 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando produtos...
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
                      <div className="relative bg-slate-100">
                        {primaryImage ? (
                          <img
                            src={primaryImage.url}
                            alt={primaryImage.alt || product.name}
                            className="aspect-square w-full object-cover"
                          />
                        ) : (
                          <div className="flex aspect-square items-center justify-center text-sm text-muted-foreground">
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
                            {product.shortDesc || product.description || 'Sem descricao.'}
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

      <CategoryEditorDialog
        open={categoryEditorOpen}
        category={selectedCategory}
        onOpenChange={(nextOpen) => {
          setCategoryEditorOpen(nextOpen);
          if (!nextOpen) {
            setSelectedCategory(null);
          }
        }}
        onSaved={() => {
          void refreshQueries();
        }}
      />
    </div>
  );
}
