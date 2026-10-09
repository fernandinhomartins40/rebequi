import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getCategoryColorClass, getCategoryIcon } from "@/lib/category-icons";
import { fetchCategories } from "@/services/api/categories";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const Categories = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["categories", "home"],
    queryFn: () => fetchCategories(),
  });

  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  const categories = [...(data?.categories ?? [])]
    .sort((left, right) => left.name.localeCompare(right.name, "pt-BR"))
    .slice(0, 8);

  return (
    <section ref={ref} className="bg-muted py-12 sm:py-16 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className={`mb-10 flex flex-col gap-4 text-center transition-all duration-700 sm:mb-12 sm:flex-row sm:items-end sm:justify-between sm:text-left ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div>
            <span className="mb-2 inline-block text-xs font-bold uppercase tracking-widest text-brand-red">
              Navegue por setor
            </span>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Nossas Categorias
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
              Acesse uma página dedicada para cada categoria e veja todos os produtos disponíveis.
            </p>
          </div>

          <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
            <Link to="/categorias">
              Ver todas
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="flex flex-col items-center">
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="mt-3 h-4 w-20" />
              </div>
            ))}
          </div>
        ) : error || categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-white/90 px-6 py-10 text-center shadow-sm">
            <p className="text-sm text-muted-foreground">
              Não foi possível carregar as categorias no momento. Use a página completa para tentar novamente.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8">
            {categories.map((category, index) => {
              const Icon = getCategoryIcon(category.icon, `${category.slug} ${category.name}`);
              const iconColorClass = getCategoryColorClass(index);

              return (
                <Link
                  key={category.id}
                  to={`/categorias/${category.slug}`}
                  className={`group flex flex-col items-center rounded-2xl bg-white p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
                  style={{ transitionDelay: `${100 + index * 60}ms` }}
                  aria-label={`Abrir categoria ${category.name}`}
                >
                  <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-xl bg-muted transition-transform duration-300 group-hover:scale-110 ${iconColorClass}`}>
                    <Icon className="h-7 w-7" />
                  </div>
                  <h3 className="text-center text-xs font-semibold text-foreground transition-colors group-hover:text-primary sm:text-sm">
                    {category.name}
                  </h3>
                  <p className="mt-1 text-center text-[11px] text-muted-foreground">
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
