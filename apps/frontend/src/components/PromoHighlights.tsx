type Highlight = {
  title: string;
  discount: number;
  image: string;
  tag?: string;
};

const highlights: Highlight[] = [
  {
    title: "Kit de ferramentas",
    discount: 30,
    image: "https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=900&q=80",
    tag: "Ferramentas",
  },
  {
    title: "Tintas e acessorios",
    discount: 25,
    image: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    tag: "Pintura",
  },
  {
    title: "Cimento e argamassa",
    discount: 18,
    image: "https://images.unsplash.com/photo-1503389152951-9f343605f61e?auto=format&fit=crop&w=900&q=80",
    tag: "Estrutura",
  },
  {
    title: "Materiais eletricos",
    discount: 22,
    image: "https://images.unsplash.com/photo-1516116216624-53e697fedbea?auto=format&fit=crop&w=900&q=80",
    tag: "Eletricos",
  },
];

const PromoHighlights = () => {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="container mx-auto space-y-6 px-4 sm:px-6 sm:space-y-8">
        <div className="flex flex-col gap-2 text-center">
          <p className="text-sm font-semibold uppercase text-primary">Ofertas em destaque</p>
          <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Selecoes com desconto</h2>
          <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
            Escolhemos categorias e kits para acelerar seu carrinho com precos especiais.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          {highlights.map((item) => (
            <div
              key={item.title}
              className="group overflow-hidden rounded-xl border bg-gradient-to-b from-slate-50 to-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="relative h-44 w-full overflow-hidden sm:h-40">
                <img
                  src={item.image}
                  alt={item.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground shadow-sm">
                  -{item.discount}%
                </div>
              </div>
              <div className="space-y-2 p-4">
                {item.tag ? (
                  <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                    {item.tag}
                  </span>
                ) : null}
                <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground">Estoque limitado enquanto durar a campanha.</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PromoHighlights;
