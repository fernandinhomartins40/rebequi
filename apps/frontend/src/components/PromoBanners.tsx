import { Button } from "@/components/ui/button";
import { ArrowRight, Wrench, Truck } from "lucide-react";
import { Link } from "react-router-dom";
import { useScrollReveal } from "@/hooks/useScrollReveal";

const PromoBanners = () => {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();

  return (
    <section ref={ref} className="bg-muted py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          {/* Banner 1 - Ferramentas */}
          <div
            className={`group relative min-h-[240px] overflow-hidden rounded-2xl bg-gradient-to-br from-brand-blue via-brand-blue to-blue-700 sm:h-72 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: "100ms" }}
          >
            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/20" />
              <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/10" />
            </div>

            <div className="relative flex h-full flex-col justify-center p-6 text-white sm:p-10">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <Wrench className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Ferramentas Profissionais
              </h3>
              <p className="mb-6 max-w-sm text-sm text-white/80 sm:text-base">
                Até 30% OFF em ferramentas selecionadas para sua obra
              </p>
              <div>
                <Button
                  asChild
                  variant="secondary"
                  className="rounded-xl bg-white text-brand-blue shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-xl"
                >
                  <Link to="/categorias/ferramentas">
                    Ver Ofertas
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Decorative icon */}
            <div className="absolute -bottom-4 -right-4 opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
              <Wrench className="h-48 w-48" />
            </div>
          </div>

          {/* Banner 2 - Entrega */}
          <div
            className={`group relative min-h-[240px] overflow-hidden rounded-2xl bg-gradient-to-br from-brand-red via-brand-red to-red-700 sm:h-72 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
            style={{ transitionDelay: "200ms" }}
          >
            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/20" />
              <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-white/10" />
            </div>

            <div className="relative flex h-full flex-col justify-center p-6 text-white sm:p-10">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <Truck className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
                Entrega Expressa
              </h3>
              <p className="mb-6 max-w-sm text-sm text-white/80 sm:text-base">
                Receba em até 24h na região metropolitana com rastreamento
              </p>
              <div>
                <Button
                  asChild
                  variant="secondary"
                  className="rounded-xl bg-white text-brand-red shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-xl"
                >
                  <Link to="/contato">
                    Saiba Mais
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            {/* Decorative icon */}
            <div className="absolute -bottom-4 -right-4 opacity-10 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
              <Truck className="h-48 w-48" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoBanners;
