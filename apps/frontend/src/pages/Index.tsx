import { useQuery } from "@tanstack/react-query";
import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Categories from "@/components/Categories";
import ProductSection from "@/components/ProductSection";
import PromoBanners from "@/components/PromoBanners";
import PromoHighlights from "@/components/PromoHighlights";
import Services from "@/components/Services";
import Brands from "@/components/Brands";
import Footer from "@/components/Footer";
import { fetchPromotionalProducts, fetchNewProducts, fetchProductsByCategory } from "@/services/api/products";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const Index = () => {
  const { data: promotions, isLoading: isLoadingPromotions, error: errorPromotions } = useQuery({
    queryKey: ['products', 'promotional'],
    queryFn: fetchPromotionalProducts,
  });

  const { data: newProducts, isLoading: isLoadingNew, error: errorNew } = useQuery({
    queryKey: ['products', 'new'],
    queryFn: fetchNewProducts,
  });

  const { data: toolsResponse, isLoading: isLoadingTools, error: errorTools } = useQuery({
    queryKey: ['products', 'category', 'ferramentas'],
    queryFn: () => fetchProductsByCategory('ferramentas', 1, 4),
  });

  const { data: paintsResponse, isLoading: isLoadingPaints, error: errorPaints } = useQuery({
    queryKey: ['products', 'category', 'tintas'],
    queryFn: () => fetchProductsByCategory('tintas-acessorios', 1, 4),
  });

  const { data: constructionResponse, isLoading: isLoadingConstruction, error: errorConstruction } = useQuery({
    queryKey: ['products', 'category', 'cimento-argamassa'],
    queryFn: () => fetchProductsByCategory('cimento-argamassa', 1, 4),
  });

  const { data: electricResponse, isLoading: isLoadingElectric, error: errorElectric } = useQuery({
    queryKey: ['products', 'category', 'materiais-eletricos'],
    queryFn: () => fetchProductsByCategory('materiais-eletricos', 1, 4),
  });

  const ProductSectionSkeleton = () => (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );

  const ErrorAlert = ({ error }: { error: Error }) => (
    <div className="container mx-auto px-4 py-8">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Erro ao carregar produtos</AlertTitle>
        <AlertDescription>
          {error.message || 'Ocorreu um erro ao carregar os produtos. Tente novamente mais tarde.'}
        </AlertDescription>
      </Alert>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Marquee />
      <Categories />

      {errorPromotions ? (
        <ErrorAlert error={errorPromotions as Error} />
      ) : isLoadingPromotions ? (
        <ProductSectionSkeleton />
      ) : promotions && promotions.length > 0 ? (
        <ProductSection title="Promocoes imperdiveis" products={promotions} />
      ) : null}

      <PromoBanners />
      <PromoHighlights />
      <Services />

      {errorNew ? (
        <ErrorAlert error={errorNew as Error} />
      ) : isLoadingNew ? (
        <ProductSectionSkeleton />
      ) : newProducts && newProducts.length > 0 ? (
        <ProductSection title="Novidades" products={newProducts} />
      ) : null}

      {errorTools ? (
        <ErrorAlert error={errorTools as Error} />
      ) : isLoadingTools ? (
        <ProductSectionSkeleton />
      ) : toolsResponse?.products && toolsResponse.products.length > 0 ? (
        <ProductSection title="Ferramentas" products={toolsResponse.products} />
      ) : null}

      {errorPaints ? (
        <ErrorAlert error={errorPaints as Error} />
      ) : isLoadingPaints ? (
        <ProductSectionSkeleton />
      ) : paintsResponse?.products && paintsResponse.products.length > 0 ? (
        <ProductSection title="Tintas e acessorios" products={paintsResponse.products} />
      ) : null}

      {errorConstruction ? (
        <ErrorAlert error={errorConstruction as Error} />
      ) : isLoadingConstruction ? (
        <ProductSectionSkeleton />
      ) : constructionResponse?.products && constructionResponse.products.length > 0 ? (
        <ProductSection title="Cimento e argamassa" products={constructionResponse.products} />
      ) : null}

      {errorElectric ? (
        <ErrorAlert error={errorElectric as Error} />
      ) : isLoadingElectric ? (
        <ProductSectionSkeleton />
      ) : electricResponse?.products && electricResponse.products.length > 0 ? (
        <ProductSection title="Materiais eletricos" products={electricResponse.products} />
      ) : null}

      <Brands />
      <Footer />
    </div>
  );
};

export default Index;
