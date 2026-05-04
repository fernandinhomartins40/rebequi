import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, LayoutTemplate, Megaphone, Pencil, RefreshCcw, Search, Trash2 } from 'lucide-react';
import type { Product, Promotion, PromotionResponse } from '@rebequi/shared/types';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PromotionCountdown } from '@/components/PromotionCountdown';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { fetchAdminProducts } from '@/services/api/products';
import { deletePromotion, fetchAdminPromotions } from '@/services/api/promotions';
import { formatPromotionStatusLabel, formatPromotionWindow, getPromotionStatusTone } from '@/lib/promotion-ui';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, PageHeader, StatCard } from './components';
import { PromotionEditorDialog } from './promotion-editor-dialog';

type PromotionStatusFilter = 'all' | 'active' | 'scheduled' | 'expired' | 'inactive';

const SNAPSHOT_PAGE_SIZE = 100;

async function fetchAllAdminPromotionsSnapshot(): Promise<PromotionResponse> {
  const firstPage = await fetchAdminPromotions({ kind: 'collection', page: 1, limit: SNAPSHOT_PAGE_SIZE });
  const totalPages = firstPage.totalPages ?? Math.max(1, Math.ceil(firstPage.total / SNAPSHOT_PAGE_SIZE));

  if (totalPages <= 1) return firstPage;

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchAdminPromotions({ kind: 'collection', page: index + 2, limit: SNAPSHOT_PAGE_SIZE })
    )
  );

  return {
    ...firstPage,
    promotions: [firstPage.promotions, ...remainingPages.map((p) => p.promotions)].flat(),
  };
}

async function fetchAllAdminProductsSnapshot(): Promise<Product[]> {
  const firstPage = await fetchAdminProducts({ page: 1, limit: SNAPSHOT_PAGE_SIZE });
  const totalPages = firstPage.totalPages ?? Math.max(1, Math.ceil(firstPage.total / SNAPSHOT_PAGE_SIZE));

  if (totalPages <= 1) return firstPage.products;

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchAdminProducts({ page: index + 2, limit: SNAPSHOT_PAGE_SIZE })
    )
  );

  return [firstPage.products, ...remainingPages.map((p) => p.products)].flat();
}

