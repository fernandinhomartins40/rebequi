import { useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowRight, Package } from "lucide-react";
import { Link } from "react-router-dom";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryColorClass, getCategoryIcon } from "@/lib/category-icons";
import { fetchCategories } from "@/services/api/categories";

function CategoriesPageSkeleton() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_28%,#f8f6ef_100%)]">
      <Header />
      <div className="container mx-auto px-4 py-10">
        <Skeleton className="h-6 w-28" />
        <div className="mt-6 rounded-[2rem] border border-[#e7dcc3] bg-white p-6 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.35)] sm:p-8">
          <Skeleton className="h-6 w-28" />
          <Skeleton className="mt-4 h-10 w-72 max-w-full" />
          <Skeleton className="mt-3 h-5 w-full max-w-2xl" />
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-24 rounded-3xl" />
          </div>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-[2rem]" />
          ))}
        </div>
      </div>
      <Footer />
    </main>
  );
}

export default function CategoriesPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["categories", "public-index"],
    queryFn: fetchCategories,
  });

  const categories = [...(data?.categories ?? [])].sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  const totalProducts = categories.reduce((sum, category) => sum + (category.productsCount ?? 0), 0);

  if (isLoading) {
    return <CategoriesPageSkeleton />;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_28%,#f8f6ef_100%)]">
      <Header />

      <div className="container mx-auto px-4 py-10">
        <section className="rounded-[2rem] border border-[#e7dcc3] bg-white px-5 py-6 shadow-[0_30px_70px_-50px_rgba(15,23,42,0.35)] sm:px-8 sm:py-8">
          <Badge className="border-none bg-accent text-accent-foreground">Catalogo</Badge>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Navegue por todas as categorias da vitrine
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                Cada categoria leva para uma pagina propria com todos os produtos ativos daquele departamento,
                facilitando a exploracao do catalogo sem excesso de informacao.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[1.75rem] border border-black/5 bg-slate-50 px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Categorias</div>
                <div className="mt-2 text-3xl font-bold text-foreground">{categories.length}</div>
                <p className="mt-1 text-sm text-muted-foreground">Departamentos ativos na pagina publica</p>
              </div>

              <div className="rounded-[1.75rem] border border-black/5 bg-slate-50 px-5 py-4">
                <div className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">Produtos</div>
                <div className="mt-2 text-3xl font-bold text-foreground">{totalProducts}</div>
                <p className="mt-1 text-sm text-muted-foreground">Itens distribuidos entre as categorias disponiveis</p>
              </div>
            </div>
          </div>
        </section>

        {error ? (
          <Alert variant="destructive" className="mt-8">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Falha ao carregar categorias</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : "Nao foi possivel carregar as categorias agora."}
            </AlertDescription>
          </Alert>
        ) : categories.length === 0 ? (
          <div className="mt-8 rounded-[2rem] border border-dashed border-[#e7dcc3] bg-white/90 px-6 py-12 text-center shadow-[0_30px_70px_-55px_rgba(15,23,42,0.35)]">
            <Package className="mx-auto h-10 w-10 text-primary" />
            <h2 className="mt-4 text-xl font-semibold text-foreground">Nenhuma categoria publicada</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Assim que novas categorias forem cadastradas e ativadas, elas aparecerao aqui automaticamente.
            </p>
            <Button asChild variant="outline" className="mt-6">
              <Link to="/">Voltar para a pagina inicial</Link>
            </Button>
          </div>
        ) : (
          <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {categories.map((category, index) => {
              const Icon = getCategoryIcon(category.icon, `${category.slug} ${category.name}`);
              const iconColorClass = getCategoryColorClass(index);

              return (
                <Link
                  key={category.id}
                  to={`/categorias/${category.slug}`}
                  className="group overflow-hidden rounded-[2rem] border border-[#e7dcc3] bg-white p-5 shadow-[0_30px_70px_-55px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:shadow-[0_35px_80px_-45px_rgba(15,23,42,0.32)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="category-circle bg-white">
                      <Icon className={`h-8 w-8 ${iconColorClass}`} />
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                  </div>

                  <div className="mt-5">
                    <h2 className="text-xl font-semibold text-foreground">{category.name}</h2>
                    <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-muted-foreground">
                      {category.description || "Abra a categoria para visualizar todos os produtos disponiveis nesta area."}
                    </p>
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-[1.5rem] border border-black/5 bg-slate-50 px-4 py-3">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Produtos</div>
                      <div className="mt-1 text-2xl font-bold text-foreground">{category.productsCount ?? 0}</div>
                    </div>
                    <div className="inline-flex items-center rounded-full bg-white px-3 py-2 text-xs font-semibold text-foreground shadow-sm">
                      Ver categoria
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>

      <Footer />
    </main>
  );
}
