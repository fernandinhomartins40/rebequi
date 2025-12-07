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
  return (
    <section className="py-16 bg-muted/60">
      <div className="container mx-auto px-4 space-y-8">
        <div className="flex flex-col gap-3 text-center">
          <p className="text-sm font-semibold text-primary uppercase">Marcas parceiras</p>
          <h2 className="text-3xl font-bold text-foreground">Quem constrói com a gente</h2>
          <p className="text-muted-foreground">
            Catálogo com fabricantes consolidados para garantir qualidade em cada etapa.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <div className="flex items-center gap-8 overflow-x-auto px-6 py-6 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
            {brands.map((brand) => (
              <div
                key={brand.name}
                className="flex h-16 w-32 flex-shrink-0 items-center justify-center rounded-md border bg-white px-3 py-2 transition hover:shadow-sm"
              >
                <img src={brand.logo} alt={brand.name} className="max-h-12 object-contain" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Brands;
