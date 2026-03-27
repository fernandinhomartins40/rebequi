import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, LayoutTemplate, Megaphone, Pencil, RefreshCcw, Search, Trash2 } from 'lucide-react';
import type { Product, Promotion, PromotionResponse } from '@rebequi/shared/types';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PromotionCountdown } from '@/components/PromotionCountdown';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { fetchAdminProducts } from '@/services/api/products';
import { deletePromotion, fetchAdminPromotions } from '@/services/api/promotions';
import { formatPromotionStatusLabel, formatPromotionWindow, getPromotionStatusTone } from '@/lib/promotion-ui';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, SectionLeadCard, StatCard } from './components';
import { PromotionEditorDialog } from './promotion-editor-dialog';

type PromotionStatusFilter = 'all' | 'active' | 'scheduled' | 'expired' | 'inactive';

const SNAPSHOT_PAGE_SIZE = 100;

async function fetchAllAdminPromotionsSnapshot(): Promise<PromotionResponse> {
  const firstPage = await fetchAdminPromotions({ kind: 'collection', page: 1, limit: SNAPSHOT_PAGE_SIZE });
  const totalPages = firstPage.totalPages ?? Math.max(1, Math.ceil(firstPage.total / SNAPSHOT_PAGE_SIZE));

  if (totalPages <= 1) {
    return firstPage;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchAdminPromotions({ kind: 'collection', page: index + 2, limit: SNAPSHOT_PAGE_SIZE }),
    ),
  );

  return {
    ...firstPage,
    promotions: [firstPage.promotions, ...remainingPages.map((page) => page.promotions)].flat(),
  };
}

