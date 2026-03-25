import { useEffect, useState } from "react";
import { Heart, Eye, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  isNew?: boolean;
  isOffer?: boolean;
  discount?: number;
}

const ProductCard = ({
  id,
  slug,
  name,
  price,
  originalPrice,
  image,
  category,
  isNew = false,
  isOffer = false,
  discount,
}: ProductCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [offerEndsAt] = useState(() => Date.now() + 1000 * 60 * 60 * 24);
  const productHref = `/produto/${slug}`;

  const formatPrice = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  useEffect(() => {
    if (!isOffer) return;

    const tick = () => {
      const diff = offerEndsAt - Date.now();
      setTimeLeft(Math.max(diff, 0));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [isOffer, offerEndsAt]);

  const formatCountdown = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return { days, hours, minutes, seconds };
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
            className="h-48 w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        </Link>

        <div className="absolute left-2 top-2 flex flex-col space-y-1">
          {isNew ? <Badge className="bg-primary text-primary-foreground">NOVO</Badge> : null}
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

        {isOffer ? (
          <div className="mb-3 flex items-center gap-4 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <div className="flex items-center gap-4 font-semibold">
              {(() => {
                const { days, hours, minutes, seconds } = formatCountdown(timeLeft);
                const unit = (value: number, label: string) => (
                  <div className="min-w-[44px] text-center">
                    <div className="text-base font-bold text-primary">{value.toString().padStart(2, "0")}</div>
                    <div className="text-[10px] font-semibold uppercase text-primary/80">{label}</div>
                  </div>
                );

                return (
                  <>
                    {unit(days, "Dias")}
                    {unit(hours, "Hrs")}
                    {unit(minutes, "Min")}
                    {unit(seconds, "Seg")}
                  </>
                );
              })()}
            </div>
          </div>
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
