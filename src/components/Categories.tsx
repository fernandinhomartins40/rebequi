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
    <section className="py-16 bg-muted">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12 text-foreground">
          Nossas Categorias
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
          {categories.map((category, index) => (
            <div key={index} className="flex flex-col items-center group cursor-pointer">
              <div className="category-circle bg-white group-hover:bg-brand-gray">
                <category.icon className={`h-8 w-8 ${category.color}`} />
              </div>
              <h3 className="mt-3 text-sm font-medium text-center text-foreground group-hover:text-primary transition-colors">
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