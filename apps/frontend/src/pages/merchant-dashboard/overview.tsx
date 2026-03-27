import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Boxes, Clock3, Store, Tags } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { ProductResponse } from '@rebequi/shared/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchCategories } from '@/services/api/categories';
import { fetchAdminProducts } from '@/services/api/products';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, MetricChip, SectionLeadCard, SignalRow, StatCard } from './components';
import { useMerchantDashboardOutlet } from './data';

const SNAPSHOT_PAGE_SIZE = 100;

const snapshotDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

function trimText(value?: string | null) {
  return value?.trim() || '';
}

function getTimeValue(value?: string | Date | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatSnapshotDate(value?: string | Date | null) {
  const timestamp = getTimeValue(value);
  return timestamp ? snapshotDateFormatter.format(timestamp) : 'data indisponivel';
}

async function fetchAllAdminProductsSnapshot(): Promise<ProductResponse> {
  const firstPage = await fetchAdminProducts({ page: 1, limit: SNAPSHOT_PAGE_SIZE });
  const totalPages = firstPage.totalPages ?? Math.max(1, Math.ceil(firstPage.total / SNAPSHOT_PAGE_SIZE));

  if (totalPages <= 1) {
    return firstPage;
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchAdminProducts({
        page: index + 2,
        limit: SNAPSHOT_PAGE_SIZE,
      })
    )
  );

  const products = [firstPage, ...remainingPages].flatMap((page) => page.products);

  return {
    ...firstPage,
    products,
    limit: products.length,
    totalPages,
  };
}

