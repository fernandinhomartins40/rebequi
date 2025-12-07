import { ClipboardCheck, Hammer, Home, Truck } from "lucide-react";

const services = [
  {
    title: "Entrega expressa",
    description: "Frota e parceiros para chegar rápido na obra ou retirada agendada.",
    icon: Truck,
    accent: "from-brand-red/10 to-brand-red/5",
  },
  {
    title: "Projeto sob medida",
    description: "Acompanhamento técnico para montar lista de materiais completa.",
    icon: ClipboardCheck,
    accent: "from-brand-blue/10 to-brand-blue/5",
  },
  {
    title: "Aluguel de ferramentas",
    description: "Equipamentos revisados e prontos para uso sem investir pesado.",
    icon: Hammer,
    accent: "from-brand-yellow/10 to-brand-yellow/5",
  },
  {
    title: "Acabamento e pisos",
    description: "Suporte na escolha de revestimentos, argamassas e rejuntes.",
    icon: Home,
    accent: "from-brand-blue/10 to-brand-yellow/5",
  },
];

const Services = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 space-y-10">
        <div className="flex flex-col gap-3 text-center">
          <p className="text-sm font-semibold text-primary uppercase">Soluções para a obra</p>
          <h2 className="text-3xl font-bold text-foreground">Serviços que aceleram seu projeto</h2>
          <p className="text-muted-foreground">
            Combine entrega, consultoria e aluguel para manter o cronograma sem surpresas.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {services.map((item) => (
            <div
              key={item.title}
              className="relative overflow-hidden rounded-xl border bg-gradient-to-br p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${item.accent}`} />
              <div className="relative space-y-3">
                <div className="inline-flex items-center justify-center rounded-lg bg-white/80 p-2 shadow-sm">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
