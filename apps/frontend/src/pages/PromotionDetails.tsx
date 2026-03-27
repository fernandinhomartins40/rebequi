import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, Boxes, CalendarClock, Layers3 } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ProductCard from '@/components/ProductCard';
import { PromotionCountdown } from '@/components/PromotionCountdown';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPromotionBySlug } from '@/services/api/promotions';
import { formatPromotionStatusLabel, formatPromotionWindow, getPromotionThemeClasses } from '@/lib/promotion-ui';

const PromotionDetailsPage = () => {
  const { slug = '' } = useParams();
  const { data: promotion, isLoading, error } = useQuery({
    queryKey: ['promotions', 'slug', slug],
    queryFn: () => fetchPromotionBySlug(slug),
    enabled: Boolean(slug),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto space-y-8 px-4 py-10 sm:px-6">
          <Skeleton className="h-[24rem] w-full rounded-[2rem]" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <Skeleton className="h-60 w-full rounded-xl" />
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !promotion) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-10 sm:px-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Promoção indisponível</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Não foi possível carregar esta promoção.'}
            </AlertDescription>
          </Alert>
        </main>
        <Footer />
      </div>
    );
  }

  const theme = getPromotionThemeClasses(promotion.themeTone);
  const isSingleProductPromotion = promotion.kind === 'single_product';
  const primaryProduct = promotion.primaryProduct || promotion.products?.[0];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-16 pt-10">
        <div className="container mx-auto space-y-8 px-4 sm:px-6">
          <Button asChild variant="outline" className="rounded-2xl">
            <Link to={isSingleProductPromotion ? '/' : '/promocoes'}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              {isSingleProductPromotion ? 'Voltar para a loja' : 'Voltar para promoções'}
            </Link>
          </Button>

          <section
            className={`overflow-hidden rounded-[2rem] border p-6 shadow-[0_28px_72px_-48px_rgba(15,23,42,0.3)] sm:p-8 ${theme.shell}`}
          >
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] lg:items-center">
              <div className="space-y-4">
                {promotion.eyebrow ? (
                  <p className={`text-sm font-semibold uppercase tracking-[0.24em] ${theme.accent}`}>{promotion.eyebrow}</p>
                ) : null}

                <div className="space-y-3">
                  <h1 className="max-w-3xl text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                    {promotion.title}
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                    {promotion.description || promotion.subtitle || 'Coleção promocional com produtos selecionados para esta campanha.'}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${theme.chip}`}>
                    {promotion.badgeText || formatPromotionStatusLabel(promotion.status)}
                  </span>
                  {promotion.categories.map((category) => (
                    <span
                      key={category}
                      className="inline-flex rounded-full border border-black/5 bg-white/85 px-3 py-1 text-xs font-medium text-foreground"
                    >
                      {category}
                    </span>
                  ))}
                </div>

                <PromotionCountdown expiresAt={promotion.expiresAt} />

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-black/5 bg-white/85 px-4 py-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Boxes className="h-4 w-4" />
                      {isSingleProductPromotion ? 'Produto' : 'Produtos'}
                    </div>
                    <p className="mt-3 text-2xl font-bold text-foreground">{promotion.productCount}</p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white/85 px-4 py-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <Layers3 className="h-4 w-4" />
                      Categorias
                    </div>
                    <p className="mt-3 text-2xl font-bold text-foreground">{promotion.categoryCount}</p>
                  </div>
                  <div className="rounded-2xl border border-black/5 bg-white/85 px-4 py-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                      Janela
                    </div>
                    <p className="mt-3 text-sm font-semibold leading-6 text-foreground">
                      {formatPromotionWindow({
                        startsAt: promotion.startsAt,
                        expiresAt: promotion.expiresAt,
                      })}
                    </p>
                  </div>
                </div>

                {promotion.disclaimer ? (
                  <p className="rounded-2xl border border-black/5 bg-white/75 px-4 py-3 text-sm leading-6 text-muted-foreground">
                    {promotion.disclaimer}
                  </p>
                ) : null}
              </div>

              <div className="overflow-hidden rounded-[1.75rem] border border-black/5 bg-white/80">
                <img
                  src={promotion.image?.url}
                  alt={promotion.image?.alt || promotion.title}
                  className="aspect-[16/10] w-full object-cover"
                />
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">
                {isSingleProductPromotion ? 'Produto em oferta' : 'Produtos vinculados'}
              </p>
              <h2 className="text-2xl font-bold text-foreground sm:text-3xl">
                {isSingleProductPromotion ? 'Item destacado nesta oferta' : 'Tudo o que faz parte desta promoção'}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground sm:text-base">
                {isSingleProductPromotion
                  ? 'Oferta individual tratada separadamente, com página dedicada e contador de encerramento.'
                  : 'Selecao completa de itens associados a este card promocional.'}
              </p>
            </div>

            <div className={`grid grid-cols-1 gap-6 ${isSingleProductPromotion ? 'max-w-sm' : 'sm:grid-cols-2 xl:grid-cols-4'}`}>
              {(isSingleProductPromotion ? (primaryProduct ? [primaryProduct] : []) : promotion.products ?? []).map((product) => {
                const primaryImage =
                  (product.images && product.images.length > 0 && product.images[0].url) ||
                  'https://via.placeholder.com/400x300?text=Produto';
                const categoryName = product.category?.name || 'Categoria';

                return (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    slug={product.slug}
                    name={product.name}
                    price={product.price}
                    originalPrice={product.originalPrice}
                    image={primaryImage}
                    category={categoryName}
                    href={`/produto/${product.slug}`}
                    isNew={product.isNew}
                    isOffer={isSingleProductPromotion || product.isOffer}
                    discount={product.discount}
                    promotionBadge={promotion.badgeText}
                    countdownTo={promotion.expiresAt}
                  />
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PromotionDetailsPage;
