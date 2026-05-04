import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { PromotionCard } from '@/components/PromotionCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPromotions } from '@/services/api/promotions';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import { ArrowRight } from 'lucide-react';

const PromoHighlights = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['promotions', 'highlights'],
    queryFn: () => fetchPromotions({ kind: 'collection', page: 1, limit: 4 }),
  });

  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  const promotions = data?.promotions ?? [];

  if (!isLoading && promotions.length === 0 && !error) {
    return null;
  }

  return (
    <section ref={ref} className="bg-white py-12 sm:py-16">
      <div className="container mx-auto space-y-8 px-4 sm:px-6">
        <div className={`flex flex-col gap-4 transition-all duration-700 lg:flex-row lg:items-end lg:justify-between ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="space-y-2 text-center lg:text-left">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-brand-red">
              Ofertas em destaque
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Campanhas promocionais
            </h2>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base lg:mx-0">
              Coleções com curadoria de produtos por tema e período.
            </p>
          </div>

          <Button asChild variant="outline" className="w-full rounded-xl lg:w-auto">
            <Link to="/promocoes">
              Ver todas as promoções
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {error ? (
          <Alert variant="destructive" className="rounded-xl">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Falha ao carregar promoções</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Não foi possível carregar as ofertas em destaque.'}
            </AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
                <Skeleton className="aspect-[16/10] w-full" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-7 w-3/4" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!isLoading && promotions.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 xl:grid-cols-4">
            {promotions.map((promotion, index) => (
              <div
                key={promotion.id}
                className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${100 + index * 100}ms` }}
              >
                <PromotionCard promotion={promotion} />
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default PromoHighlights;
