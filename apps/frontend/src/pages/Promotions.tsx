import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Boxes, LayoutTemplate, Layers3 } from 'lucide-react';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { PromotionCard } from '@/components/PromotionCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchPromotions } from '@/services/api/promotions';

const PromotionsPage = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['promotions', 'public-list'],
    queryFn: () => fetchPromotions({ kind: 'collection', page: 1, limit: 24 }),
  });

  const promotions = data?.promotions ?? [];
  const productsInCampaigns = promotions.reduce((accumulator, promotion) => accumulator + promotion.productCount, 0);
  const categoriesInCampaigns = new Set(promotions.flatMap((promotion) => promotion.categories)).size;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pb-16 pt-10">
        <div className="container mx-auto space-y-8 px-4 sm:px-6">
          <section className="overflow-hidden rounded-[2rem] border border-[#eadfba] bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(255,255,255,0.98))] p-6 shadow-[0_28px_72px_-48px_rgba(217,119,6,0.24)] sm:p-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-end">
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Promocoes</p>
                <h1 className="max-w-3xl text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  Campanhas organizadas para acelerar a decisao de compra
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  Explore colecoes promocionais montadas com itens de diferentes categorias, prazos definidos e comunicacao visual dedicada para cada oportunidade.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/5 bg-white/90 px-4 py-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <LayoutTemplate className="h-4 w-4" />
                    Cards
                  </div>
                  <p className="mt-3 text-2xl font-bold text-foreground">{promotions.length}</p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/90 px-4 py-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Boxes className="h-4 w-4" />
                    Produtos
                  </div>
                  <p className="mt-3 text-2xl font-bold text-foreground">{productsInCampaigns}</p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/90 px-4 py-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Layers3 className="h-4 w-4" />
                    Categorias
                  </div>
                  <p className="mt-3 text-2xl font-bold text-foreground">{categoriesInCampaigns}</p>
                </div>
              </div>
            </div>
          </section>

          {error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Falha ao carregar promocoes</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : 'Nao foi possivel carregar as promocoes disponiveis.'}
              </AlertDescription>
            </Alert>
          ) : null}

          {isLoading ? (
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="overflow-hidden rounded-[1.75rem] border border-black/5 bg-white">
                  <Skeleton className="aspect-[16/10] w-full" />
                  <div className="space-y-3 p-5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-7 w-3/4" />
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </section>
          ) : null}

          {!isLoading && promotions.length === 0 ? (
            <section className="rounded-[1.75rem] border border-dashed border-black/10 bg-white px-6 py-16 text-center">
              <p className="text-lg font-semibold text-foreground">Nenhuma promocao publicada no momento.</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Assim que novas campanhas forem ativadas, elas aparecerao aqui com todos os produtos vinculados.
              </p>
            </section>
          ) : null}

          {!isLoading && promotions.length > 0 ? (
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {promotions.map((promotion) => (
                <PromotionCard key={promotion.id} promotion={promotion} />
              ))}
            </section>
          ) : null}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PromotionsPage;
