import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  Store,
  Tags,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { ProductResponse } from "@rebequi/shared/types";
import { hasMerchantPermission } from "@rebequi/shared/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchCategories } from "@/services/api/categories";
import { fetchAdminProducts } from "@/services/api/products";
import { ADMIN_BASE_PATH } from "./config";
import { DashboardPanel, PageHeader, SignalRow, StatCard } from "./components";
import { useMerchantDashboardOutlet } from "./data";
import { DashboardSteps } from "@/components/dashboard/DashboardElements";

const SNAPSHOT_PAGE_SIZE = 100;

const snapshotDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function trimText(value?: string | null) {
  return value?.trim() || "";
}

function getTimeValue(value?: string | Date | null) {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

async function fetchAllAdminProductsSnapshot(): Promise<ProductResponse> {
  const firstPage = await fetchAdminProducts({
    page: 1,
    limit: SNAPSHOT_PAGE_SIZE,
  });
  const totalPages =
    firstPage.totalPages ??
    Math.max(1, Math.ceil(firstPage.total / SNAPSHOT_PAGE_SIZE));

  if (totalPages <= 1) return firstPage;

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchAdminProducts({ page: index + 2, limit: SNAPSHOT_PAGE_SIZE }),
    ),
  );

  const products = [firstPage, ...remainingPages].flatMap(
    (page) => page.products,
  );

  return { ...firstPage, products, limit: products.length, totalPages };
}

