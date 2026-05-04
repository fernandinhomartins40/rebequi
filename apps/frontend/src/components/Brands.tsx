import { useScrollReveal } from "@/hooks/useScrollReveal";

const brands = [
  { name: "Coral", logo: "https://images.tcdn.com.br/files/1324197/themes/52/img/settings/coral2.png?daed2e0862f003ffc24ef8fbc059a298" },
  { name: "Docol", logo: "https://images.tcdn.com.br/files/1324197/themes/52/img/settings/docol.jpg?daed2e0862f003ffc24ef8fbc059a298" },
  { name: "Elgin", logo: "https://images.tcdn.com.br/files/1324197/themes/52/img/settings/elgin.jpg?daed2e0862f003ffc24ef8fbc059a298" },
  { name: "Fame", logo: "https://images.tcdn.com.br/files/1324197/themes/52/img/settings/fame.jpg?daed2e0862f003ffc24ef8fbc059a298" },
  { name: "Incepa", logo: "https://images.tcdn.com.br/files/1324197/themes/52/img/settings/incepa.jpg?daed2e0862f003ffc24ef8fbc059a298" },
  { name: "Suvinil", logo: "https://images.tcdn.com.br/files/1324197/themes/52/img/settings/suvinil.jpg?daed2e0862f003ffc24ef8fbc059a298" },
  { name: "Tigre", logo: "https://images.tcdn.com.br/files/1324197/themes/52/img/settings/tigre.jpg?daed2e0862f003ffc24ef8fbc059a298" },
  { name: "Votoran", logo: "https://images.tcdn.com.br/files/1324197/themes/52/img/settings/votorantim.jpg?daed2e0862f003ffc24ef8fbc059a298" },
];

const Brands = () => {
  const { ref, isVisible } = useScrollReveal<HTMLElement>();
  const doubledBrands = [...brands, ...brands, ...brands, ...brands];

  return (
    <section ref={ref} className="bg-muted/60 py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6">
        <div className={`mb-8 text-center transition-all duration-700 sm:mb-10 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
          <span className="mb-2 inline-block text-xs font-bold uppercase tracking-widest text-primary">
            Marcas parceiras
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Quem constrói com a gente
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Fabricantes de confiança em cada etapa da obra.
          </p>
        </div>

        <div className={`overflow-hidden rounded-2xl border border-border/40 bg-white shadow-sm transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: "200ms" }}>
          <div className="relative">
            {/* Gradient masks */}
            <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-16 bg-gradient-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-16 bg-gradient-to-l from-white to-transparent" />

            <div className="flex overflow-hidden py-6 sm:py-8">
              <div className="flex animate-marquee-scroll items-center gap-8 sm:gap-12">
                {doubledBrands.map((brand, index) => (
                  <div
                    key={`${brand.name}-${index}`}
                    className="flex h-16 w-28 flex-shrink-0 items-center justify-center rounded-xl border border-border/30 bg-white px-4 py-2 grayscale transition-all duration-300 hover:grayscale-0 hover:shadow-sm sm:w-36"
                  >
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      className="max-h-10 object-contain"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Brands;
