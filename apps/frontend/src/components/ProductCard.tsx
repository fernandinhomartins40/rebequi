import { useState } from "react";
import { Heart, Eye } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PromotionCountdown } from "@/components/PromotionCountdown";

interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  href?: string;
  isNew?: boolean;
  isOffer?: boolean;
  discount?: number;
  promotionBadge?: string;
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
  href,
  isNew = false,
  isOffer = false,
  discount,
  promotionBadge,
  countdownTo,
  countdownLabel,
}: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const productHref = href || `/produto/${slug}`;

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <div
      className="card-hover group overflow-hidden rounded-lg bg-white"
      data-product-id={id}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative overflow-hidden">
        <Link to={productHref} aria-label={`Ver detalhes de ${name}`}>
          <img
            src={image}
            alt={name}
            className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Link>

        <div className="absolute left-2 top-2 flex flex-col space-y-1">
          {isNew ? <Badge className="bg-primary text-primary-foreground">NOVO</Badge> : null}
          {promotionBadge ? <Badge className="bg-accent text-accent-foreground">{promotionBadge}</Badge> : null}
          {isOffer && discount ? <Badge className="bg-accent text-accent-foreground">-{discount}%</Badge> : null}
        </div>

        <div
          className={`absolute right-2 top-2 flex flex-col space-y-1 transition-opacity duration-200 ${
            isHovered ? "opacity-100" : "opacity-0"
          }`}
        >
          <Button size="icon" variant="secondary" className="h-8 w-8">
            <Heart className="h-4 w-4" />
          </Button>
          <Button asChild size="icon" variant="secondary" className="h-8 w-8">
            <Link to={productHref} aria-label={`Abrir ${name}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="p-4">
        <p className="mb-1 text-sm text-muted-foreground">{category}</p>
        <Link to={productHref} className="block">
          <h3 className="mb-2 min-h-[2.5rem] line-clamp-2 font-medium text-foreground transition-colors hover:text-primary">
            {name}
          </h3>
        </Link>

        <div className="mb-3 flex items-center space-x-2">
          <span className="text-lg font-bold text-primary">{formatPrice(price)}</span>
          {originalPrice ? (
            <span className="text-sm text-muted-foreground line-through">{formatPrice(originalPrice)}</span>
          ) : null}
        </div>

        {countdownTo ? (
          <PromotionCountdown expiresAt={countdownTo} label={countdownLabel || 'Termina em'} className="mb-3" />
        ) : null}

        <Button asChild className="w-full" size="sm">
          <Link to={productHref}>
            <Eye className="mr-2 h-4 w-4" />
            Ver produto
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;
