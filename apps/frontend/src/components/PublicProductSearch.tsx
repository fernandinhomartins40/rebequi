import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Loader2, Search } from "lucide-react";
import type { Product } from "@rebequi/shared/types";
import { useLocation, useNavigate } from "react-router-dom";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { cn } from "@/lib/utils";
import { fetchProducts } from "@/services/api/products";
import { Input } from "@/components/ui/input";

const MIN_SEARCH_LENGTH = 2;
const SUGGESTION_LIMIT = 6;

type PublicProductSearchProps = {
  className?: string;
  inputClassName?: string;
  inputId?: string;
  onNavigate?: () => void;
  panelClassName?: string;
  placeholder?: string;
};

function formatPrice(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function getSearchTermFromLocation(pathname: string, search: string) {
  if (pathname !== "/buscar") {
    return "";
  }

  return new URLSearchParams(search).get("termo")?.trim() ?? "";
}

function getProductImage(product: Product) {
  return (
    product.images?.find((image) => image.isPrimary)?.url ||
    product.images?.[0]?.url ||
    "https://via.placeholder.com/96x96?text=Produto"
  );
}

export function PublicProductSearch({
  className,
  inputClassName,
  inputId,
  onNavigate,
  panelClassName,
  placeholder = "Buscar produtos...",
}: PublicProductSearchProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(() => getSearchTermFromLocation(location.pathname, location.search));

  const debouncedSearch = useDebouncedValue(search, 250);
  const trimmedSearch = search.trim();
  const normalizedSearch = debouncedSearch.trim();
  const shouldSearch = normalizedSearch.length >= MIN_SEARCH_LENGTH;
  const isWaitingForDebounce = trimmedSearch.length >= MIN_SEARCH_LENGTH && trimmedSearch !== normalizedSearch;

  useEffect(() => {
    setSearch(getSearchTermFromLocation(location.pathname, location.search));
  }, [location.pathname, location.search]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  const searchQuery = useQuery({
    queryKey: ["products", "public-search-suggestions", normalizedSearch],
    queryFn: () =>
      fetchProducts({
        search: normalizedSearch,
        limit: SUGGESTION_LIMIT,
        page: 1,
      }),
    enabled: shouldSearch,
    staleTime: 30_000,
  });

  const products = searchQuery.data?.products ?? [];
  const totalResults = searchQuery.data?.total ?? products.length;
  const showPanel = isOpen && trimmedSearch.length > 0;

  const resultLabel = useMemo(() => {
    if (!shouldSearch) {
      return "Digite pelo menos 2 caracteres para buscar.";
    }

    if (searchQuery.isError) {
      return searchQuery.error instanceof Error
        ? searchQuery.error.message
        : "Nao foi possivel buscar produtos agora.";
    }

    if (isWaitingForDebounce || searchQuery.isLoading || searchQuery.isFetching) {
      return "Buscando produtos...";
    }

    if (products.length === 0) {
      return "Nenhum produto encontrado para este termo.";
    }

    return `${totalResults} resultado${totalResults === 1 ? "" : "s"} encontrado${totalResults === 1 ? "" : "s"}.`;
  }, [isWaitingForDebounce, products.length, searchQuery.error, searchQuery.isError, searchQuery.isFetching, searchQuery.isLoading, shouldSearch, totalResults]);

  const navigateToSearchPage = (value = search) => {
    const nextSearch = value.trim();

    if (nextSearch.length < MIN_SEARCH_LENGTH) {
      setIsOpen(true);
      return;
    }

    setIsOpen(false);
    onNavigate?.();
    navigate(`/buscar?termo=${encodeURIComponent(nextSearch)}`);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigateToSearchPage();
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value);
    setIsOpen(true);
  };

  const handleSelectProduct = (product: Product) => {
    setIsOpen(false);
    onNavigate?.();
    navigate(`/produto/${product.slug}`);
  };

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={inputId}
            type="search"
            value={search}
            placeholder={placeholder}
            className={cn("pl-10 pr-4", inputClassName)}
            autoComplete="off"
            onChange={handleInputChange}
            onFocus={() => {
              if (trimmedSearch.length > 0) {
                setIsOpen(true);
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setIsOpen(false);
              }
            }}
          />
        </div>
      </form>

      {showPanel ? (
        <div
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+0.5rem)] z-[70] overflow-hidden rounded-[1.5rem] border border-black/10 bg-white shadow-[0_28px_72px_-44px_rgba(15,23,42,0.3)]",
            panelClassName,
          )}
        >
          <div className="border-b border-black/5 px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Busca publica
          </div>

          <div className="px-4 py-3 text-sm text-muted-foreground">
            {isWaitingForDebounce || searchQuery.isLoading || searchQuery.isFetching ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {resultLabel}
              </span>
            ) : (
              resultLabel
            )}
          </div>

          {shouldSearch && !searchQuery.isError && !isWaitingForDebounce && !searchQuery.isLoading && products.length > 0 ? (
            <div className="max-h-[26rem] overflow-y-auto px-2 pb-2">
              {products.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-[1.25rem] px-3 py-3 text-left transition hover:bg-slate-50"
                  onClick={() => handleSelectProduct(product)}
                >
                  <img
                    src={getProductImage(product)}
                    alt={product.name}
                    className="h-14 w-14 rounded-2xl border border-black/5 object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-semibold text-foreground">{product.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{product.category?.name || "Catalogo"}</p>
                  </div>
                  <span className="text-xs font-semibold text-primary">{formatPrice(product.price)}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="border-t border-black/5 p-2">
            <button
              type="button"
              className="flex w-full items-center justify-between rounded-[1.15rem] px-3 py-3 text-sm font-semibold text-foreground transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={trimmedSearch.length < MIN_SEARCH_LENGTH}
              onClick={() => navigateToSearchPage()}
            >
              Ver todos os resultados
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