export default function MerchantDashboardOverview() {
  const { userEmail } = useMerchantDashboardOutlet();

  const catalogQuery = useQuery({
    queryKey: ['merchant-dashboard', 'overview', 'catalog-snapshot'],
    queryFn: fetchAllAdminProductsSnapshot,
  });

  const categoriesQuery = useQuery({
    queryKey: ['merchant-dashboard', 'overview', 'categories-all'],
    queryFn: () => fetchCategories({ includeInactive: true }),
  });

  const products = catalogQuery.data?.products ?? [];
  const categories = categoriesQuery.data?.categories ?? [];

  const publishedProducts = products.filter((product) => product.isActive);
  const activeCategories = categories.filter((category) => category.isActive);
  const inactiveCategories = categories.filter((category) => !category.isActive);
  const categoriesInUse = categories.filter((category) => (category.productsCount ?? 0) > 0);
  const offerProducts = publishedProducts.filter((product) => product.isOffer);
  const featuredProducts = publishedProducts.filter((product) => product.isFeatured);
  const newProducts = publishedProducts.filter((product) => product.isNew);
  const outOfStockProducts = publishedProducts.filter((product) => product.stock <= 0);
  const lowStockProducts = publishedProducts.filter((product) => product.stock > 0 && product.stock <= product.minStock);
  const missingImageProducts = publishedProducts.filter((product) => (product.images?.length ?? 0) === 0);
  const missingDescriptionProducts = publishedProducts.filter(
    (product) => !trimText(product.shortDesc) && !trimText(product.description)
  );
  const missingSkuProducts = publishedProducts.filter((product) => !trimText(product.sku));
  const completeProducts = publishedProducts.filter(
    (product) =>
      (product.images?.length ?? 0) > 0 &&
      Boolean(trimText(product.sku)) &&
      (Boolean(trimText(product.shortDesc)) || Boolean(trimText(product.description)))
  );

  const completenessRate = publishedProducts.length > 0 ? Math.round((completeProducts.length / publishedProducts.length) * 100) : 0;

  const attentionItems = publishedProducts
    .map((product) => {
      const issues: Array<{ label: string; tone: 'blue' | 'red' | 'yellow' }> = [];
      let severity = 0;

      if (product.stock <= 0) {
        issues.push({ label: 'Sem estoque', tone: 'red' });
        severity += 4;
      } else if (product.stock <= product.minStock) {
        issues.push({ label: 'Estoque baixo', tone: 'yellow' });
        severity += 3;
      }

      if ((product.images?.length ?? 0) === 0) {
        issues.push({ label: 'Sem imagem', tone: 'red' });
        severity += 3;
      }

      if (!trimText(product.shortDesc) && !trimText(product.description)) {
        issues.push({ label: 'Sem descricao', tone: 'yellow' });
        severity += 2;
      }

      if (!trimText(product.sku)) {
        issues.push({ label: 'Sem SKU', tone: 'blue' });
        severity += 1;
      }

      if (issues.length === 0) {
        return null;
      }

      return {
        categoryName: product.category?.name ?? 'Sem categoria',
        issues,
        name: product.name,
        severity,
        stock: product.stock,
        updatedAt: product.updatedAt,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort((left, right) => right.severity - left.severity || getTimeValue(right.updatedAt) - getTimeValue(left.updatedAt))
    .slice(0, 5);

  const topCategories = [...categories]
    .sort((left, right) => (right.productsCount ?? 0) - (left.productsCount ?? 0) || Number(right.isActive) - Number(left.isActive))
    .slice(0, 5);

  const recentProducts = [...products]
    .sort((left, right) => getTimeValue(right.updatedAt) - getTimeValue(left.updatedAt))
    .slice(0, 5);

  const isSnapshotLoading = catalogQuery.isLoading || categoriesQuery.isLoading;
  const hasSnapshotError = catalogQuery.isError || categoriesQuery.isError;
  const stockStatusTone = outOfStockProducts.length > 0 ? 'red' : lowStockProducts.length > 0 ? 'yellow' : 'green';
  const stockStatusLabel = outOfStockProducts.length > 0 ? 'Critico' : lowStockProducts.length > 0 ? 'Atencao' : 'Estavel';
  const catalogStatusTone =
    missingImageProducts.length > 0 || missingDescriptionProducts.length > 0
      ? 'red'
      : missingSkuProducts.length > 0
        ? 'yellow'
        : 'green';
  const catalogStatusLabel =
    missingImageProducts.length > 0 || missingDescriptionProducts.length > 0
      ? 'Revisar'
      : missingSkuProducts.length > 0
        ? 'Ajustar'
        : 'Completo';

  return (
    <div className="space-y-6">
      <section className="grid gap-5 xl:grid-cols-[1.25fr_0.95fr]">
        <SectionLeadCard
          badge="Panorama"
          title="Visao geral da operacao"
          description="Resumo do catalogo, da publicacao e dos pontos que pedem revisao imediata no painel."
          tone="blue"
          actions={
            <>
              <div className="flex flex-wrap gap-2">
                <MetricChip label="Sessao" tone="blue" value={userEmail} />
                <MetricChip
                  label="Completude"
                  tone={completenessRate >= 80 ? 'green' : completenessRate >= 60 ? 'yellow' : 'red'}
                  value={isSnapshotLoading ? 'Carregando...' : `${completenessRate}% dos ativos completos`}
                />
                <MetricChip
                  label="Vitrine"
                  tone="yellow"
                  value={isSnapshotLoading ? 'Atualizando snapshot' : `${offerProducts.length} ofertas e ${newProducts.length} novidades`}
                />
              </div>
              <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                <Link to={`${ADMIN_BASE_PATH}/produtos`}>Gerenciar produtos</Link>
              </Button>
              <Button asChild variant="outline" className="border-black/10 bg-white/80 text-foreground hover:bg-white">
                <Link to={`${ADMIN_BASE_PATH}/estabilidade`}>Status da plataforma</Link>
              </Button>
            </>
          }
        />

        <DashboardPanel
          badge="Situacao"
          badgeClassName="bg-primary/10 text-primary"
          className="border-[#dfe6f7] bg-white/92 shadow-[0_22px_55px_-38px_rgba(37,99,235,0.28)]"
          description="Leitura rapida do que esta acontecendo agora no catalogo."
          title="Radar operacional"
        >
          {hasSnapshotError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              Nao foi possivel carregar o snapshot completo do dashboard neste momento.
            </div>
          ) : (
            <>
              <SignalRow
                title="Publicacao"
                status={isSnapshotLoading ? 'Carregando' : publishedProducts.length > 0 ? 'Ativa' : 'Sem vitrine'}
                tone={isSnapshotLoading ? 'neutral' : publishedProducts.length > 0 ? 'green' : 'yellow'}
                description={
                  isSnapshotLoading
                    ? 'Carregando dados de produtos e categorias.'
                    : `${publishedProducts.length} produtos visiveis, ${offerProducts.length} ofertas, ${newProducts.length} novidades e ${featuredProducts.length} destaques.`
                }
              />
              <SignalRow
                title="Estoque"
                status={isSnapshotLoading ? 'Carregando' : stockStatusLabel}
                tone={isSnapshotLoading ? 'neutral' : stockStatusTone}
                description={
                  isSnapshotLoading
                    ? 'Conferindo niveis de estoque do catalogo ativo.'
                    : outOfStockProducts.length > 0
                      ? `${outOfStockProducts.length} produtos sem estoque e ${lowStockProducts.length} abaixo do minimo.`
                      : lowStockProducts.length > 0
                        ? `${lowStockProducts.length} produtos abaixo do minimo configurado.`
                        : 'Nenhum alerta de estoque no catalogo publicado.'
                }
              />
              <SignalRow
                title="Cadastro"
                status={isSnapshotLoading ? 'Carregando' : catalogStatusLabel}
                tone={isSnapshotLoading ? 'neutral' : catalogStatusTone}
                description={
                  isSnapshotLoading
                    ? 'Validando imagem, descricao e identificacao dos produtos.'
                    : missingImageProducts.length > 0 || missingDescriptionProducts.length > 0 || missingSkuProducts.length > 0
                      ? `${missingImageProducts.length} sem imagem, ${missingDescriptionProducts.length} sem descricao e ${missingSkuProducts.length} sem SKU.`
                      : 'Todos os produtos ativos possuem os dados essenciais preenchidos.'
                }
              />
            </>
          )}
        </DashboardPanel>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <StatCard
          icon={<Boxes className="h-5 w-5 text-primary" />}
          label="Produtos totais"
          value={isSnapshotLoading ? '--' : `${products.length}`}
          delta="Catalogo administrativo"
        />
        <StatCard
          icon={<Store className="h-5 w-5 text-primary" />}
          label="Produtos publicados"
          value={isSnapshotLoading ? '--' : `${publishedProducts.length}`}
          delta="Visiveis na vitrine"
        />
        <StatCard
          icon={<Tags className="h-5 w-5 text-primary" />}
          label="Categorias ativas"
          value={isSnapshotLoading ? '--' : `${activeCategories.length}`}
          delta={`${inactiveCategories.length} inativas`}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-primary" />}
          label="Estoque critico"
          value={isSnapshotLoading ? '--' : `${outOfStockProducts.length + lowStockProducts.length}`}
          delta={`${outOfStockProducts.length} sem estoque`}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.95fr_1fr]">
        <DashboardPanel
          badge="Prioridades"
          badgeClassName="bg-accent/10 text-accent"
          className="border-[#f0d7d7] bg-white/92 shadow-[0_24px_60px_-44px_rgba(220,38,38,0.18)]"
          description="Itens que merecem tratamento primeiro para manter a vitrine consistente."
          title="Acoes prioritarias"
        >
          {hasSnapshotError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              O painel nao conseguiu calcular prioridades agora.
            </div>
          ) : isSnapshotLoading ? (
            <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-4 text-sm text-muted-foreground">
              Carregando prioridades do catalogo...
            </div>
          ) : attentionItems.length === 0 ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
              Nenhum produto ativo exige acao imediata. O catalogo principal esta sob controle.
            </div>
          ) : (
            <ul className="space-y-3">
              {attentionItems.map((item) => (
                <li key={`${item.name}-${item.updatedAt}`} className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">{item.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.categoryName} | estoque {item.stock} | atualizado em {formatSnapshotDate(item.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {item.issues.map((issue) => (
                        <Badge
                          key={`${item.name}-${issue.label}`}
                          className={
                            issue.tone === 'red'
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : issue.tone === 'yellow'
                                ? 'border-amber-200 bg-amber-50 text-amber-800'
                                : 'border-primary/15 bg-primary/5 text-primary'
                          }
                        >
                          {issue.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>

        <DashboardPanel
          badge="Categorias"
          badgeClassName="bg-secondary text-secondary-foreground"
          className="border-[#eadfba] bg-white/92 shadow-[0_20px_55px_-40px_rgba(255,215,0,0.2)]"
          description="Distribuicao atual das categorias para entender concentracao e ociosidade."
          title="Mapa de categorias"
        >
          <div className="flex flex-wrap gap-2">
            <MetricChip label="Ativas" tone="blue" value={isSnapshotLoading ? '--' : `${activeCategories.length}`} />
            <MetricChip label="Em uso" tone="green" value={isSnapshotLoading ? '--' : `${categoriesInUse.length}`} />
            <MetricChip
              label="Inativas"
              tone={inactiveCategories.length > 0 ? 'yellow' : 'neutral'}
              value={isSnapshotLoading ? '--' : `${inactiveCategories.length}`}
            />
          </div>

          {hasSnapshotError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              Nao foi possivel carregar a distribuicao das categorias.
            </div>
          ) : isSnapshotLoading ? (
            <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-4 text-sm text-muted-foreground">
              Carregando categorias...
            </div>
          ) : topCategories.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-slate-50 px-4 py-4 text-sm text-muted-foreground">
              Nenhuma categoria cadastrada.
            </div>
          ) : (
            <ul className="space-y-3">
              {topCategories.map((category) => (
                <li key={category.id} className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">{category.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{category.productsCount ?? 0} produtos vinculados</p>
                    </div>
                    <Badge className={category.isActive ? 'bg-primary text-primary-foreground' : 'bg-slate-700 text-white'}>
                      {category.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>

        <DashboardPanel
          badge="Movimentacao"
          badgeClassName="bg-primary/10 text-primary"
          className="border-[#dfe6f7] bg-white/92 shadow-[0_24px_60px_-44px_rgba(37,99,235,0.2)]"
          description="Ultimos produtos atualizados para acompanhar o ritmo das alteracoes."
          title="Atualizacoes recentes"
        >
          <div className="flex flex-wrap gap-2">
            <MetricChip label="Ofertas" tone="yellow" value={isSnapshotLoading ? '--' : `${offerProducts.length}`} />
            <MetricChip label="Novidades" tone="blue" value={isSnapshotLoading ? '--' : `${newProducts.length}`} />
            <MetricChip label="Sem imagem" tone="red" value={isSnapshotLoading ? '--' : `${missingImageProducts.length}`} />
          </div>

          {hasSnapshotError ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              Nao foi possivel carregar a movimentacao recente do catalogo.
            </div>
          ) : isSnapshotLoading ? (
            <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-4 text-sm text-muted-foreground">
              Atualizando historico recente...
            </div>
          ) : recentProducts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-black/10 bg-slate-50 px-4 py-4 text-sm text-muted-foreground">
              Nenhum produto encontrado no catalogo.
            </div>
          ) : (
            <ul className="space-y-3">
              {recentProducts.map((product) => (
                <li key={product.id} className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-foreground">{product.name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {product.category?.name ?? 'Sem categoria'} | atualizado em {formatSnapshotDate(product.updatedAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock3 className="h-4 w-4" />
                      {formatSnapshotDate(product.updatedAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>
      </section>
    </div>
  );
}
