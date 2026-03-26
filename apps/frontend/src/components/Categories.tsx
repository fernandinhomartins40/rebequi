import { 
  Package, 
  Hammer, 
  Paintbrush, 
  Zap, 
  Droplets, 
  Trees, 
  Wrench,
  HardHat
} from "lucide-react";

const Categories = () => {
  const categories = [
    { name: "Cimento e Argamassa", icon: Package, color: "text-brand-blue" },
    { name: "Tijolos e Blocos", icon: HardHat, color: "text-brand-red" },
    { name: "Ferramentas", icon: Hammer, color: "text-brand-yellow" },
    { name: "Tintas", icon: Paintbrush, color: "text-brand-blue" },
    { name: "Materiais Elétricos", icon: Zap, color: "text-brand-red" },
    { name: "Hidráulica", icon: Droplets, color: "text-brand-yellow" },
    { name: "Madeiras", icon: Trees, color: "text-brand-blue" },
    { name: "Ferros e Metais", icon: Wrench, color: "text-brand-red" },
  ];

  return (
    <section className="bg-muted py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6">
        <h2 className="mb-10 text-center text-2xl font-bold text-foreground sm:mb-12 sm:text-3xl">
          Nossas Categorias
        </h2>
        
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-8">
          {categories.map((category, index) => (
            <div key={index} className="flex flex-col items-center group cursor-pointer">
              <div className="category-circle bg-white group-hover:bg-brand-gray">
                <category.icon className={`h-7 w-7 sm:h-8 sm:w-8 ${category.color}`} />
              </div>
              <h3 className="mt-3 text-center text-xs font-medium text-foreground transition-colors group-hover:text-primary sm:text-sm">
                {category.name}
              </h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
