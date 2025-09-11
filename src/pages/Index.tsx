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

  const toolsProducts = [
    {
      id: "9",
      name: "Chave de Fenda Magnética 6''",
      price: 12.90,
      image: productHammer,
      category: "Ferramentas",
    },
    {
      id: "10",
      name: "Furadeira de Bancada 16mm",
      price: 459.90,
      image: productDrill,
      category: "Ferramentas",
    },
    {
      id: "11",
      name: "Kit Alicate 3 Peças",
      price: 89.90,
      image: productHammer,
      category: "Ferramentas",
    },
    {
      id: "12",
      name: "Parafusadeira Elétrica 12V",
      price: 199.90,
      image: productDrill,
      category: "Ferramentas",
    },
  ];

  const paintsProducts = [
    {
      id: "13",
      name: "Tinta Acrílica Fosca 18L Branca",
      price: 159.90,
      image: productPaint,
      category: "Tintas",
    },
    {
      id: "14",
      name: "Verniz Marítimo 3,6L",
      price: 129.90,
      image: productPaint,
      category: "Tintas",
    },
    {
      id: "15",
      name: "Massa Corrida PVA 25kg",
      price: 49.90,
      image: productPaint,
      category: "Tintas",
    },
    {
      id: "16",
      name: "Primer Universal 3,6L",
      price: 79.90,
      image: productPaint,
      category: "Tintas",
    },
  ];

  const constructionProducts = [
    {
      id: "17",
      name: "Cimento CP III 40kg",
      price: 22.90,
      image: productCement,
      category: "Cimento e Argamassa",
    },
    {
      id: "18",
      name: "Argamassa AC-III Exterior 20kg",
      price: 24.90,
      image: productCement,
      category: "Cimento e Argamassa",
    },
    {
      id: "19",
      name: "Rejunte Flexível Cinza 1kg",
      price: 8.90,
      image: productCement,
      category: "Cimento e Argamassa",
    },
    {
      id: "20",
      name: "Cal Hidratada CH-I 20kg",
      price: 6.90,
      image: productCement,
      category: "Cimento e Argamassa",
    },
  ];

  const electricProducts = [
    {
      id: "21",
      name: "Cabo Flexível 2,5mm 100m",
      price: 189.90,
      image: productDrill,
      category: "Materiais Elétricos",
    },
    {
      id: "22",
      name: "Disjuntor Bipolar 25A",
      price: 34.90,
      image: productHammer,
      category: "Materiais Elétricos",
    },
    {
      id: "23",
      name: "Tomada 2P+T 10A Branca",
      price: 12.90,
      image: productHammer,
      category: "Materiais Elétricos",
    },
    {
      id: "24",
      name: "Fita Isolante 19mm x 20m",
      price: 4.90,
      image: productDrill,
      category: "Materiais Elétricos",
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
      <ProductSection title="Ferramentas" products={toolsProducts} />
      <ProductSection title="Tintas e Acessórios" products={paintsProducts} />
      <ProductSection title="Cimento e Argamassa" products={constructionProducts} />
      <ProductSection title="Materiais Elétricos" products={electricProducts} />
      <Footer />
    </div>
  );
};

export default Index;
