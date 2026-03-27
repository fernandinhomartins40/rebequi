import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Boxes, Package } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryColorClass, getCategoryIcon } from "@/lib/category-icons";
import { fetchCategoryBySlug } from "@/services/api/categories";
import { ApiError } from "@/services/api/client";
import { fetchAllProductsByCategory } from "@/services/api/products";

const PRODUCT_PLACEHOLDER = "https://via.placeholder.com/600x600?text=Produto";

function CategoryDetailsSkeleton() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_28%,#f8f6ef_100%)]">
      <Header />
      <div className="container mx-auto px-4 py-10">
        <Skeleton className="h-5 w-40" />
        <div className="mt-8 grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-8">
          <Skeleton className="h-72 rounded-[2rem]" />
          <div className="space-y-4">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-12 w-3/4" />
            <Skeleton className="h-5 w-full max-w-2xl" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Skeleton className="h-24 rounded-[1.75rem]" />
              <Skeleton className="h-24 rounded-[1.75rem]" />
            </div>
            <Skeleton className="h-10 w-48" />
          </div>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-[24rem] rounded-[2rem]" />
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}

export default function CategoryDetailsPage() {
  const { slug } = useParams<{ slug: string }>();

  const {
    data: category,
    isLoading: isLoadingCategory,
    error: categoryError,
  } = useQuery({
    queryKey: ["category", slug],
    queryFn: () => fetchCategoryBySlug(slug as string),
    enabled: Boolean(slug),
    retry: false,
  });

  const {
    data: productsResponse,
    isLoading: isLoadingProducts,
    error: productsError,
  } = useQuery({
    queryKey: ["category", slug, "products", "all"],
    queryFn: () => fetchAllProductsByCategory(slug as string, 24),
    enabled: Boolean(slug),
  });

  if (!slug) {
    return (
      <main className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Categoria invalida</AlertTitle>
            <AlertDescription>O identificador da categoria nao foi informado.</AlertDescription>
          </Alert>
        </div>
        <Footer />
      </main>
    );
  }

  if (isLoadingCategory) {
    return <CategoryDetailsSkeleton />;
  }

  if (!category || categoryError) {
    const isNotFound = categoryError instanceof ApiError && categoryError.status === 404;

    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_28%,#f8f6ef_100%)]">
        <Header />
        <div className="container mx-auto px-4 py-16">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{isNotFound ? "Categoria nao encontrada" : "Falha ao carregar categoria"}</AlertTitle>
            <AlertDescription>
              {isNotFound
                ? "A categoria solicitada nao esta disponivel ou foi removida da vitrine."
                : categoryError instanceof Error
                  ? categoryError.message
                  : "Nao foi possivel carregar esta categoria agora."}
            </AlertDescription>
          </Alert>

          <Button asChild variant="outline" className="mt-6">
            <Link to="/categorias">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para categorias
            </Link>
          </Button>
        </div>
        <Footer />
      </main>
    );
  }

  const products = productsResponse?.products ?? [];
  const Icon = getCategoryIcon(category.icon, `${category.slug} ${category.name}`);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_28%,#f8f6ef_100%)]">
      <Header />

      <div className="container mx-auto px-4 py-10">
        <Button asChild variant="ghost" className="px-0 text-muted-foreground hover:bg-transparent hover:text-foreground">
          <Link to="/categorias">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para categorias
          </Link>
        </Button>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:gap-8">
          <div className="overflow-hidden rounded-[2rem] border border-[#e7dcc3] bg-[radial-gradient(circle_at_top,#fff8dc_0%,#fff2b5_38%,#f8f6ef_100%)] shadow-[0_35px_80px_-50px_rgba(15,23,42,0.35)]">
            {category.image ? (
              <img src={category.image} alt={category.name} className="h-full min-h-[18rem] w-full object-cover" />
            ) : (
              <div className="flex min-h-[18rem] items-center justify-center px-6 py-8">
                <div className="flex flex-col items-center text-center">
                  <div className="category-circle bg-white">
                    <Icon className={`h-10 w-10 ${getCategoryColorClass(0)}`} />
                  </div>
                  <p className="mt-5 max-w-xs text-sm leading-6 text-muted-foreground">
                    Visualize todos os produtos ativos vinculados a esta categoria em uma pagina dedicada.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="rounded-[2rem] border border-[#e7dcc3] bg-white px-5 py-6 shadow-[0_35px_80px_-50px_rgba(15,23,42,0.35)] sm:px-7 sm:py-7">
            <Badge className="border-none bg-accent text-accent-foreground">Categoria</Badge>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{category.name}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
              {category.description || "Confira todos os produtos desta categoria com navegacao clara e foco total no catalogo disponivel."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.75rem] border border-black/5 bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  <Boxes className="h-4 w-4 text-primary" />
                  Produtos ativos
                </div>
                <div className="mt-2 text-3xl font-bold text-foreground">{productsResponse?.total ?? products.length}</div>
                <p className="mt-1 text-sm text-muted-foreground">Itens publicados nesta categoria</p>
              </div>

              <div className="rounded-[1.75rem] border border-black/5 bg-slate-50 px-5 py-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  <Package className="h-4 w-4 text-primary" />
                  Slug
                </div>
                <div className="mt-2 text-lg font-semibold text-foreground">{category.slug}</div>
                <p className="mt-1 text-sm text-muted-foreground">Identificador usado na rota publica da categoria</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">Produtos da categoria</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Todos os produtos ativos vinculados a {category.name.toLowerCase()}.
              </p>
            </div>
            <div className="text-sm font-medium text-muted-foreground">{products.length} itens listados</div>
          </div>

          {isLoadingProducts ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-[24rem] rounded-[2rem]" />
              ))}
            </div>
          ) : productsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Falha ao carregar produtos</AlertTitle>
              <AlertDescription>
                {productsError instanceof Error ? productsError.message : "Nao foi possivel carregar os produtos desta categoria."}
              </AlertDescription>
            </Alert>
          ) : products.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-[#e7dcc3] bg-white/90 px-6 py-12 text-center shadow-[0_30px_70px_-55px_rgba(15,23,42,0.35)]">
              <Package className="mx-auto h-10 w-10 text-primary" />
              <h3 className="mt-4 text-xl font-semibold text-foreground">Nenhum produto publicado</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Esta categoria existe, mas ainda nao possui produtos ativos exibidos na vitrine.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
              {products.map((product) => {
                const primaryImage =
                  (product.images && product.images.length > 0 && product.images[0].url) || PRODUCT_PLACEHOLDER;

                return (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    slug={product.slug}
                    name={product.name}
                    price={product.price}
                    originalPrice={product.originalPrice}
                    image={primaryImage}
                    category={category.name}
                    isNew={product.isNew}
                    isOffer={product.isOffer}
                    discount={product.discount}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      <Footer />
    </main>
  );
}
