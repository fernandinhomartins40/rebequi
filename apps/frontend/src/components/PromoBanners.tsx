import { Button } from "@/components/ui/button";

const PromoBanners = () => {
  return (
    <section className="bg-muted py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
          <div className="group relative min-h-[220px] overflow-hidden rounded-lg bg-gradient-to-r from-brand-blue to-brand-blue/80 sm:h-64">
            <div className="absolute inset-0 flex flex-col justify-center p-5 text-white sm:p-8">
              <h3 className="mb-2 text-xl font-bold sm:text-2xl">Ferramentas Profissionais</h3>
              <p className="mb-4 text-sm sm:text-lg">Ate 30% OFF em ferramentas selecionadas</p>
              <Button variant="secondary" className="w-full sm:w-fit">
                Ver Ofertas
              </Button>
            </div>
            <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/30" />
          </div>

          <div className="group relative min-h-[220px] overflow-hidden rounded-lg bg-gradient-to-r from-brand-red to-brand-red/80 sm:h-64">
            <div className="absolute inset-0 flex flex-col justify-center p-5 text-white sm:p-8">
              <h3 className="mb-2 text-xl font-bold sm:text-2xl">Entrega Expressa</h3>
              <p className="mb-4 text-sm sm:text-lg">Receba em ate 24h na regiao metropolitana</p>
              <Button variant="secondary" className="w-full sm:w-fit">
                Saiba Mais
              </Button>
            </div>
            <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/30" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoBanners;
