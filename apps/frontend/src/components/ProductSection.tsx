import ProductCard from "./ProductCard";
import { Button } from "@/components/ui/button";
import type { Product } from "@/types";

interface ProductSectionProps {
  title: string;
  products: Product[];
  showViewAll?: boolean;
}

const ProductSection = ({ title, products, showViewAll = true }: ProductSectionProps) => {
  return (
    <section className="py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h2>
          {showViewAll && (
            <Button variant="outline" className="w-full sm:w-auto">Ver Todos</Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {products.map((product) => {
            const primaryImage =
              (product.images && product.images.length > 0 && product.images[0].url) ||
              "https://via.placeholder.com/400x300?text=Produto";
            const categoryName = product.category?.name || "Categoria";

            return (
              <ProductCard
                key={product.id}
                id={product.id}
                slug={product.slug}
                name={product.name}
                price={product.price}
                originalPrice={product.originalPrice}
                image={primaryImage}
                category={categoryName}
                isNew={product.isNew}
                isOffer={product.isOffer}
                discount={product.discount}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ProductSection;