export function MerchantDashboardPromotions() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PromotionStatusFilter>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const deferredSearch = useDeferredValue(search);

  const { data: promotionsSnapshot } = useQuery({
    queryKey: ['merchant-dashboard', 'promotions-snapshot'],
    queryFn: fetchAllAdminPromotionsSnapshot,
  });

  const { data: promotionProducts, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['merchant-dashboard', 'promotion-products-selection'],
    queryFn: fetchAllAdminProductsSnapshot,
  });

  const {
    data: filteredPromotions,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['merchant-dashboard', 'promotions-admin', deferredSearch, statusFilter],
    queryFn: () =>
      fetchAdminPromotions({
        kind: 'collection',
        search: deferredSearch.trim() || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        limit: 100,
      }),
  });

  const refreshQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['merchant-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['promotions'] }),
      queryClient.invalidateQueries({ queryKey: ['products'] }),
    ]);
  };

  const deleteMutation = useMutation({
    mutationFn: deletePromotion,
    onSuccess: async () => {
      toast({ title: 'Promoção excluída', description: 'Card promocional removido com sucesso.' });
      await refreshQueries();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao excluir promoção',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
      });
    },
  });

  const promotions = filteredPromotions?.promotions ?? [];
  const allPromotions = promotionsSnapshot?.promotions ?? [];
  const products = promotionProducts ?? [];
  const activePromotions = allPromotions.filter((p) => p.status === 'active');
  const scheduledPromotions = allPromotions.filter((p) => p.status === 'scheduled');
  const inactivePromotions = allPromotions.filter((p) => p.status === 'inactive');
  const expiredPromotions = allPromotions.filter((p) => p.status === 'expired');
  const linkedProductsCount = allPromotions.reduce((t, p) => t + p.productCount, 0);
  const canCreatePromotion = products.filter((p) => p.isActive).length >= 2;

  const openCreateDialog = () => {
    if (!canCreatePromotion) {
      toast({
        variant: 'destructive',
        title: 'Produtos insuficientes',
        description: 'Ative pelo menos dois produtos para criar uma campanha.',
      });
      return;
    }
    setSelectedPromotion(null);
    setEditorOpen(true);
  };

  const openEditDialog = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setEditorOpen(true);
  };

  const handleDelete = async (promotion: Promotion) => {
    if (!window.confirm(`Excluir a promoção "${promotion.title}"?`)) return;
    await deleteMutation.mutateAsync(promotion.id);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="Gestão de promoções"
        description="Crie campanhas com validade, imagem destacada e curadoria de produtos."
        actions={
          <>
            <Button onClick={openCreateDialog} size="sm" className="gap-1.5" disabled={!canCreatePromotion}>
              <Megaphone className="h-3.5 w-3.5" />
              Nova promoção
            </Button>
            <Button variant="outline" size="sm" onClick={() => void refetch()} className="gap-1.5">
              <RefreshCcw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/promocoes">Ver página pública</Link>
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<LayoutTemplate className="h-4 w-4" />}
          label="Cards cadastrados"
          value={`${allPromotions.length}`}
        />
        <StatCard
          icon={<Megaphone className="h-4 w-4" />}
          label="Campanhas ativas"
          value={`${activePromotions.length}`}
          tone={activePromotions.length > 0 ? 'green' : 'default'}
          delta="Visíveis na vitrine"
        />
        <StatCard
          icon={<Megaphone className="h-4 w-4" />}
          label="Agendadas"
          value={`${scheduledPromotions.length}`}
          tone={scheduledPromotions.length > 0 ? 'blue' : 'default'}
        />
        <StatCard
          icon={<Boxes className="h-4 w-4" />}
          label="Produtos vinculados"
          value={`${linkedProductsCount}`}
          delta="Distribuídos entre campanhas"
        />
      </section>

      {/* Status overview strip */}
      {allPromotions.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/50 bg-white px-4 py-3.5 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground">Em execução</p>
            <p className="mt-1 text-sm text-foreground">
              {activePromotions.length > 0
                ? `${activePromotions.length} campanha(s) com ${activePromotions.reduce((t, p) => t + p.productCount, 0)} produtos expostos.`
                : 'Nenhuma campanha ativa no momento.'}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-white px-4 py-3.5 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground">Aguardando publicação</p>
            <p className="mt-1 text-sm text-foreground">
              {scheduledPromotions.length > 0
                ? `${scheduledPromotions.length} campanha(s) aguardam a data configurada.`
                : 'Sem campanhas agendadas.'}
            </p>
          </div>
          <div className="rounded-xl border border-border/50 bg-white px-4 py-3.5 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground">Para revisar</p>
            <p className="mt-1 text-sm text-foreground">
              {inactivePromotions.length + expiredPromotions.length > 0
                ? `${inactivePromotions.length} inativas · ${expiredPromotions.length} encerradas aguardando revisão.`
                : 'Nenhuma campanha encerrada ou pausada.'}
            </p>
          </div>
        </div>
      ) : null}

      {/* Promotions list */}
      <DashboardPanel title="Promoções cadastradas" description="Filtre, acompanhe o status e mantenha os cards atualizados.">
        {!canCreatePromotion ? (
          <div className="mb-4 rounded-lg border border-brand-yellow/30 bg-brand-yellow/10 px-4 py-3 text-sm text-foreground">
            Ative pelo menos dois produtos para criar uma nova campanha.
          </div>
        ) : null}

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, título ou descrição…"
              className="pl-9 rounded-xl"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as PromotionStatusFilter)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm sm:w-44"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativas</option>
            <option value="scheduled">Agendadas</option>
            <option value="expired">Encerradas</option>
            <option value="inactive">Inativas</option>
          </select>
          <Button onClick={openCreateDialog} size="sm" disabled={!canCreatePromotion} className="gap-1.5">
            <Megaphone className="h-3.5 w-3.5" />
            Criar
          </Button>
        </div>

        {isLoading || isLoadingProducts ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : promotions.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/40 py-10 text-center text-sm text-muted-foreground">
            Nenhuma promoção encontrada para esse filtro.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-lg border border-border/50 xl:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="font-semibold">Promoção</TableHead>
                    <TableHead className="font-semibold">Validade</TableHead>
                    <TableHead className="w-32 text-center font-semibold">Produtos</TableHead>
                    <TableHead className="w-32 text-center font-semibold">Status</TableHead>
                    <TableHead className="w-36 text-right font-semibold">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promotions.map((promotion) => (
                    <TableRow key={promotion.id} className="hover:bg-muted/50/60">
                      <TableCell>
                        <div className="flex gap-3">
                          <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted/50">
                            {promotion.image?.url ? (
                              <img src={promotion.image.url} alt={promotion.image.alt || promotion.title} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem img.</div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="font-medium text-foreground">{promotion.title}</p>
                              {promotion.badgeText ? (
                                <Badge variant="outline" className="text-[10px]">{promotion.badgeText}</Badge>
                              ) : null}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {promotion.name}{promotion.slug ? ` · /promocoes/${promotion.slug}` : ''}
                            </p>
                            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                              {promotion.subtitle || promotion.description || 'Sem descrição.'}
                            </p>
                            <div className="mt-1 flex flex-wrap gap-1">
                              {promotion.categories.slice(0, 3).map((cat) => (
                                <span key={cat} className="inline-flex rounded-full border border-border/40 bg-muted/50 px-2 py-0.5 text-[10px] text-foreground">
                                  {cat}
                                </span>
                              ))}
                              {promotion.categoryCount > 3 ? (
                                <span className="inline-flex rounded-full border border-border/40 bg-muted/50 px-2 py-0.5 text-[10px] text-muted-foreground">
                                  +{promotion.categoryCount - 3}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-xs text-foreground">
                          {formatPromotionWindow({ startsAt: promotion.startsAt, expiresAt: promotion.expiresAt })}
                        </p>
                        <PromotionCountdown expiresAt={promotion.expiresAt} compact />
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex min-w-[2rem] items-center justify-center rounded-full bg-muted px-2.5 py-0.5 text-sm font-semibold text-foreground">
                          {promotion.productCount}
                        </span>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">{promotion.categoryCount} cat.</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getPromotionStatusTone(promotion.status)}`}>
                          {formatPromotionStatusLabel(promotion.status)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditDialog(promotion)} className="gap-1.5">
                            <Pencil className="h-3.5 w-3.5" />
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void handleDelete(promotion)}
                            disabled={deleteMutation.isPending}
                            className="gap-1.5 border-brand-red/20 text-brand-red hover:bg-brand-red/5 hover:text-brand-red"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 xl:hidden">
              {promotions.map((promotion) => (
                <article key={promotion.id} className="overflow-hidden rounded-xl border border-border/50 bg-white shadow-sm">
                  <div className="flex gap-3 p-4">
                    <div className="h-20 w-24 shrink-0 overflow-hidden rounded-lg border border-border/40 bg-muted/50">
                      {promotion.image?.url ? (
                        <img src={promotion.image.url} alt={promotion.image.alt || promotion.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem img.</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="font-semibold text-foreground">{promotion.title}</h3>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getPromotionStatusTone(promotion.status)}`}>
                          {formatPromotionStatusLabel(promotion.status)}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">{promotion.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {promotion.subtitle || promotion.description || 'Sem descrição.'}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-0 border-t border-border/40">
                    <div className="border-r border-border/40 px-4 py-2.5">
                      <p className="text-[10px] font-semibold text-muted-foreground">Validade</p>
                      <p className="mt-0.5 text-xs text-foreground">
                        {formatPromotionWindow({ startsAt: promotion.startsAt, expiresAt: promotion.expiresAt })}
                      </p>
                    </div>
                    <div className="px-4 py-2.5">
                      <p className="text-[10px] font-semibold text-muted-foreground">Produtos</p>
                      <p className="mt-0.5 text-xs text-foreground">
                        {promotion.productCount} em {promotion.categoryCount} cat.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 border-t border-border/40 px-4 py-3">
                    <Button size="sm" variant="outline" onClick={() => openEditDialog(promotion)} className="gap-1.5">
                      <Pencil className="h-3.5 w-3.5" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleDelete(promotion)}
                      disabled={deleteMutation.isPending}
                      className="gap-1.5 border-brand-red/20 text-brand-red hover:bg-brand-red/5 hover:text-brand-red"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Excluir
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </DashboardPanel>

      <PromotionEditorDialog
        kind="collection"
        open={editorOpen}
        promotion={selectedPromotion}
        products={products}
        onOpenChange={(nextOpen) => {
          setEditorOpen(nextOpen);
          if (!nextOpen) setSelectedPromotion(null);
        }}
        onSaved={() => { void refreshQueries(); }}
      />
    </div>
  );
}