export default function MerchantDashboardOverview() {
  const { userEmail, userRole } = useMerchantDashboardOutlet();
  const canManageCatalog = hasMerchantPermission(userRole, "catalog:manage");

  const catalogQuery = useQuery({
    queryKey: ["merchant-dashboard", "overview", "catalog-snapshot"],
    queryFn: fetchAllAdminProductsSnapshot,
    enabled: canManageCatalog,
  });

  const categoriesQuery = useQuery({
    queryKey: ["merchant-dashboard", "overview", "categories-all"],
    queryFn: () => fetchCategories({ includeInactive: true }),
    enabled: canManageCatalog,
  });

  const products = catalogQuery.data?.products ?? [];
  const categories = categoriesQuery.data?.categories ?? [];

  const publishedProducts = products.filter((p) => p.isActive);
  const activeCategories = categories.filter((c) => c.isActive);
  const offerProducts = publishedProducts.filter((p) => p.isOffer);
  const featuredProducts = publishedProducts.filter((p) => p.isFeatured);
  const newProducts = publishedProducts.filter((p) => p.isNew);
  const outOfStockProducts = publishedProducts.filter((p) => p.stock <= 0);
  const lowStockProducts = publishedProducts.filter(
    (p) => p.stock > 0 && p.stock <= p.minStock,
  );
  const missingImageProducts = publishedProducts.filter(
    (p) => (p.images?.length ?? 0) === 0,
  );
  const missingDescriptionProducts = publishedProducts.filter(
    (p) => !trimText(p.shortDesc) && !trimText(p.description),
  );
  const missingSkuProducts = publishedProducts.filter((p) => !trimText(p.sku));
  const completeProducts = publishedProducts.filter(
    (p) =>
      (p.images?.length ?? 0) > 0 &&
      Boolean(trimText(p.sku)) &&
      (Boolean(trimText(p.shortDesc)) || Boolean(trimText(p.description))),
  );

  const completenessRate =
    publishedProducts.length > 0
      ? Math.round((completeProducts.length / publishedProducts.length) * 100)
      : 0;

  const attentionItems = publishedProducts
    .map((product) => {
      const issues: Array<{ label: string; tone: "blue" | "red" | "yellow" }> =
        [];
      let severity = 0;

      if (product.stock <= 0) {
        issues.push({ label: "Sem estoque", tone: "red" });
        severity += 4;
      } else if (product.stock <= product.minStock) {
        issues.push({ label: "Estoque baixo", tone: "yellow" });
        severity += 3;
      }

      if ((product.images?.length ?? 0) === 0) {
        issues.push({ label: "Sem imagem", tone: "red" });
        severity += 3;
      }

      if (!trimText(product.shortDesc) && !trimText(product.description)) {
        issues.push({ label: "Sem descrição", tone: "yellow" });
        severity += 2;
      }

      if (!trimText(product.sku)) {
        issues.push({ label: "Sem SKU", tone: "blue" });
        severity += 1;
      }

      if (issues.length === 0) return null;

      return {
        id: product.id,
        categoryName: product.category?.name ?? "Sem categoria",
        issues,
        name: product.name,
        severity,
        stock: product.stock,
        updatedAt: product.updatedAt,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .sort(
      (l, r) =>
        r.severity - l.severity ||
        getTimeValue(r.updatedAt) - getTimeValue(l.updatedAt),
    )
    .slice(0, 5);

  const isSnapshotLoading = catalogQuery.isLoading || categoriesQuery.isLoading;
  const hasSnapshotError = catalogQuery.isError || categoriesQuery.isError;

  const stockStatusTone =
    outOfStockProducts.length > 0
      ? "red"
      : lowStockProducts.length > 0
        ? "yellow"
        : "green";
  const stockStatusLabel =
    outOfStockProducts.length > 0
      ? "Crítico"
      : lowStockProducts.length > 0
        ? "Atenção"
        : "Estável";

  const catalogStatusTone =
    missingImageProducts.length > 0 || missingDescriptionProducts.length > 0
      ? "red"
      : missingSkuProducts.length > 0
        ? "yellow"
        : "green";
  const catalogStatusLabel =
    missingImageProducts.length > 0 || missingDescriptionProducts.length > 0
      ? "Revisar"
      : missingSkuProducts.length > 0
        ? "Ajustar"
        : "Completo";

  const criticalCount = outOfStockProducts.length + lowStockProducts.length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title="Visão geral"
        description={
          isSnapshotLoading
            ? "Carregando dados…"
            : `${products.length} produtos · ${publishedProducts.length} publicados · ${activeCategories.length} categorias`
        }
        actions={
          canManageCatalog ? (
            <Button asChild size="sm">
              <Link to={`${ADMIN_BASE_PATH}/produtos`}>Gerenciar produtos</Link>
            </Button>
          ) : undefined
        }
      />

      {(["quotes:manage", "orders:manage", "sales:manage"] as const).every(
        (permission) => hasMerchantPermission(userRole, permission),
      ) ? (
        <DashboardSteps
          label="Venda em 3 passos"
          steps={[
            { title: "Atender", href: `${ADMIN_BASE_PATH}/orçamentos` },
            { title: "Confirmar pedido", href: `${ADMIN_BASE_PATH}/pedidos` },
            { title: "Registrar venda", href: `${ADMIN_BASE_PATH}/vendas` },
          ]}
        />
      ) : null}

      {/* KPI row */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Boxes className="h-4 w-4" />}
          label="Total de produtos"
          value={isSnapshotLoading ? "—" : `${products.length}`}
          tone="default"
        />
        <StatCard
          icon={<Store className="h-4 w-4" />}
          label="Publicados"
          value={isSnapshotLoading ? "—" : `${publishedProducts.length}`}
          tone="blue"
        />
        <StatCard
          icon={<Tags className="h-4 w-4" />}
          label="Categorias ativas"
          value={isSnapshotLoading ? "—" : `${activeCategories.length}`}
          tone="default"
        />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4" />}
          label="Estoque crítico"
          value={isSnapshotLoading ? "—" : `${criticalCount}`}
          tone={criticalCount > 0 ? "red" : "green"}
          delta={criticalCount === 0 ? "Tudo em dia" : undefined}
        />
      </section>

      {/* Completeness bar */}
      {!isSnapshotLoading && publishedProducts.length > 0 ? (
        <div className="rounded-xl border border-border/70 bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Completude do catálogo
                </p>
                <p className="text-xs text-muted-foreground">
                  {completeProducts.length} de {publishedProducts.length}{" "}
                  produtos com imagem, SKU e descrição
                </p>
              </div>
            </div>
            <span
              className={`text-xl font-semibold tabular-nums tracking-tight ${
                completenessRate >= 80
                  ? "text-emerald-600"
                  : completenessRate >= 50
                    ? "text-amber-600"
                    : "text-red-600"
              }`}
            >
              {completenessRate}%
            </span>
          </div>
          <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                completenessRate >= 80
                  ? "bg-emerald-500"
                  : completenessRate >= 50
                    ? "bg-amber-500"
                    : "bg-red-500"
              }`}
              style={{ width: `${completenessRate}%` }}
            />
          </div>
        </div>
      ) : null}

      {/* Catalog highlights */}
      {!isSnapshotLoading && publishedProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Em oferta",
              value: offerProducts.length,
              tone: "yellow" as const,
            },
            {
              label: "Destaque",
              value: featuredProducts.length,
              tone: "blue" as const,
            },
            {
              label: "Novidade",
              value: newProducts.length,
              tone: "green" as const,
            },
            {
              label: "Sem estoque",
              value: outOfStockProducts.length,
              tone: "red" as const,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl border border-border/70 bg-card px-4 py-3"
            >
              <p className="text-xs font-medium text-muted-foreground">
                {item.label}
              </p>
              <p
                className={`mt-1 text-xl font-semibold tabular-nums tracking-tight ${
                  item.tone === "red" && item.value > 0
                    ? "text-red-600"
                    : "text-foreground"
                }`}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Status panels */}
      <section className="grid gap-4 xl:grid-cols-2">
        <DashboardPanel
          title="Radar do catálogo"
          description="Status geral dos produtos publicados"
          accent="blue"
        >
          {hasSnapshotError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Não foi possível carregar os dados.
            </div>
          ) : (
            <div className="space-y-2">
              <SignalRow
                title="Publicação"
                status={
                  isSnapshotLoading
                    ? "…"
                    : publishedProducts.length > 0
                      ? "Ativa"
                      : "Sem vitrine"
                }
                tone={
                  isSnapshotLoading
                    ? "neutral"
                    : publishedProducts.length > 0
                      ? "green"
                      : "yellow"
                }
                description={
                  isSnapshotLoading
                    ? "Carregando…"
                    : `${publishedProducts.length} publicados · ${offerProducts.length} ofertas · ${featuredProducts.length} destaques`
                }
              />
              <SignalRow
                title="Estoque"
                status={isSnapshotLoading ? "…" : stockStatusLabel}
                tone={isSnapshotLoading ? "neutral" : stockStatusTone}
                description={
                  isSnapshotLoading
                    ? "Verificando…"
                    : outOfStockProducts.length > 0
                      ? `${outOfStockProducts.length} sem estoque, ${lowStockProducts.length} abaixo do mínimo`
                      : lowStockProducts.length > 0
                        ? `${lowStockProducts.length} abaixo do mínimo`
                        : "Estoque OK em todos os produtos"
                }
              />
              <SignalRow
                title="Cadastro"
                status={isSnapshotLoading ? "…" : catalogStatusLabel}
                tone={isSnapshotLoading ? "neutral" : catalogStatusTone}
                description={
                  isSnapshotLoading
                    ? "Verificando…"
                    : missingImageProducts.length > 0 ||
                        missingDescriptionProducts.length > 0
                      ? `${missingImageProducts.length} sem imagem · ${missingDescriptionProducts.length} sem descrição`
                      : "Todos os cadastros estão completos"
                }
              />
            </div>
          )}
        </DashboardPanel>

        <DashboardPanel
          title="Produtos que precisam de atenção"
          description="Pendências com maior impacto na vitrine"
          accent="red"
          action={
            attentionItems.length > 0 ? (
              <Button asChild variant="ghost" size="sm" className="text-xs">
                <Link to={`${ADMIN_BASE_PATH}/produtos`}>Ver todos</Link>
              </Button>
            ) : null
          }
        >
          {hasSnapshotError ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Erro ao carregar prioridades.
            </div>
          ) : isSnapshotLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-14 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          ) : attentionItems.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Tudo em dia. Nenhuma pendência encontrada.
            </div>
          ) : (
            <ul className="space-y-2">
              {attentionItems.map((item) => (
                <li
                  key={`${item.name}-${item.updatedAt}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.categoryName}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-1.5">
                    {item.issues.slice(0, 2).map((issue) => (
                      <Badge
                        key={`${item.name}-${issue.label}`}
                        variant="outline"
                        className={
                          issue.tone === "red"
                            ? "border-red-200 bg-red-50 text-red-700"
                            : issue.tone === "yellow"
                              ? "border-amber-200 bg-amber-50 text-amber-700"
                              : "border-blue-200 bg-blue-50 text-blue-700"
                        }
                      >
                        {issue.label}
                      </Badge>
                    ))}
                  </div>
                  {canManageCatalog ? (
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to={`${ADMIN_BASE_PATH}/produtos/${item.id}/editar`}
                        aria-label={`Corrigir ${item.name}`}
                      >
                        Corrigir
                      </Link>
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </DashboardPanel>
      </section>
    </div>
  );
}
