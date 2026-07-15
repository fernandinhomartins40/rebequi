import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Boxes, Clock3, Sparkles, Tag } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProductSection from "@/components/ProductSection";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchNewProducts } from "@/services/api/products";

const updatedAtFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

function getTimestamp(value?: string | Date | null) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function formatUpdatedAt(value?: string | Date | null) {
  const timestamp = getTimestamp(value);
  return timestamp ? updatedAtFormatter.format(timestamp) : "data indisponivel";
}

function NewsPageSkeleton() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_32%,#eef4ff_100%)]">
      <Header />
      <main className="pb-16 pt-10">
        <div className="container mx-auto space-y-8 px-4 sm:px-6">
          <Skeleton className="h-64 rounded-[2rem]" />
          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <Skeleton className="h-[360px] rounded-[2rem]" />
            <Skeleton className="h-[360px] rounded-[2rem]" />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[380px] rounded-[2rem]" />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default function NewsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["products", "public-news"],
    queryFn: fetchNewProducts,
  });

  const products = [...(data ?? [])].sort(
    (left, right) => getTimestamp(right.updatedAt || right.createdAt) - getTimestamp(left.updatedAt || left.createdAt)
  );
  const featuredProduct = products[0];
  const remainingProducts = featuredProduct ? products.slice(1) : [];
  const categoriesCount = new Set(products.map((product) => product.category?.slug || product.categoryId)).size;
  const productsInStock = products.filter((product) => product.stock > 0).length;
  const latestRefresh = featuredProduct ? formatUpdatedAt(featuredProduct.updatedAt || featuredProduct.createdAt) : "agora";
  const primaryImage =
    featuredProduct?.images?.find((image) => image.isPrimary)?.url ||
    featuredProduct?.images?.[0]?.url ||
    "https://via.placeholder.com/960x720?text=Novidades";

  if (isLoading) {
    return <NewsPageSkeleton />;
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_32%,#eef4ff_100%)]">
      <Header />

      <main className="pb-16 pt-10">
        <div className="container mx-auto space-y-8 px-4 sm:px-6">
          <section className="overflow-hidden rounded-[2rem] border border-[#dfe6f7] bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(255,252,237,0.96))] p-6 shadow-[0_28px_72px_-48px_rgba(37,99,235,0.24)] sm:p-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] xl:items-end">
              <div className="space-y-4">
                <Badge className="border-none bg-primary/10 text-primary">Novidades</Badge>
                <h1 className="max-w-3xl text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  Lancamentos que acabaram de entrar na vitrine
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  Reunimos nesta página os produtos marcados como novos para facilitar a consulta de itens recem-publicados,
                  atualizações de catálogo e oportunidades para renovar o mix da obra.
                </p>
                <div className="flex flex-wrap gap-2">
                  {products.slice(0, 4).map((product) => (
                    <Badge key={product.id} variant="outline" className="rounded-full border-black/10 bg-white/80 px-3 py-1">
                      {product.category?.name || "Catálogo"}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/5 bg-white/90 px-4 py-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Sparkles className="h-4 w-4" />
                    Itens novos
                  </div>
                  <p className="mt-3 text-2xl font-bold text-foreground">{products.length}</p>
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
                    <Clock3 className="h-4 w-4" />
                    Em estoque
                  </div>
                  <p className="mt-3 text-2xl font-bold text-foreground">{productsInStock}</p>
                </div>
              </div>
            </div>
          </section>

          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Falha ao carregar novidades</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : "Não foi possível carregar os produtos novos neste momento."}
              </AlertDescription>
            </Alert>
          ) : null}

          {!error && products.length === 0 ? (
            <section className="rounded-[2rem] border border-dashed border-black/10 bg-white px-6 py-16 text-center shadow-[0_28px_72px_-55px_rgba(15,23,42,0.22)]">
              <Sparkles className="mx-auto h-10 w-10 text-primary" />
              <h2 className="mt-4 text-2xl font-semibold text-foreground">Nenhum lancamento publicado agora</h2>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">
                Assim que novos produtos forem sinalizados no painel administrativo, esta página passa a exibidos automaticamente.
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

          {!error && featuredProduct ? (
            <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <article className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-[0_28px_72px_-55px_rgba(15,23,42,0.28)]">
                <div className="relative aspect-[16/11] overflow-hidden">
                  <img
                    src={primaryImage}
                    alt={featuredProduct.name}
                    className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0)_0%,rgba(15,23,42,0.14)_100%)]" />
                </div>
                <div className="space-y-4 p-6">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="border-none bg-secondary text-secondary-foreground">Produto em foco</Badge>
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                      {featuredProduct.category?.name || "Catálogo"}
                    </Badge>
                  </div>

                  <div>
                    <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{featuredProduct.name}</h2>
                    <p className="mt-3 text-sm leading-7 text-muted-foreground">
                      {featuredProduct.shortDesc ||
                        featuredProduct.description ||
                        "Lancamento recente publicado na vitrine publica da Rebequi."}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        <Tag className="h-4 w-4" />
                        Faixa
                      </div>
                      <p className="mt-3 text-lg font-bold text-foreground">
                        {featuredProduct.price.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        <Clock3 className="h-4 w-4" />
                        Atualizado
                      </div>
                      <p className="mt-3 text-lg font-bold text-foreground">{latestRefresh}</p>
                    </div>
                  </div>

                  <Button asChild className="gap-2">
                    <Link to={`/produto/${featuredProduct.slug}`}>
                      Ver detalhes do produto
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </article>

              <article className="rounded-[2rem] border border-[#eadfba] bg-[linear-gradient(160deg,rgba(255,251,235,0.95),rgba(255,255,255,0.98))] p-6 shadow-[0_28px_72px_-52px_rgba(217,119,6,0.22)]">
                <Badge className="border-none bg-white text-foreground">Leitura rápida</Badge>
                <div className="mt-4 space-y-4">
                  <div className="rounded-[1.5rem] border border-black/5 bg-white/90 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">O que voce encontra aqui</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Produtos novos destacados para quem quer acompanhar entradas recentes, revisar o mix disponivel e chegar
                      rápido aos itens mais frescos da vitrine.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-black/5 bg-white/90 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Atualizacao</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      A página puxa direto a listagem publica de produtos marcados como novos. Quando o painel administrativo muda,
                      esta vitrine acompanha sem depender de manutenção manual.
                    </p>
                  </div>
                  <div className="rounded-[1.5rem] border border-black/5 bg-white/90 px-5 py-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Proximo passo</p>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      Se quiser comparar com campanhas em andamento, use as promocoes publicas ou solicite um orçamento direto para a equipe.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button asChild variant="outline" className="border-black/10 bg-white/85 hover:bg-white">
                      <Link to="/promocoes">Comparar com promocoes</Link>
                    </Button>
                    <Button asChild className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                      <Link to="/solicitar-orçamento">Solicitar orçamento</Link>
                    </Button>
                  </div>
                </div>
              </article>
            </section>
          ) : null}

          {!error && products.length > 0 ? (
            <ProductSection
              title={remainingProducts.length > 0 ? "Mais produtos novos" : "Produtos novos"}
              products={remainingProducts.length > 0 ? remainingProducts : products}
              showViewAll={false}
            />
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
}
