import { useState } from "react";
import { Heart, Eye, ShoppingCart, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import type { Product } from "@/types";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PromotionCountdown } from "@/components/PromotionCountdown";
import { useToast } from "@/components/ui/use-toast";

interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  stock?: number;
  promotionId?: string;
  href?: string;
  isNew?: boolean;
  isOffer?: boolean;
  discount?: number;
  promotionBadge?: string;
  offerSummary?: string;
  countdownTo?: string | Date | null;
  countdownLabel?: string;
}

const ProductCard = ({
  id,
  slug,
  name,
  price,
  originalPrice,
  image,
  category,
  stock = 0,
  promotionId,
  href,
  isNew = false,
  isOffer = false,
  discount,
  promotionBadge,
  offerSummary,
  countdownTo,
  countdownLabel,
}: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const { addItem } = useCart();
  const { toast } = useToast();
  const productHref = href || `/produto/${slug}`;
  const canAddToCart = stock > 0;

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const handleAddToCart = () => {
    if (!canAddToCart) return;

    addItem(
      {
        category: { id: "", name: category, slug: "" },
        categoryId: "",
        createdAt: new Date().toISOString(),
        id,
        images: [{ alt: name, isPrimary: true, order: 0, url: image }],
        isActive: true,
        isFeatured: false,
        isNew,
        isOffer,
        minStock: 0,
        name,
        originalPrice,
        price,
        slug,
        stock,
        updatedAt: new Date().toISOString(),
      } as Product,
      1,
      promotionId,
    );

    toast({
      title: "Produto adicionado",
      description: `${name} foi para o carrinho.`,
    });
  };

  return (
    <div
      data-ui="product-card"
      className="group flex flex-col overflow-hidden rounded-lg border border-border/40 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
      data-product-id={id}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden bg-muted">
        <Link to={productHref} aria-label={`Ver detalhes de ${name}`}>
          {!isImageLoaded && (
            <div className="aspect-square w-full animate-pulse bg-muted" />
          )}
          <img
            src={image}
            alt={name}
            className={`aspect-square w-full object-contain p-2 transition-all duration-500 group-hover:scale-105 ${isImageLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setIsImageLoaded(true)}
          />
        </Link>

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-col gap-1.5">
          {isNew ? (
            <Badge className="rounded-lg bg-primary px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              Novo
            </Badge>
          ) : null}
          {promotionBadge ? (
            <Badge className="rounded-lg bg-brand-red px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
              {promotionBadge}
            </Badge>
          ) : null}
          {isOffer && discount ? (
            <Badge className="rounded-lg bg-brand-yellow px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-foreground shadow-sm">
              -{discount}%
            </Badge>
          ) : null}
        </div>

        {/* Quick Actions */}
        <div
          className={`absolute right-3 top-3 flex flex-col gap-1.5 transition-all duration-300 ${
            isHovered ? "translate-x-0 opacity-100" : "translate-x-2 opacity-0"
          }`}
        >
          <Button
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-colors hover:bg-white"
          >
            <Heart className="h-3.5 w-3.5" />
          </Button>
          <Button
            asChild
            size="icon"
            variant="secondary"
            className="h-8 w-8 rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-colors hover:bg-white"
          >
            <Link to={productHref} aria-label={`Abrir ${name}`}>
              <Eye className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {category}
        </p>
        <Link to={productHref} className="block flex-1">
          <h3 className="mb-2 line-clamp-2 text-sm font-semibold leading-snug text-foreground transition-colors hover:text-primary">
            {name}
          </h3>
        </Link>

        {/* Pricing */}
        <div className="mb-2 flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-primary">{formatPrice(price)}</span>
          {originalPrice ? (
            <span className="text-xs text-muted-foreground line-through">{formatPrice(originalPrice)}</span>
          ) : null}
        </div>

        {offerSummary ? (
          <p className="mb-2 line-clamp-1 text-xs leading-5 text-muted-foreground">{offerSummary}</p>
        ) : null}

        {countdownTo ? (
          <PromotionCountdown expiresAt={countdownTo} label={countdownLabel || 'Termina em'} className="mb-3" />
        ) : null}

        {/* Actions */}
        <div className="mt-auto grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
          <Button
            size="sm"
            onClick={handleAddToCart}
            disabled={!canAddToCart}
            className="h-9 rounded-xl text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5"
          >
            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />
            {canAddToCart ? "Adicionar" : "Sem estoque"}
          </Button>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="hidden h-9 rounded-xl sm:inline-flex"
          >
            <Link to={productHref}>
              <Zap className="mr-1.5 h-3.5 w-3.5" />
              Ver
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
