import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, ArrowRight, Boxes, Search, Sparkles, Tag } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import type { Product } from "@rebequi/shared/types";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProducts } from "@/services/api/products";

const PAGE_SIZE = 24;
const MIN_SEARCH_LENGTH = 2;

function parsePage(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getProductImage(product: Product) {
  return (
    product.images?.find((image) => image.isPrimary)?.url ||
    product.images?.[0]?.url ||
    "https://via.placeholder.com/640x640?text=Produto"
  );
}

function SearchResultsSkeleton() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_28%,#f4f7ff_100%)]">
      <Header />
      <main className="pb-16 pt-10">
        <div className="container mx-auto space-y-8 px-4 sm:px-6">
          <Skeleton className="h-64 rounded-[2rem]" />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-[360px] rounded-[2rem]" />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const term = searchParams.get("termo")?.trim() ?? "";
  const page = parsePage(searchParams.get("pagina"));
  const shouldSearch = term.length >= MIN_SEARCH_LENGTH;

  const resultsQuery = useQuery({
    queryKey: ["products", "public-search-page", term, page],
    queryFn: () =>
      fetchProducts({
        search: term,
        page,
        limit: PAGE_SIZE,
      }),
    enabled: shouldSearch,
    staleTime: 30_000,
  });

  const products = resultsQuery.data?.products ?? [];
  const total = resultsQuery.data?.total ?? 0;
  const totalPages = resultsQuery.data?.totalPages ?? 1;
  const categoriesCount = new Set(products.map((product) => product.category?.slug || product.categoryId)).size;
  const highlightedProducts = products.filter((product) => product.isNew || product.isFeatured || product.isOffer).length;

  const updatePage = (nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams);

    if (nextPage <= 1) {
      nextParams.delete("pagina");
    } else {
      nextParams.set("pagina", String(nextPage));
    }

    setSearchParams(nextParams);

    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (resultsQuery.isLoading) {
    return <SearchResultsSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_28%,#f4f7ff_100%)]">
      <Header />

      <main className="pb-16 pt-10">
        <div className="container mx-auto space-y-8 px-4 sm:px-6">
          <section className="overflow-hidden rounded-[2rem] border border-[#dfe6f7] bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(255,252,237,0.96))] p-6 shadow-[0_28px_72px_-48px_rgba(37,99,235,0.22)] sm:p-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] xl:items-end">
              <div className="space-y-4">
                <Badge className="border-none bg-primary/10 text-primary">Busca</Badge>
                <h1 className="max-w-3xl text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  Resultados para {term ? `"${term}"` : "sua busca"}
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  A busca publica consulta os produtos ativos do catalogo e combina nome, descricao curta, descricao e SKU
                  para entregar resultados enquanto o cliente navega pela vitrine.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/5 bg-white/90 px-4 py-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Search className="h-4 w-4" />
                    Resultados
                  </div>
                  <p className="mt-3 text-2xl font-bold text-foreground">{total}</p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/90 px-4 py-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Boxes className="h-4 w-4" />
                    Categorias
                  </div>
                  <p className="mt-3 text-2xl font-bold text-foreground">{categoriesCount}</p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/90 px-4 py-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    Destaques
                  </div>
                  <p className="mt-3 text-2xl font-bold text-foreground">{highlightedProducts}</p>
                </div>
              </div>
            </div>
          </section>

          {!term ? (
            <section className="rounded-[2rem] border border-dashed border-black/10 bg-white px-6 py-16 text-center shadow-[0_28px_72px_-55px_rgba(15,23,42,0.2)]">
              <Search className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 text-2xl font-semibold text-foreground">Informe um termo para pesquisar</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Use o campo de busca no topo para procurar produtos publicos por nome, descricao ou codigo.
              </p>
            </section>
          ) : null}

          {term && !shouldSearch ? (
            <section className="rounded-[2rem] border border-dashed border-black/10 bg-white px-6 py-16 text-center shadow-[0_28px_72px_-55px_rgba(15,23,42,0.2)]">
              <Tag className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 text-2xl font-semibold text-foreground">Digite pelo menos 2 caracteres</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Buscas muito curtas geram ruído. A partir de dois caracteres a listagem passa a filtrar o catalogo.
              </p>
            </section>
          ) : null}

          {resultsQuery.isError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Falha ao buscar produtos</AlertTitle>
              <AlertDescription>
                {resultsQuery.error instanceof Error
                  ? resultsQuery.error.message
                  : "Nao foi possivel concluir a busca agora."}
              </AlertDescription>
            </Alert>
          ) : null}

          {shouldSearch && !resultsQuery.isError && products.length === 0 ? (
            <section className="rounded-[2rem] border border-dashed border-black/10 bg-white px-6 py-16 text-center shadow-[0_28px_72px_-55px_rgba(15,23,42,0.2)]">
              <Search className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 text-2xl font-semibold text-foreground">Nenhum produto encontrado</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Tente outro termo, navegue pelas categorias ou veja as promocoes publicas para encontrar alternativas.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Button asChild>
                  <Link to="/categorias">Explorar categorias</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/promocoes">Ver promocoes</Link>
                </Button>
              </div>
            </section>
          ) : null}

          {shouldSearch && !resultsQuery.isError && products.length > 0 ? (
            <>
              <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    slug={product.slug}
                    name={product.name}
                    price={product.price}
                    originalPrice={product.originalPrice}
                    image={getProductImage(product)}
                    category={product.category?.name || "Catalogo"}
                    stock={product.stock}
                    isNew={product.isNew}
                    isOffer={product.isOffer}
                    discount={product.discount}
                  />
                ))}
              </section>

              {totalPages > 1 ? (
                <section className="rounded-[1.75rem] border border-black/5 bg-white px-5 py-5 shadow-[0_22px_55px_-44px_rgba(15,23,42,0.18)]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        Mostrando pagina {page} de {totalPages}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">{total} produtos encontrados para esta busca.</p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Button
                        variant="outline"
                        className="gap-2"
                        disabled={page <= 1}
                        onClick={() => updatePage(page - 1)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <Button
                        className="gap-2"
                        disabled={page >= totalPages}
                        onClick={() => updatePage(page + 1)}
                      >
                        Proxima
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </section>
              ) : null}
            </>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
