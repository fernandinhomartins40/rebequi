import { Hammer, Truck, Star, ShieldCheck, Clock, Award } from "lucide-react";

const Marquee = () => {
  const items = [
    { icon: Hammer, text: "Melhor Preço" },
    { icon: Truck, text: "Entrega Rápida" },
    { icon: Star, text: "Qualidade Garantida" },
    { icon: ShieldCheck, text: "Produtos Certificados" },
    { icon: Clock, text: "Atendimento 24/7" },
    { icon: Award, text: "15 Anos de Experiência" },
  ];

  const allItems = [...items, ...items, ...items, ...items];

  return (
    <div className="overflow-hidden py-3 sm:py-4" style={{ backgroundColor: '#cc2227' }}>
      <div className="flex">
        <div className="marquee-content flex items-center gap-10 sm:gap-14">
          {allItems.map((item, index) => (
            <div
              key={index}
              className="flex items-center gap-2.5 whitespace-nowrap"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10">
                <item.icon className="h-3.5 w-3.5 text-brand-yellow" />
              </div>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-yellow sm:text-sm">
                {item.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Marquee;
