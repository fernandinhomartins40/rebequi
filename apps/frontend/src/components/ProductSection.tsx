import ProductCard from "./ProductCard";
import { Button } from "@/components/ui/button";
import type { Product, Promotion } from "@/types";
import { Link } from "react-router-dom";
import { getPromotionBadgeLabel, getPromotionProductPricingData } from "@/lib/promotion-ui";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { ArrowRight } from "lucide-react";

type ProductSectionItem = {
  product: Product;
  href?: string;
  promotion?: Promotion;
};

interface ProductSectionProps {
  title: string;
  products?: Product[];
  items?: ProductSectionItem[];
  showViewAll?: boolean;
  viewAllHref?: string;
  viewAllLabel?: string;
  highlightColor?: "blue" | "red" | "yellow";
}

const ProductSection = ({
  title,
  products = [],
  items,
  showViewAll = true,
  viewAllHref,
  viewAllLabel = "Ver todos",
  highlightColor = "blue",
}: ProductSectionProps) => {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  const sectionItems: ProductSectionItem[] =
    items ??
    products.map((product) => ({
      product,
    }));

  const accentClass = {
    blue: "bg-primary",
    red: "bg-brand-red",
    yellow: "bg-brand-yellow",
  }[highlightColor];

  return (
    <section ref={ref} className="py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6">
        <div className={`mb-8 flex flex-col gap-3 transition-all duration-700 sm:mb-10 sm:flex-row sm:items-end sm:justify-between ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <div className="flex items-center gap-3">
            <div className={`h-8 w-1.5 rounded-full ${accentClass}`} />
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              {title}
            </h2>
          </div>
          {showViewAll && (
            <Button
              asChild={Boolean(viewAllHref)}
              variant="outline"
              size="sm"
              className="w-full rounded-xl sm:w-auto"
            >
              {viewAllHref ? (
                <Link to={viewAllHref}>
                  {viewAllLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              ) : (
                <span>{viewAllLabel}</span>
              )}
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          {sectionItems.map(({ product, href, promotion }, index) => {
            const primaryImage =
              promotion?.image?.url ||
              (product.images && product.images.length > 0 && product.images[0].url) ||
              "https://via.placeholder.com/400x300?text=Produto";
            const categoryName = product.category?.name || "Categoria";
            const pricing = getPromotionProductPricingData(promotion, product);

            return (
              <div
                key={promotion?.id || href || product.id}
                className={`transition-all duration-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
                style={{ transitionDelay: `${80 + index * 80}ms` }}
              >
                <ProductCard
                  id={product.id}
                  slug={product.slug}
                  name={product.name}
                  price={pricing.price}
                  originalPrice={pricing.originalPrice}
                  image={primaryImage}
                  category={categoryName}
                  stock={product.stock}
                  promotionId={promotion?.id}
                  href={href}
                  isNew={product.isNew}
                  isOffer={Boolean(promotion?.offerPricing) || promotion?.kind === 'single_product' || product.isOffer}
                  discount={pricing.discount}
                  promotionBadge={getPromotionBadgeLabel(promotion)}
                  offerSummary={pricing.offerSummary}
                  countdownTo={promotion?.expiresAt}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProductSection;
