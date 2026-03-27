import { useDeferredValue, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Boxes, Clock3, Megaphone, Pencil, RefreshCcw, Search, Tag, Trash2 } from 'lucide-react';
import type { Product, Promotion } from '@rebequi/shared/types';
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
import { fetchAllAdminPromotionsSnapshot } from './promotion-admin';
import { PromotionEditorDialog } from './promotion-editor-dialog';

type PromotionStatusFilter = 'all' | 'active' | 'scheduled' | 'expired' | 'inactive';

const SNAPSHOT_PAGE_SIZE = 100;

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

export function MerchantDashboardOffers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<PromotionStatusFilter>('all');
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState<Promotion | null>(null);
  const deferredSearch = useDeferredValue(search);

  const { data: offersSnapshot } = useQuery({
    queryKey: ['merchant-dashboard', 'offers-snapshot'],
    queryFn: () => fetchAllAdminPromotionsSnapshot('single_product'),
  });

  const { data: offerProducts, isLoading: isLoadingProducts } = useQuery({
    queryKey: ['merchant-dashboard', 'offer-products-selection'],
    queryFn: fetchAllAdminProductsSnapshot,
  });

  const {
    data: filteredOffers,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['merchant-dashboard', 'offers-admin', deferredSearch, statusFilter],
    queryFn: () =>
      fetchAdminPromotions({
        kind: 'single_product',
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
        title: 'Oferta excluida',
        description: 'A oferta individual foi removida com sucesso.',
      });
      await refreshQueries();
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao excluir oferta',
        description: error instanceof Error ? error.message : 'Erro inesperado ao excluir a oferta.',
      });
    },
  });

  const offers = filteredOffers?.promotions ?? [];
  const allOffers = offersSnapshot?.promotions ?? [];
  const products = offerProducts ?? [];
  const activeOffers = allOffers.filter((promotion) => promotion.status === 'active');
  const scheduledOffers = allOffers.filter((promotion) => promotion.status === 'scheduled');
  const inactiveOffers = allOffers.filter((promotion) => promotion.status === 'inactive');
  const expiredOffers = allOffers.filter((promotion) => promotion.status === 'expired');
  const categoriesInUse = new Set(allOffers.flatMap((promotion) => promotion.categories)).size;
  const canCreateOffer = products.some((product) => product.isActive);

  const openCreateDialog = () => {
    if (!canCreateOffer) {
      toast({
        variant: 'destructive',
        title: 'Nenhum produto ativo disponível',
        description: 'Ative pelo menos um produto antes de criar uma oferta individual.',
      });
      return;
    }

    setSelectedOffer(null);
    setEditorOpen(true);
  };

  const openEditDialog = (offer: Promotion) => {
    setSelectedOffer(offer);
    setEditorOpen(true);
  };

  const handleDelete = async (offer: Promotion) => {
    if (!window.confirm(`Excluir a oferta "${offer.title}"?`)) {
      return;
    }

    await deleteMutation.mutateAsync(offer.id);
  };

  return (
    <div className="space-y-6">
      <SectionLeadCard
        badge="Ofertas"
        title="Ofertas individuais"
        description="Gerencie promoções avulsas de um único produto, exibidas na seção Promoções imperdíveis da página pública."
        tone="red"
        actions={
          <>
            <Button onClick={openCreateDialog} className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <Tag className="h-4 w-4" />
              Nova oferta
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
              <Link to="/">Ver home pública</Link>
            </Button>
            <Button asChild variant="outline" className="border-black/10 bg-white/80 text-foreground hover:bg-white">
              <Link to={ADMIN_BASE_PATH}>Visão geral</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          icon={<Tag className="h-5 w-5 text-primary" />}
          label="Ofertas cadastradas"
          value={`${allOffers.length}`}
          delta="Base de ofertas individuais"
        />
        <StatCard
          icon={<Clock3 className="h-5 w-5 text-primary" />}
          label="Ofertas ativas"
          value={`${activeOffers.length}`}
          delta="Visiveis na home"
        />
        <StatCard
          icon={<Clock3 className="h-5 w-5 text-primary" />}
          label="Agendadas"
          value={`${scheduledOffers.length}`}
          delta="Aguardando inicio"
        />
        <StatCard
          icon={<Boxes className="h-5 w-5 text-primary" />}
          label="Categorias em uso"
          value={`${categoriesInUse}`}
          delta="Produtos promocionados"
        />
      </section>

      <DashboardPanel
        badge="Admin"
        title="Ofertas cadastradas"
        description="Controle as ofertas avulsas que alimentam a vitrine principal e as páginas individuais de oferta."
      >
        {!canCreateOffer ? (
          <div className="rounded-3xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
            Não existem produtos ativos para compor ofertas individuais.
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

          <Button onClick={openCreateDialog} disabled={!canCreateOffer}>
            Cadastrar
          </Button>
        </div>

        {isLoading || isLoadingProducts ? (
          <div className="flex items-center justify-center gap-2 rounded-3xl border border-black/5 bg-slate-50 px-5 py-16 text-sm text-muted-foreground">
            <RefreshCcw className="h-4 w-4 animate-spin" />
            Carregando ofertas...
          </div>
        ) : null}

        {!isLoading && !isLoadingProducts && offers.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-black/10 bg-slate-50 px-5 py-16 text-center text-sm text-muted-foreground">
            Nenhuma oferta encontrada para esse filtro.
          </div>
        ) : null}

        {!isLoading && !isLoadingProducts && offers.length > 0 ? (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white lg:block">
              <div className="max-h-[32rem] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[42%]">Oferta</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead className="w-40 text-center">Produto</TableHead>
                      <TableHead className="w-40 text-center">Status</TableHead>
                      <TableHead className="w-[18rem] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {offers.map((offer) => {
                      const product = offer.primaryProduct || offer.products?.[0];

                      return (
                        <TableRow key={offer.id} className="bg-white/90">
                          <TableCell>
                            <div className="flex gap-3">
                              <div className="h-20 w-28 shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-slate-50">
                                {offer.image?.url ? (
                                  <img src={offer.image.url} alt={offer.image.alt || offer.title} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem imagem</div>
                                )}
                              </div>
                              <div className="min-w-0 space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-foreground">{offer.title}</p>
                                  {offer.badgeText ? (
                                    <Badge className="border-none bg-accent text-accent-foreground">{offer.badgeText}</Badge>
                                  ) : null}
                                </div>
                                <p className="text-xs text-muted-foreground">{offer.name}</p>
                                <p className="line-clamp-2 text-sm text-muted-foreground">
                                  {offer.subtitle || offer.description || 'Sem descrição complementar.'}
                                </p>
                                {product ? (
                                  <p className="text-xs text-muted-foreground">
                                    Produto: {product.name}
                                    {product.sku ? ` | SKU ${product.sku}` : ''}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-2">
                            <p className="text-sm text-foreground">
                              {formatPromotionWindow({
                                startsAt: offer.startsAt,
                                expiresAt: offer.expiresAt,
                              })}
                            </p>
                            <PromotionCountdown expiresAt={offer.expiresAt} compact />
                            {offer.disclaimer ? (
                              <p className="line-clamp-2 text-xs text-muted-foreground">{offer.disclaimer}</p>
                            ) : null}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-foreground">{product?.name ?? 'Produto indisponível'}</p>
                              <p className="text-xs text-muted-foreground">{product?.category?.name ?? 'Sem categoria'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getPromotionStatusTone(offer.status)}`}>
                              {formatPromotionStatusLabel(offer.status)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Button size="sm" onClick={() => openEditDialog(offer)} className="gap-2">
                                <Pencil className="h-4 w-4" />
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void handleDelete(offer)}
                                disabled={deleteMutation.isPending}
                                className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
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
            </div>

            <div className="space-y-3 lg:hidden">
              {offers.map((offer) => {
                const product = offer.primaryProduct || offer.products?.[0];

                return (
                  <article
                    key={offer.id}
                    className="rounded-2xl border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-4 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.22)]"
                  >
                    <div className="flex gap-3">
                      <div className="h-20 w-24 shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-slate-50">
                        {offer.image?.url ? (
                          <img src={offer.image.url} alt={offer.image.alt || offer.title} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem imagem</div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-foreground">{offer.title}</h3>
                          <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${getPromotionStatusTone(offer.status)}`}>
                            {formatPromotionStatusLabel(offer.status)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{offer.name}</p>
                        <p className="line-clamp-2 text-sm text-muted-foreground">
                          {offer.subtitle || offer.description || 'Sem descrição complementar.'}
                        </p>
                        {product ? (
                          <p className="text-xs text-muted-foreground">
                            Produto: {product.name}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-2xl border border-black/5 bg-slate-50 px-3 py-3 text-sm text-foreground">
                        <div>{formatPromotionWindow({
                          startsAt: offer.startsAt,
                          expiresAt: offer.expiresAt,
                        })}</div>
                        <PromotionCountdown expiresAt={offer.expiresAt} compact className="mt-2" />
                      </div>
                      <div className="rounded-2xl border border-black/5 bg-slate-50 px-3 py-3 text-sm text-foreground">
                        {product?.name ?? 'Produto indisponível'}
                        <div className="mt-1 text-xs text-muted-foreground">{product?.category?.name ?? 'Sem categoria'}</div>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => openEditDialog(offer)} className="gap-2">
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleDelete(offer)}
                        disabled={deleteMutation.isPending}
                        className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Excluir
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : null}
      </DashboardPanel>

      <Card className="border-black/5 bg-white/88 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
        <CardHeader className="space-y-3">
          <Badge className="w-fit border-none bg-accent text-accent-foreground">Panorama</Badge>
          <div>
            <CardTitle className="text-xl sm:text-2xl">Radar de ofertas</CardTitle>
            <CardDescription>Leitura rápida das ofertas individuais exibidas na home.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-foreground">Ofertas em execucao</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {activeOffers.length > 0
                ? `${activeOffers.length} ofertas individuais ativas estão expostas na seção Promoções imperdíveis.`
                : 'Nenhuma oferta ativa no momento.'}
            </p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-foreground">Fila de públicacao</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {scheduledOffers.length > 0
                ? `${scheduledOffers.length} ofertas aguardam a data de inicio configurada.`
                : 'Não existem ofertas agendadas.'}
            </p>
          </div>
          <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-foreground">Manutencao pendente</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {inactiveOffers.length + expiredOffers.length > 0
                ? `${inactiveOffers.length} inativas e ${expiredOffers.length} encerradas podem ser reaproveitadas em novas ondas promocionais.`
                : 'Não ha ofertas pausadas ou encerradas aguardando revisão.'}
            </p>
          </div>
        </CardContent>
      </Card>

      <PromotionEditorDialog
        kind="single_product"
        open={editorOpen}
        promotion={selectedOffer}
        products={products}
        onOpenChange={(nextOpen) => {
          setEditorOpen(nextOpen);
          if (!nextOpen) {
            setSelectedOffer(null);
          }
        }}
        onSaved={() => {
          void refreshQueries();
        }}
      />
    </div>
  );
}
