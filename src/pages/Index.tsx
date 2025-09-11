import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Marquee from "@/components/Marquee";
import Categories from "@/components/Categories";
import ProductSection from "@/components/ProductSection";
import PromoBanners from "@/components/PromoBanners";
import Footer from "@/components/Footer";

// Import product images
import productCement from "@/assets/product-cement.jpg";
import productHammer from "@/assets/product-hammer.jpg";
import productPaint from "@/assets/product-paint.jpg";
import productDrill from "@/assets/product-drill.jpg";

const Index = () => {
  // Mock product data
  const promotions = [
    {
      id: "1",
      name: "Cimento Portland CP II 50kg",
      price: 24.90,
      originalPrice: 34.90,
      image: productCement,
      category: "Cimento e Argamassa",
      isOffer: true,
      discount: 29,
    },
    {
      id: "2",
      name: "Martelo Profissional 500g",
      price: 45.90,
      originalPrice: 59.90,
      image: productHammer,
      category: "Ferramentas",
      isOffer: true,
      discount: 23,
    },
    {
      id: "3",
      name: "Tinta Látex Premium 18L",
      price: 189.90,
      originalPrice: 249.90,
      image: productPaint,
      category: "Tintas",
      isOffer: true,
      discount: 24,
    },
    {
      id: "4",
      name: "Furadeira Elétrica 650W",
      price: 299.90,
      originalPrice: 399.90,
      image: productDrill,
      category: "Ferramentas",
      isOffer: true,
      discount: 25,
    },
  ];

  const newProducts = [
    {
      id: "5",
      name: "Broca Set Profissional 13 Peças",
      price: 79.90,
      image: productDrill,
      category: "Ferramentas",
      isNew: true,
    },
    {
      id: "6",
      name: "Argamassa Colante AC-I 20kg",
      price: 19.90,
      image: productCement,
      category: "Cimento e Argamassa",
      isNew: true,
    },
    {
      id: "7",
      name: "Tinta Esmalte Sintético 3,6L",
      price: 89.90,
      image: productPaint,
      category: "Tintas",
      isNew: true,
    },
    {
      id: "8",
      name: "Alicate Universal 8'' Isolado",
      price: 34.90,
      image: productHammer,
      category: "Ferramentas",
      isNew: true,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <Marquee />
      <Categories />
      <ProductSection title="Promoções Imperdíveis" products={promotions} />
      <PromoBanners />
      <ProductSection title="Novidades" products={newProducts} />
      <Footer />
    </div>
  );
};

export default Index;
