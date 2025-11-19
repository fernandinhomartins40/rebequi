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
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-foreground">{title}</h2>
          {showViewAll && (
            <Button variant="outline">Ver Todos</Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} {...product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProductSection;