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
  return timestamp ? snapshotDateFormatter.format(timestamp) : 'data indisponível';
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
        issues.push({ label: 'Sem descrição', tone: 'yellow' });
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
      <SectionLeadCard
        badge="Panorama"
        title="Visão geral"
        description={isSnapshotLoading ? 'Carregando dados...' : `${products.length} produtos · ${publishedProducts.length} publicados · ${activeCategories.length} categorias`}
        tone="blue"
        actions={
          <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
            <Link to={`${ADMIN_BASE_PATH}/produtos`}>Gerenciar produtos</Link>
          </Button>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Boxes className="h-5 w-5 text-primary" />}
          label="Produtos"
          value={isSnapshotLoading ? '--' : `${products.length}`}
          delta=""
        />
        <StatCard
          icon={<Store className="h-5 w-5 text-primary" />}
          label="Publicados"
          value={isSnapshotLoading ? '--' : `${publishedProducts.length}`}
          delta=""
        />
        <StatCard
          icon={<Tags className="h-5 w-5 text-primary" />}
          label="Categorias"
          value={isSnapshotLoading ? '--' : `${activeCategories.length}`}
          delta=""
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-primary" />}
          label="Estoque crítico"
          value={isSnapshotLoading ? '--' : `${outOfStockProducts.length + lowStockProducts.length}`}
          delta=""
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <DashboardPanel
          description="Status geral do catálogo publicado."
          title="Radar"
        >
          {hasSnapshotError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Não foi possível carregar os dados.
            </div>
          ) : (
            <>
              <SignalRow
                title="Publicação"
                status={isSnapshotLoading ? '...' : publishedProducts.length > 0 ? 'Ativa' : 'Sem vitrine'}
                tone={isSnapshotLoading ? 'neutral' : publishedProducts.length > 0 ? 'green' : 'yellow'}
                description={
                  isSnapshotLoading
                    ? 'Carregando...'
                    : `${publishedProducts.length} publicados · ${offerProducts.length} ofertas · ${featuredProducts.length} destaques`
                }
              />
              <SignalRow
                title="Estoque"
                status={isSnapshotLoading ? '...' : stockStatusLabel}
                tone={isSnapshotLoading ? 'neutral' : stockStatusTone}
                description={
                  isSnapshotLoading
                    ? 'Verificando...'
                    : outOfStockProducts.length > 0
                      ? `${outOfStockProducts.length} sem estoque, ${lowStockProducts.length} baixo`
                      : lowStockProducts.length > 0
                        ? `${lowStockProducts.length} abaixo do mínimo`
                        : 'Estoque OK'
                }
              />
              <SignalRow
                title="Cadastro"
                status={isSnapshotLoading ? '...' : catalogStatusLabel}
                tone={isSnapshotLoading ? 'neutral' : catalogStatusTone}
                description={
                  isSnapshotLoading
                    ? 'Verificando...'
                    : missingImageProducts.length > 0 || missingDescriptionProducts.length > 0
                      ? `${missingImageProducts.length} sem imagem · ${missingDescriptionProducts.length} sem descrição`
                      : 'Cadastro completo'
                }
              />
            </>
          )}
        </DashboardPanel>

        <DashboardPanel
          description="Produtos que precisam de atenção."
          title="Prioridades"
        >
          {hasSnapshotError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Erro ao carregar prioridades.
            </div>
          ) : isSnapshotLoading ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : attentionItems.length === 0 ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              ✓ Tudo em dia. Nenhuma ação pendente.
            </div>
          ) : (
            <ul className="space-y-2">
              {attentionItems.slice(0, 5).map((item) => (
                <li key={`${item.name}-${item.updatedAt}`} className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.name}</p>
                    <p className="text-xs text-muted-foreground">{item.categoryName}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {item.issues.slice(0, 2).map((issue) => (
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
                </li>
              ))}
              {attentionItems.length > 5 ? (
                <p className="text-center text-xs text-muted-foreground">
                  +{attentionItems.length - 5} itens. <Link to={`${ADMIN_BASE_PATH}/produtos`} className="text-primary underline">Ver todos</Link>
                </p>
              ) : null}
            </ul>
          )}
        </DashboardPanel>
      </section>
    </div>
  );
}
