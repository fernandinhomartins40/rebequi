import { useEffect, useState } from "react";
import { ShoppingCart, Heart, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  id: string;
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
  const [offerEndsAt] = useState(() => Date.now() + 1000 * 60 * 60 * 24); // 24h de contagem padrão

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
      className="card-hover bg-white rounded-lg overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Image Container */}
      <div className="relative overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
        />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col space-y-1">
          {isNew && (
            <Badge className="bg-primary text-primary-foreground">NOVO</Badge>
          )}
          {isOffer && discount && (
            <Badge className="bg-accent text-accent-foreground">
              -{discount}%
            </Badge>
          )}
        </div>

        {/* Quick Actions */}
        <div className={`absolute top-2 right-2 flex flex-col space-y-1 transition-opacity duration-200 ${
          isHovered ? "opacity-100" : "opacity-0"
        }`}>
          <Button size="icon" variant="secondary" className="h-8 w-8">
            <Heart className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="secondary" className="h-8 w-8">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <p className="text-sm text-muted-foreground mb-1">{category}</p>
        <h3 className="font-medium text-foreground mb-2 line-clamp-2 min-h-[2.5rem]">
          {name}
        </h3>
        
        {/* Price */}
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-lg font-bold text-primary">
            {formatPrice(price)}
          </span>
          {originalPrice && (
            <span className="text-sm text-muted-foreground line-through">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>

        {isOffer && (
          <div className="mb-3 flex items-center gap-4 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary">
            <Clock className="h-4 w-4 flex-shrink-0" />
            <div className="flex items-center gap-4 font-semibold">
              {(() => {
                const { days, hours, minutes, seconds } = formatCountdown(timeLeft);
                const unit = (value: number, label: string) => (
                  <div className="text-center min-w-[44px]">
                    <div className="text-base text-primary font-bold">{value.toString().padStart(2, "0")}</div>
                    <div className="text-[10px] text-primary/80 uppercase font-semibold">{label}</div>
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
        )}

        {/* Add to Cart Button */}
        <Button className="w-full" size="sm">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Adicionar ao Carrinho
        </Button>
      </div>
    </div>
  );
};

export default ProductCard;
