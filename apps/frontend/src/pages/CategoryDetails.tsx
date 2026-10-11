import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Package } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchCategoryBySlug } from "@/services/api/categories";
import { ApiError } from "@/services/api/client";
import { fetchAllProductsByCategory } from "@/services/api/products";

const PRODUCT_PLACEHOLDER = "/placeholder.svg";

function CategoryDetailsSkeleton() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_28%,#f8f6ef_100%)]">
      <Header />
      <div className="container mx-auto px-4 py-4 sm:py-6">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-4 h-9 w-56" />
        <div className="mt-6 grid grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
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
            <AlertTitle>Categoria inválida</AlertTitle>
            <AlertDescription>O identificador da categoria não foi informado.</AlertDescription>
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
            <AlertTitle>{isNotFound ? "Categoria não encontrada" : "Falha ao carregar categoria"}</AlertTitle>
            <AlertDescription>
              {isNotFound
                ? "A categoria solicitada não está disponível ou foi removida da vitrine."
                : categoryError instanceof Error
                  ? categoryError.message
                  : "Não foi possível carregar esta categoria agora."}
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

        <section className="mt-4 mb-6 flex items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{category.name}</h1>
          <span className="shrink-0 text-sm text-muted-foreground">{productsResponse?.total ?? products.length} produtos</span>
        </section>
        <section aria-label="Produtos da categoria">
          {isLoadingProducts ? (
            <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <Skeleton key={index} className="h-[24rem] rounded-[2rem]" />
              ))}
            </div>
          ) : productsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Falha ao carregar produtos</AlertTitle>
              <AlertDescription>
                {productsError instanceof Error ? productsError.message : "Não foi possível carregar os produtos desta categoria."}
              </AlertDescription>
            </Alert>
          ) : products.length === 0 ? (
            <div className="rounded-[2rem] border border-dashed border-[#e7dcc3] bg-white/90 px-6 py-12 text-center shadow-[0_30px_70px_-55px_rgba(15,23,42,0.35)]">
              <Package className="mx-auto h-10 w-10 text-primary" />
              <h3 className="mt-4 text-xl font-semibold text-foreground">Nenhum produto publicado</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Esta categoria existe, mas ainda não possui produtos ativos exibidos na vitrine.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
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
                    stock={product.availableStock ?? product.stock}
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
