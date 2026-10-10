import { DashboardSearch, DashboardLoading, DashboardError, DashboardEmpty } from "@/components/dashboard/DashboardList";
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Tags, Trash2 } from 'lucide-react';
import type { Category } from '@rebequi/shared/types';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { deleteCategory, fetchCategories } from '@/services/api/categories';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, EditorBackLink, PageHeader, StatCard } from './components';

function trimText(value?: string | null) {
  return value?.trim() || '';
}

export function MerchantCategoryListPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300).trim().toLowerCase();

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ['merchant-dashboard', 'categories', 'all'],
    queryFn: () => fetchCategories({ includeInactive: true }),
  });

  const refreshQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['merchant-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['categories'] }),
    ]);
  };

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

  const allCategories = data?.categories ?? [];
  const activeCategories = allCategories.filter((c) => c.isActive);
  const categoriesInUse = allCategories.filter((c) => (c.productsCount ?? 0) > 0);
  const categories = debouncedSearch
    ? allCategories.filter(
        (c) => c.name.toLowerCase().includes(debouncedSearch) || c.slug.toLowerCase().includes(debouncedSearch)
      )
    : allCategories;

  const openCreateDialog = () => navigate(`${ADMIN_BASE_PATH}/produtos/categorias/nova`);
  const openEditDialog = (category: Category) => navigate(`${ADMIN_BASE_PATH}/produtos/categorias/${category.id}/editar`);

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
      <EditorBackLink to={`${ADMIN_BASE_PATH}/produtos`} label="Voltar para produtos" />
      <PageHeader
        title="Categorias"
        description="Organize o catálogo em categorias. Produtos só podem ser cadastrados em categorias ativas."
        actions={
          <Button size="sm" onClick={openCreateDialog} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Nova categoria
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-3">
        <StatCard icon={<Tags className="h-4 w-4" />} label="Cadastradas" value={`${allCategories.length}`} tone="default" />
        <StatCard icon={<Tags className="h-4 w-4" />} label="Ativas" value={`${activeCategories.length}`} tone="green" />
        <StatCard icon={<Tags className="h-4 w-4" />} label="Em uso" value={`${categoriesInUse.length}`} tone="blue" />
      </section>

      <DashboardPanel title="Todas as categorias" accent="yellow">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <DashboardSearch value={search} onChange={setSearch} placeholder="Buscar por nome ou slug…" />
          <Button size="sm" onClick={openCreateDialog} className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Nova
          </Button>
        </div>

        {isLoading ? (
          <DashboardLoading />
        ) : isError ? (
          <DashboardError message="Não foi possível carregar categorias." onRetry={() => void refetch()} retrying={isFetching} />
        ) : categories.length === 0 ? (
          <DashboardEmpty title="Nenhum resultado encontrado" action={search ? <Button variant="outline" size="sm" onClick={() => { setSearch(''); }}>Limpar filtros</Button> : <Button size="sm" onClick={openCreateDialog}>Criar categoria</Button>} />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-lg border border-border/60 md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-medium">Categoria</TableHead>
                    <TableHead className="font-medium">Detalhes</TableHead>
                    <TableHead className="w-28 text-center font-medium">Produtos</TableHead>
                    <TableHead className="w-44 text-right font-medium">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => {
                    const productsCount = category.productsCount ?? 0;
                    const hasLinkedProducts = productsCount > 0;
                    const canDelete = !hasLinkedProducts && !deleteCategoryMutation.isPending;
                    const description = trimText(category.description) || 'Sem descrição.';
                    const icon = trimText(category.icon) || '—';

                    return (
                      <TableRow key={category.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-foreground">{category.name}</p>
                            <Badge
                              variant="outline"
                              className={category.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border/60 bg-muted text-muted-foreground'}
                            >
                              {category.isActive ? 'Ativa' : 'Inativa'}
                            </Badge>
                            {hasLinkedProducts ? (
                              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Em uso</Badge>
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
                          <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-muted px-2.5 py-0.5 text-sm font-medium tabular-nums text-foreground">
                            {productsCount}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => openEditDialog(category)} className="gap-1.5">
                              <Pencil className="h-3.5 w-3.5" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleDeleteCategory(category)}
                              disabled={!canDelete}
                              className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
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
              {categories.map((category) => {
                const productsCount = category.productsCount ?? 0;
                const hasLinkedProducts = productsCount > 0;
                const canDelete = !hasLinkedProducts && !deleteCategoryMutation.isPending;
                const description = trimText(category.description) || 'Sem descrição.';

                return (
                  <div key={category.id} className="rounded-lg border border-border/60 bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-foreground">{category.name}</h3>
                          <Badge
                            variant="outline"
                            className={category.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-border/60 bg-muted text-muted-foreground'}
                          >
                            {category.isActive ? 'Ativa' : 'Inativa'}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">Slug: {category.slug}</p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/40 px-3 py-2 text-center">
                        <p className="text-[10px] text-muted-foreground">Produtos</p>
                        <p className="text-lg font-semibold tabular-nums text-foreground">{productsCount}</p>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{description}</p>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(category)} className="gap-1.5">
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDeleteCategory(category)}
                        disabled={!canDelete}
                        className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 disabled:opacity-50"
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
    </div>
  );
}
