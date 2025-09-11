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

  return (
    <div className="py-3 overflow-hidden" style={{ backgroundColor: '#cc2227' }}>
      <div className="marquee">
        <div className="marquee-content">
          {/* Duplicate items to ensure continuous scroll */}
          {[...items, ...items, ...items].map((item, index) => (
            <div
              key={index}
              className="flex items-center space-x-2 font-semibold"
              style={{ color: '#f9ef38' }}
            >
              <item.icon className="h-5 w-5" />
              <span className="whitespace-nowrap">{item.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Marquee;