async function fetchAllAdminProductsSnapshot(): Promise<Product[]> {
  const firstPage = await fetchAdminProducts({ page: 1, limit: SNAPSHOT_PAGE_SIZE });
  const totalPages = firstPage.totalPages ?? Math.max(1, Math.ceil(firstPage.total / SNAPSHOT_PAGE_SIZE));

  if (totalPages <= 1) {
    return firstPage.products;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchAdminProducts({ page: index + 2, limit: SNAPSHOT_PAGE_SIZE }),
    ),
  );

  return [firstPage.products, ...remainingPages.map((page) => page.products)].flat();
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
      toast({
        title: 'Promoção excluida',
        description: 'O card promocional foi removido com sucesso.',
      });
      await refreshQueries();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao excluir promoção',
        description: error instanceof Error ? error.message : 'Erro inesperado ao excluir a promoção.',
      });
    },
  });

  const promotions = filteredPromotions?.promotions ?? [];
  const allPromotions = promotionsSnapshot?.promotions ?? [];
  const products = promotionProducts ?? [];
  const activePromotions = allPromotions.filter((promotion) => promotion.status === 'active');
  const scheduledPromotions = allPromotions.filter((promotion) => promotion.status === 'scheduled');
  const inactivePromotions = allPromotions.filter((promotion) => promotion.status === 'inactive');
  const expiredPromotions = allPromotions.filter((promotion) => promotion.status === 'expired');
  const linkedProductsCount = allPromotions.reduce((total, promotion) => total + promotion.productCount, 0);
  const canCreatePromotion = products.filter((product) => product.isActive).length >= 2;

  const openCreateDialog = () => {
    if (!canCreatePromotion) {
      toast({
        variant: 'destructive',
        title: 'Produtos insuficientes',
        description: 'Cadastre ou ative pelo menos dois produtos antes de criar uma campanha.',
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
    if (!window.confirm(`Excluir a promoção "${promotion.title}"?`)) {
      return;
    }

    await deleteMutation.mutateAsync(promotion.id);
  };

  return (
    <div className="space-y-6">
      <SectionLeadCard
        badge="Promoções"
        title="Gestão de promoções"
        description="Crie cards promocionais com validade, imagem destacada e curadoria de produtos de uma ou mais categorias."
        tone="yellow"
        actions={
          <>
            <Button onClick={openCreateDialog} className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Megaphone className="h-4 w-4" />
              Nova promoção
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
              <Link to="/promocoes">Ver página pública</Link>
            </Button>
            <Button asChild variant="outline" className="border-black/10 bg-white/80 text-foreground hover:bg-white">
              <Link to={ADMIN_BASE_PATH}>Visão geral</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          icon={<LayoutTemplate className="h-5 w-5 text-primary" />}
          label="Cards cadastrados"
          value={`${allPromotions.length}`}
          delta="Base promocional"
        />
        <StatCard
          icon={<Megaphone className="h-5 w-5 text-primary" />}
          label="Campanhas ativas"
          value={`${activePromotions.length}`}
          delta="Visiveis na vitrine"
        />
        <StatCard
          icon={<Megaphone className="h-5 w-5 text-primary" />}
          label="Agendadas"
          value={`${scheduledPromotions.length}`}
          delta="Prontas para públicar"
        />
        <StatCard
          icon={<Boxes className="h-5 w-5 text-primary" />}
          label="Produtos vinculados"
          value={`${linkedProductsCount}`}
          delta="Itens distribuidos entre campanhas"
        />
      </section>

      <DashboardPanel
        badge="Admin"
        title="Promoções cadastradas"
        description="Filtre, acompanhe o status e mantenha os cards promocionais publicados na página pública."
      >
        {!canCreatePromotion ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            Campanhas com página dedicada exigem pelo menos dois produtos ativos.
          </div>
        ) : null}

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, título ou descrição"
              className="pl-9"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as PromotionStatusFilter)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativas</option>
            <option value="scheduled">Agendadas</option>
            <option value="expired">Encerradas</option>
            <option value="inactive">Inativas</option>
          </select>

          <Button onClick={openCreateDialog} disabled={!canCreatePromotion}>
            Cadastrar
          </Button>
        </div>

        {isLoading || isLoadingProducts ? (
          <div className="flex items-center justify-center gap-2 rounded-3xl border border-black/5 bg-slate-50 px-5 py-16 text-sm text-muted-foreground">
            <RefreshCcw className="h-4 w-4 animate-spin" />
            Carregando promoções...
          </div>
        ) : null}

        {!isLoading && !isLoadingProducts && promotions.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-black/10 bg-slate-50 px-5 py-16 text-center text-sm text-muted-foreground">
            Nenhuma promoção encontrada para esse filtro.
          </div>
        ) : null}

        {!isLoading && !isLoadingProducts && promotions.length > 0 ? (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white lg:block">
              <div className="max-h-[32rem] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[38%]">Promoção</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead className="w-40 text-center">Produtos</TableHead>
                      <TableHead className="w-40 text-center">Status</TableHead>
                      <TableHead className="w-[18rem] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {promotions.map((promotion) => (
                      <TableRow key={promotion.id} className="bg-white/90">
                        <TableCell>
                          <div className="flex gap-3">
                            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-slate-50">
                              {promotion.image?.url ? (
                                <img src={promotion.image.url} alt={promotion.image.alt || promotion.title} className="h-full w-full object-cover" />
                              ) : (
                                <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem imagem</div>
                              )}
                            </div>
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-foreground">{promotion.title}</p>
                                {promotion.badgeText ? (
                                  <Badge className="border-none bg-accent text-accent-foreground">{promotion.badgeText}</Badge>
                                ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {promotion.name}
                                {promotion.slug ? ` | /promocoes/${promotion.slug}` : ''}
                              </p>
                              <p className="line-clamp-2 text-sm text-muted-foreground">
                                {promotion.subtitle || promotion.description || 'Sem descrição complementar.'}
                              </p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {promotion.categories.slice(0, 3).map((category) => (
                                  <span
                                    key={category}
                                    className="inline-flex rounded-full border border-black/5 bg-slate-50 px-3 py-1 text-xs text-foreground"
                                  >
                                    {category}
                                  </span>
                                ))}
                                {promotion.categoryCount > 3 ? (
                                  <span className="inline-flex rounded-full border border-black/5 bg-slate-50 px-3 py-1 text-xs text-foreground">
                                    +{promotion.categoryCount - 3} categorias
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            <p className="text-sm text-foreground">
                              {formatPromotionWindow({
                                startsAt: promotion.startsAt,
                                expiresAt: promotion.expiresAt,
                              })}
                            </p>
                            <PromotionCountdown expiresAt={promotion.expiresAt} compact />
                            {promotion.disclaimer ? (
                              <p className="line-clamp-2 text-xs text-muted-foreground">{promotion.disclaimer}</p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex min-w-12 items-center justify-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-foreground">
                            {promotion.productCount}
                          </span>
                          <p className="mt-2 text-xs text-muted-foreground">{promotion.categoryCount} categorias</p>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPromotionStatusTone(promotion.status)}`}>
                            {formatPromotionStatusLabel(promotion.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button size="sm" onClick={() => openEditDialog(promotion)} className="gap-2">
                              <Pencil className="h-4 w-4" />
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void handleDelete(promotion)}
                              disabled={deleteMutation.isPending}
                              className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                              Excluir
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-3 lg:hidden">
              {promotions.map((promotion) => (
                <article
                  key={promotion.id}
                  className="rounded-2xl border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-4 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.22)]"
                >
                  <div className="flex gap-3">
                    <div className="h-20 w-24 shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-slate-50">
                      {promotion.image?.url ? (
                        <img src={promotion.image.url} alt={promotion.image.alt || promotion.title} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem imagem</div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">{promotion.title}</h3>
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${getPromotionStatusTone(promotion.status)}`}>
                          {formatPromotionStatusLabel(promotion.status)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{promotion.name}</p>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {promotion.subtitle || promotion.description || 'Sem descrição complementar.'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-black/5 bg-slate-50 px-3 py-3 text-sm text-foreground">
                      <div>{formatPromotionWindow({
                        startsAt: promotion.startsAt,
                        expiresAt: promotion.expiresAt,
                      })}</div>
                      <PromotionCountdown expiresAt={promotion.expiresAt} compact className="mt-2" />
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-slate-50 px-3 py-3 text-sm text-foreground">
                      {promotion.productCount} produtos em {promotion.categoryCount} categorias
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {promotion.categories.slice(0, 3).map((category) => (
                      <span
                        key={category}
                        className="inline-flex rounded-full border border-black/5 bg-slate-50 px-3 py-1 text-xs text-foreground"
                      >
                        {category}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => openEditDialog(promotion)} className="gap-2">
                      <Pencil className="h-4 w-4" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleDelete(promotion)}
                      disabled={deleteMutation.isPending}
                      className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </DashboardPanel>

      <Card className="border-black/5 bg-white/88 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
        <CardHeader className="space-y-3">
          <Badge className="w-fit border-none bg-accent text-accent-foreground">Panorama</Badge>
          <div>
            <CardTitle className="text-xl sm:text-2xl">Radar de promoções</CardTitle>
            <CardDescription>Leitura rápida das campanhas em execucao e do backlog promocional.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-foreground">Campanhas em execucao</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {activePromotions.length > 0
                ? `${activePromotions.length} campanhas publicadas com ${activePromotions.reduce((total, promotion) => total + promotion.productCount, 0)} produtos expostos na vitrine.`
                : 'Nenhuma campanha ativa no momento.'}
            </p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-foreground">Fila de públicacao</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {scheduledPromotions.length > 0
                ? `${scheduledPromotions.length} campanhas aguardam a data de inicio configurada.`
                : 'Não existem campanhas agendadas.'}
            </p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-foreground">Manutencao pendente</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {inactivePromotions.length + expiredPromotions.length > 0
                ? `${inactivePromotions.length} inativas e ${expiredPromotions.length} encerradas podem ser revisadas ou reaproveitadas.`
                : 'Não ha campanhas encerradas ou pausadas aguardando revisão.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <PromotionEditorDialog
        kind="collection"
        open={editorOpen}
        promotion={selectedPromotion}
        products={products}
        onOpenChange={(nextOpen) => {
          setEditorOpen(nextOpen);
          if (!nextOpen) {
            setSelectedPromotion(null);
          }
        }}
        onSaved={() => {
          void refreshQueries();
        }}
      />
    </div>
  );
}
