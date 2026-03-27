import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryColorClass, getCategoryIcon } from "@/lib/category-icons";
import { fetchCategories } from "@/services/api/categories";

const Categories = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["categories", "home"],
    queryFn: fetchCategories,
  });

  const categories = [...(data?.categories ?? [])]
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"))
    .slice(0, 8);

  return (
    <section className="bg-muted py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mb-10 flex flex-col gap-4 text-center sm:mb-12 sm:flex-row sm:items-end sm:justify-between sm:text-left">
          <div>
            <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Nossas Categorias</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Acesse uma pagina dedicada para cada categoria e veja todos os produtos disponiveis naquele setor.
            </p>
          </div>

          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/categorias">
              Ver todas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex flex-col items-center">
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="mt-3 h-4 w-24" />
              </div>
            ))}
          </div>
        ) : error || categories.length === 0 ? (
          <div className="rounded-[1.75rem] border border-dashed border-[#e7dcc3] bg-white/90 px-6 py-10 text-center shadow-[0_30px_70px_-55px_rgba(15,23,42,0.3)]">
            <p className="text-sm text-muted-foreground">
              Nao foi possivel carregar as categorias no momento. Use a pagina completa para tentar novamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8">
            {categories.map((category, index) => {
              const Icon = getCategoryIcon(category.icon, `${category.slug} ${category.name}`);
              const iconColorClass = getCategoryColorClass(index);

              return (
                <Link
                  key={category.id}
                  to={`/categorias/${category.slug}`}
                  className="group flex flex-col items-center rounded-3xl px-3 py-2 transition hover:-translate-y-1"
                  aria-label={`Abrir categoria ${category.name}`}
                >
                  <div className="category-circle bg-white group-hover:bg-brand-gray">
                    <Icon className={`h-7 w-7 sm:h-8 sm:w-8 ${iconColorClass}`} />
                  </div>
                  <h3 className="mt-3 text-center text-xs font-medium text-foreground transition-colors group-hover:text-primary sm:text-sm">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-center text-[11px] text-muted-foreground sm:text-xs">
                    {category.productsCount ?? 0} produtos
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default Categories;
