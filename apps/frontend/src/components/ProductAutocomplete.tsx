import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import type { Product } from '@rebequi/shared/types';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { fetchProducts } from '@/services/api/products';

const MIN_SEARCH_LENGTH = 2;
const SUGGESTION_LIMIT = 5;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSelectProduct: (product: Product) => void;
  onBlur?: () => void;
  placeholder?: string;
};

function getProductImage(product: Product) {
  return product.images?.find((image) => image.isPrimary)?.url || product.images?.[0]?.url || null;
}

/**
 * Free-text item field backed by catalogue suggestions.
 *
 * Typing the product name by hand left the item unmatched, so the merchant had
 * to resolve it later. Picking a real product here settles the match at the
 * source — and teaches the system the customer's wording for next time.
 */
export function ProductAutocomplete({
  value,
  onChange,
  onSelectProduct,
  onBlur,
  placeholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const debouncedValue = useDebouncedValue(value, 300);
  const term = debouncedValue.trim();

  const { data, isFetching } = useQuery({
    queryKey: ['products', 'autocomplete', term],
    queryFn: () => fetchProducts({ search: term, limit: SUGGESTION_LIMIT }),
    enabled: open && term.length >= MIN_SEARCH_LENGTH,
    staleTime: 60_000,
  });

  const suggestions = (data?.products ?? []).slice(0, SUGGESTION_LIMIT);

  // Close when focus leaves the whole widget, not just the input, so clicking
  // a suggestion doesn't dismiss the list before the click registers.
  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, onBlur]);

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1">
      <input
        autoFocus
        type="text"
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            setOpen(false);
            if (value.trim()) onBlur?.();
          }
          if (event.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder={placeholder}
        className="w-full rounded border border-primary/30 bg-white px-2 py-1 text-sm outline-none focus:border-primary"
      />

      {open && term.length >= MIN_SEARCH_LENGTH ? (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {isFetching && suggestions.length === 0 ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Procurando no catálogo…
            </div>
          ) : suggestions.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-muted-foreground">
              Não achamos esse produto. Pode deixar escrito assim mesmo — a loja confere.
            </p>
          ) : (
            <ul className="max-h-56 overflow-y-auto">
              {suggestions.map((product) => {
                const image = getProductImage(product);
                return (
                  <li key={product.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProduct(product);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-slate-50"
                    >
                      {image ? (
                        <img
                          src={image}
                          alt=""
                          className="h-8 w-8 shrink-0 rounded border border-slate-100 object-cover"
                        />
                      ) : (
                        <div className="h-8 w-8 shrink-0 rounded bg-slate-100" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm text-foreground">{product.name}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
