import { ClipboardCheck, Hammer, Home, Truck } from "lucide-react";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const services = [
  {
    title: "Entrega expressa",
    description: "Frota própria e parceiros para chegar rápido na obra ou retirada agendada.",
    icon: Truck,
    bg: "bg-brand-red/10",
    iconBg: "bg-brand-red/15",
    iconColor: "text-brand-red",
  },
  {
    title: "Projeto sob medida",
    description: "Consultoria técnica para montar a lista de materiais completa da sua obra.",
    icon: ClipboardCheck,
    bg: "bg-primary/10",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
  },
  {
    title: "Aluguel de ferramentas",
    description: "Equipamentos revisados e prontos para uso sem investimento pesado.",
    icon: Hammer,
    bg: "bg-brand-yellow/20",
    iconBg: "bg-brand-yellow/30",
    iconColor: "text-foreground",
  },
  {
    title: "Acabamento e pisos",
    description: "Suporte na escolha de revestimentos, argamassas e rejuntes.",
    icon: Home,
    bg: "bg-primary/10",
    iconBg: "bg-primary/15",
    iconColor: "text-primary",
  },
];

const Services = () => {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section ref={ref} className="bg-white py-12 sm:py-16 lg:py-20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className={`mb-10 text-center transition-all duration-700 sm:mb-12 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-widest text-brand-red">
            Soluções para a obra
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Serviços que aceleram seu projeto
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Combine entrega, consultoria e aluguel para manter o cronograma sem surpresas.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {services.map((item, index) => (
            <div
              key={item.title}
              className={`group relative overflow-hidden rounded-2xl border border-border/40 bg-white p-6 shadow-sm transition-all duration-500 hover:-translate-y-1 hover:shadow-md ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionDelay: `${120 + index * 100}ms` }}
            >
              {/* Subtle background tint */}
              <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${item.bg} opacity-50 transition-transform duration-500 group-hover:scale-150`} />

              <div className="relative">
                <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${item.iconBg} transition-transform duration-300 group-hover:scale-110`}>
                  <item.icon className={`h-6 w-6 ${item.iconColor}`} />
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
