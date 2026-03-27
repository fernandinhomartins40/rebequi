import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { PromotionCard } from '@/components/PromotionCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPromotions } from '@/services/api/promotions';

const PromoHighlights = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['promotions', 'highlights'],
    queryFn: () => fetchPromotions({ kind: 'collection', page: 1, limit: 4 }),
  });

  const promotions = data?.promotions ?? [];

  if (!isLoading && promotions.length === 0 && !error) {
    return null;
  }

  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="container mx-auto space-y-6 px-4 sm:px-6 sm:space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2 text-center lg:text-left">
            <p className="text-sm font-semibold uppercase text-primary">Ofertas em destaque</p>
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Campanhas promocionais</h2>
            <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base lg:mx-0">
              Cards promocionais organizam coleções especiais com produtos de uma ou mais categorias.
            </p>
          </div>

          <Button asChild variant="outline" className="rounded-2xl">
            <Link to="/promocoes">Ver todas as promoções</Link>
          </Button>
        </div>

        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Falha ao carregar promoções</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Não foi possível carregar as ofertas em destaque.'}
            </AlertDescription>
          </Alert>
        ) : null}

        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-[1.75rem] border border-black/5 bg-white">
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
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {promotions.map((promotion) => (
              <PromotionCard key={promotion.id} promotion={promotion} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default PromoHighlights;
