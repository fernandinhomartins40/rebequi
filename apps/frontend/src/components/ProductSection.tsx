import ProductCard from "./ProductCard";
import { Button } from "@/components/ui/button";
import type { Product, Promotion } from "@/types";
import { Link } from "react-router-dom";
import { getPromotionBadgeLabel, getPromotionProductPricingData } from "@/lib/promotion-ui";

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
}

const ProductSection = ({
  title,
  products = [],
  items,
  showViewAll = true,
  viewAllHref,
  viewAllLabel = "Ver Todos",
}: ProductSectionProps) => {
  const sectionItems: ProductSectionItem[] =
    items ??
    products.map((product) => ({
      product,
    }));

  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h2>
          {showViewAll && (
            <Button asChild={Boolean(viewAllHref)} variant="outline" className="w-full sm:w-auto">
              {viewAllHref ? <Link to={viewAllHref}>{viewAllLabel}</Link> : <span>{viewAllLabel}</span>}
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {sectionItems.map(({ product, href, promotion }) => {
            const primaryImage =
              promotion?.image?.url ||
              (product.images && product.images.length > 0 && product.images[0].url) ||
              "https://via.placeholder.com/400x300?text=Produto";
            const categoryName = product.category?.name || "Categoria";
            const pricing = getPromotionProductPricingData(promotion, product);

            return (
              <ProductCard
                key={promotion?.id || href || product.id}
                id={product.id}
                slug={product.slug}
                name={product.name}
                price={pricing.price}
                originalPrice={pricing.originalPrice}
                image={primaryImage}
                category={categoryName}
                href={href}
                isNew={product.isNew}
                isOffer={promotion?.kind === 'single_product' || product.isOffer}
                discount={pricing.discount}
                promotionBadge={getPromotionBadgeLabel(promotion)}
                offerSummary={pricing.offerSummary}
                countdownTo={promotion?.expiresAt}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProductSection;
