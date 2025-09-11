import { Button } from "@/components/ui/button";

const PromoBanners = () => {
  return (
    <section className="py-16 bg-muted">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Banner 1 */}
          <div className="relative bg-gradient-to-r from-brand-blue to-brand-blue/80 rounded-lg overflow-hidden h-64 group cursor-pointer">
            <div className="absolute inset-0 p-8 flex flex-col justify-center text-white">
              <h3 className="text-2xl font-bold mb-2">Ferramentas Profissionais</h3>
              <p className="text-lg mb-4">Até 30% OFF em ferramentas selecionadas</p>
              <Button variant="secondary" className="w-fit">
                Ver Ofertas
              </Button>
            </div>
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
          </div>

          {/* Banner 2 */}
          <div className="relative bg-gradient-to-r from-brand-red to-brand-red/80 rounded-lg overflow-hidden h-64 group cursor-pointer">
            <div className="absolute inset-0 p-8 flex flex-col justify-center text-white">
              <h3 className="text-2xl font-bold mb-2">Entrega Expressa</h3>
              <p className="text-lg mb-4">Receba em até 24h na região metropolitana</p>
              <Button variant="secondary" className="w-fit">
                Saiba Mais
              </Button>
            </div>
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default PromoBanners;