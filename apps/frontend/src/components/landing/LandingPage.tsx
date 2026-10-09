import { useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Headphones,
  Menu,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  Store,
  Truck,
  User,
  Wrench,
  Paintbrush,
  HardHat,
  Plug,
  Droplets,
  Layers,
  Lamp,
  Settings,
  X,
  Mail,
  Phone,
} from "lucide-react";
import type { Category, Product, Promotion } from "@rebequi/shared/types";
import { PublicProductSearch } from "@/components/PublicProductSearch";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/components/ui/use-toast";
import { getDefaultRouteForRole } from "@/lib/auth-routing";
import { STORE_CONTACT } from "@/lib/store-contact";
import { getPromotionProductPricingData } from "@/lib/promotion-ui";
import { fetchCategories } from "@/services/api/categories";
import {
  fetchProducts,
  fetchProductsByCategory,
} from "@/services/api/products";
import { fetchPromotions } from "@/services/api/promotions";
import { brands } from "@/lib/store-brands";
import "./landing.css";

const logo = "/lovable-uploads/73f13341-b66a-4a9f-aa28-4bd40213b85f.png";
// SVG viewports reuse the photographic regions of the supplied artwork.
// All copy, links, controls and catalog information are live HTML.
function Artwork({
  box,
  className = "",
}: {
  box: [number, number, number, number];
  className?: string;
}) {
  const [x, y, width, height] = box;
  const style: CSSProperties = { aspectRatio: `${width}/${height}` };
  return (
    <div
      aria-hidden="true"
      className={`landing-art ${className}`}
      style={style}
    >
      <svg
        viewBox={`${x} ${y} ${width} ${height}`}
        preserveAspectRatio="xMidYMid slice"
        width="100%"
        height="100%"
      >
        <image
          href="/landing/reference-artwork.png"
          width="1024"
          height="1536"
        />
        {className === "landing-worker-photo" ? (
          <rect x="813" y="535" width="62" height="100" fill="#075eef" />
        ) : null}
      </svg>
    </div>
  );
}
function SectionHeading({
  title,
  description,
  href,
  label = "Ver todos",
}: {
  title: string;
  description?: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="landing-section-heading">
      <div>
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
      </div>
      {href ? (
        <Link to={href}>
          {label}
          <ArrowRight size={13} />
        </Link>
      ) : null}
    </div>
  );
}
function LandingHeader() {
  const { user, isAuthenticated } = useAuth();
  const { totalItems } = useCart();
  const [open, setOpen] = useState(false);
  const categories = useQuery({
    queryKey: ["categories", "landing"],
    queryFn: () => fetchCategories(),
    staleTime: 60000,
  });
  return (
    <header className="landing-header">
      <div className="landing-width landing-header-row">
        <button
          className="landing-mobile-menu"
          aria-label="Abrir categorias"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <Menu />
        </button>
        <Link to="/" className="landing-logo">
          <img src={logo} alt="Rebequi" />
        </Link>
        <button
          className="landing-category-menu"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          <Menu size={19} />
          Todas as categorias
          <ChevronDown size={14} />
        </button>
        <nav className="landing-wide-nav">
          <Link to="/promoções">Promoções</Link>
          <Link to="/novidades">Novidades</Link>
          <a href="#marcas">Marcas</a>
          <a href="#servicos">Serviços</a>
          <Link to="/pedido">Orçamento</Link>
        </nav>
        <div className="landing-search">
          <PublicProductSearch
            inputId="landing-search"
            placeholder="O que você precisa para sua obra?"
            inputClassName="pr-12"
            showSubmitButton
          />
        </div>
        <Link
          className="landing-account"
          to={isAuthenticated ? getDefaultRouteForRole(user?.role) : "/login"}
        >
          <User size={23} />
          <span>Minha conta</span>
        </Link>
        <Link
          className="landing-cart"
          to="/carrinho"
          aria-label={`Ver carrinho, ${totalItems} itens`}
        >
          <ShoppingCart size={25} />
          <b>{totalItems}</b>
        </Link>
        {open ? (
          <nav
            className="landing-menu-panel"
            aria-label="Categorias e navegação"
          >
            <button onClick={() => setOpen(false)} aria-label="Fechar menu">
              <X size={19} />
            </button>
            <Link to="/categorias">Todas as categorias</Link>
            {categories.data?.categories.map((category) => (
              <Link key={category.id} to={`/categorias/${category.slug}`}>
                {category.name}
              </Link>
            ))}
            <Link to="/promoções">Promoções</Link>
            <Link to="/novidades">Novidades</Link>
            <Link to="/pedido">Solicitar orçamento por foto ou lista</Link>
            <Link to="/contato">Falar com a loja</Link>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
function PurchaseSteps({ className = "" }: { className?: string }) {
  const steps = [
    {
      icon: Search,
      title: "Encontre o material",
      note: "Use a busca ou navegue nas categorias.",
    },
    {
      icon: ShoppingCart,
      title: "Escolha a quantidade",
      note: "Defina a quantidade ideal para sua obra.",
    },
    {
      icon: CreditCard,
      title: "Confira e finalize",
      note: "Revise seu pedido e fale com a loja.",
    },
  ];
  return (
    <section className={`landing-steps ${className}`} aria-label="Como comprar">
      <h2>Sua compra em 3 passos</h2>
      <div className="landing-step-list">
        {steps.map((step, index) => (
          <div className="landing-step" key={step.title}>
            <span className={`landing-step-number step-${index}`}>
              {index + 1}
            </span>
            <step.icon />
            <div>
              <strong>{step.title}</strong>
              <p>{step.note}</p>
            </div>
            {index < 2 ? <ChevronRight className="landing-step-arrow" /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
const categoryIcons = [
  Wrench,
  Paintbrush,
  HardHat,
  Plug,
  Droplets,
  Layers,
  Lamp,
  Settings,
  HardHat,
  Store,
];
function categoryIndex(category: Category) {
  const key = category.slug;
  if (key.includes("ferrament")) return 0;
  if (key.includes("tinta")) return 1;
  if (key.includes("cimento") || key.includes("argamassa")) return 2;
  if (key.includes("eletric")) return 3;
  if (key.includes("hidraul")) return 4;
  if (key.includes("piso")) return 5;
  if (key.includes("metal") || key.includes("louça")) return 6;
  if (key.includes("constr")) return 7;
  if (key.includes("seguran") || key.includes("epi")) return 8;
  if (key.includes("jardim") || key.includes("lazer")) return 9;
  return 10;
}
function LandingCategories() {
  const query = useQuery({
    queryKey: ["categories", "landing"],
    queryFn: () => fetchCategories(),
    staleTime: 60000,
  });
  const categories = [...(query.data?.categories ?? [])]
    .sort((a, b) => categoryIndex(a) - categoryIndex(b))
    .slice(0, 10);
  return (
    <section className="landing-categories">
      <SectionHeading
        title="Nossas Categorias"
        description="Tudo o que você precisa para sua obra, em um só lugar."
        href="/categorias"
        label="Ver todas as categorias"
      />
      <div className="landing-category-grid">
        {categories.map((category) => {
          const index = categoryIndex(category);
          const Icon = categoryIcons[index] ?? Settings;
          return (
            <Link
              to={`/categorias/${category.slug}`}
              key={category.id}
              className={`landing-category category-${index}`}
            >
              {index < 10 ? (
                <Artwork
                  box={[52 + index * 94, 355, 73, 65]}
                  className="landing-category-photo"
                />
              ) : (
                <Icon className="landing-category-fallback" />
              )}
              <Icon className="landing-category-icon" />
              <strong>{category.name}</strong>
            </Link>
          );
        })}
      </div>
      {query.isError ? (
        <p role="alert">
          Não foi possível carregar as categorias.{" "}
          <Link to="/categorias">Tentar novamente</Link>
        </p>
      ) : null}
    </section>
  );
}
function CompactProduct({
  product,
  promotion,
  featured = false,
}: {
  product: Product;
  promotion?: Promotion;
  featured?: boolean;
}) {
  const [quantity, setQuantity] = useState(1);
  const { addItem } = useCart();
  const { toast } = useToast();
  const image =
    product.images?.find((entry) => entry.isPrimary)?.url ||
    product.images?.[0]?.url ||
    "/placeholder.svg";
  const pricing = getPromotionProductPricingData(promotion, product);
  const href = promotion
    ? `/ofertas/${promotion.slug}`
    : `/produto/${product.slug}`;
  return (
    <article
      className={`landing-product ${featured ? "landing-product-featured" : ""}`}
      data-product-id={product.id}
    >
      <Link className="landing-product-image" to={href}>
        <img
          src={image}
          alt={product.name}
          loading="lazy"
          onError={(event) => {
            if (!event.currentTarget.src.endsWith("/placeholder.svg"))
              event.currentTarget.src = "/placeholder.svg";
          }}
        />
        {promotion ? <span className="landing-offer-tag">PROMOÇÃO</span> : null}
      </Link>
      <div className="landing-product-info">
        <Link to={href} className="landing-product-name">
          {product.name}
        </Link>
        <div className="landing-product-actions">
          <div className="landing-quantity">
            <button
              aria-label={`Diminuir quantidade de ${product.name}`}
              disabled={quantity <= 1}
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <Minus size={12} />
            </button>
            <span aria-live="polite">{quantity}</span>
            <button
              aria-label={`Aumentar quantidade de ${product.name}`}
              disabled={quantity >= Math.min(99, product.stock)}
              onClick={() =>
                setQuantity(Math.min(99, product.stock, quantity + 1))
              }
            >
              <Plus size={12} />
            </button>
          </div>
          <button
            className="landing-add"
            disabled={product.stock <= 0}
            onClick={() => {
              addItem(
                {
                  ...product,
                  price: pricing.price,
                  originalPrice: pricing.originalPrice,
                },
                quantity,
                promotion?.id,
              );
              toast({
                title: "Produto adicionado",
                description: `${quantity} × ${product.name} no carrinho.`,
              });
            }}
          >
            <ShoppingCart size={14} />
            {product.stock > 0 ? "Adicionar" : "Indisponível"}
          </button>
        </div>
        <a
          className="landing-price"
          href={`${STORE_CONTACT.whatsappHref}?text=${encodeURIComponent(`Olá! Gostaria de consultar o preço e a disponibilidade de ${product.name}.`)}`}
          target="_blank"
          rel="noreferrer"
        >
          Consultar preço
        </a>
      </div>
    </article>
  );
}
function ProductShelf({
  title,
  products,
  href,
  loading,
  error,
}: {
  title: string;
  products: Product[];
  href: string;
  loading?: boolean;
  error?: boolean;
}) {
  return (
    <section className="landing-shelf">
      <SectionHeading title={title} href={href} />
      <div className="landing-shelf-grid">
        {products.slice(0, 4).map((product) => (
          <CompactProduct key={product.id} product={product} />
        ))}
        {loading
          ? Array.from({ length: 4 }, (_, index) => (
              <div className="landing-card-skeleton" key={index} />
            ))
          : null}
      </div>
      {error ? (
        <p role="alert">
          Não foi possível carregar os produtos.{" "}
          <Link to={href}>Ver catálogo</Link>
        </p>
      ) : !loading && !products.length ? (
        <p className="landing-empty">
          Novos produtos em breve. <Link to={href}>Consultar catálogo</Link>
        </p>
      ) : null}
    </section>
  );
}
function PromoPanel({ delivery = false }: { delivery?: boolean }) {
  return (
    <section
      className={`landing-promo-panel ${delivery ? "landing-delivery" : "landing-professional"}`}
    >
      <Artwork
        box={delivery ? [227, 750, 215, 128] : [813, 490, 166, 242]}
        className={delivery ? "" : "landing-worker-photo"}
      />
      <div>
        {delivery ? <Truck /> : <Wrench />}
        <h2>{delivery ? "Entrega Expressa" : "Ferramentas Profissionais"}</h2>
        <p>
          {delivery
            ? "Consulte entrega e retirada com a nossa equipe."
            : "Qualidade e desempenho para o seu projeto."}
        </p>
        <Link to={delivery ? "/contato" : "/categorias/ferramentas"}>
          {delivery ? "Saiba mais" : "Ver produtos"}
          <ArrowRight size={15} />
        </Link>
      </div>
    </section>
  );
}
function Campaigns({ promotions }: { promotions: Promotion[] }) {
  const themes = [
    {
      title: "Reforma da Casa",
      note: "Tudo para renovar seu ambiente.",
      href: "/categorias",
      box: [46, 933, 225, 84],
    },
    {
      title: "Construção do Zero",
      note: "Materiais para todas as etapas.",
      href: "/categorias/cimento-argamassa",
      box: [285, 933, 223, 84],
    },
    {
      title: "Pintura e Acabamento",
      note: "As melhores opções em tintas.",
      href: "/categorias/tintas-acessorios",
      box: [520, 933, 221, 84],
    },
    {
      title: "Área Externa",
      note: "Soluções para jardim e lazer.",
      href: "/categorias",
      box: [755, 933, 224, 84],
    },
  ];
  return (
    <section className="landing-campaigns">
      <SectionHeading
        title="Campanhas promocionais"
        description="Seleções especiais para cada etapa da sua obra."
        href="/promoções"
        label="Ver todas as campanhas"
      />
      <div className="landing-campaign-grid">
        {promotions.length
          ? promotions.slice(0, 4).map((promotion) => (
              <Link
                className="landing-campaign"
                key={promotion.id}
                to={`/ofertas/${promotion.slug}`}
              >
                <img
                  src={promotion.image?.url || "/placeholder.svg"}
                  alt={promotion.image?.alt || promotion.title}
                  loading="lazy"
                />
                <div>
                  <h3>{promotion.title}</h3>
                  <p>{promotion.subtitle || promotion.description}</p>
                  <span>
                    Ver produtos
                    <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))
          : themes.map((theme) => (
              <Link
                className="landing-campaign"
                key={theme.title}
                to={theme.href}
              >
                <Artwork box={theme.box as [number, number, number, number]} />
                <div>
                  <h3>{theme.title}</h3>
                  <p>{theme.note}</p>
                  <span>
                    Ver produtos
                    <ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
      </div>
    </section>
  );
}
function LandingServices() {
  const services = [
    {
      icon: Truck,
      title: "Entrega rápida",
      text: "Consulte entrega e retirada.",
    },
    {
      icon: CreditCard,
      title: "Pagamento facilitado",
      text: "Consulte as formas de pagamento.",
    },
    {
      icon: Headphones,
      title: "Atendimento especializado",
      text: "Nossa equipe está pronta para ajudar.",
    },
    {
      icon: Store,
      title: "Retira na loja",
      text: "Compre online e retire na loja.",
    },
  ];
  return (
    <section className="landing-services" id="servicos">
      <h2>Serviços que aceleram seu projeto</h2>
      <p>Mais praticidade e suporte para a sua obra.</p>
      <div className="landing-service-grid">
        {services.map((service, index) => (
          <Link
            key={service.title}
            to="/contato"
            className={`landing-service service-${index}`}
          >
            <span>
              <service.icon />
            </span>
            <div>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
function LandingBrands() {
  return (
    <section className="landing-brands" id="marcas">
      <h2>Quem constrói com a gente</h2>
      <p>As melhores marcas para o seu projeto.</p>
      <div>
        {brands.map((brand, index) => (
          <span key={brand.name} className={`landing-brand brand-${index}`}>
            <img src={brand.logo} alt={brand.name} loading="lazy" />
          </span>
        ))}
      </div>
    </section>
  );
}
function LandingFooter() {
  const { totalItems } = useCart();
  const columns = [
    {
      title: "Institucional",
      links: [
        { text: "Sobre a loja", href: "/sobre" },
        { text: "Fale conosco", href: "/contato" },
        { text: "Solicitar orçamento", href: "/pedido" },
      ],
    },
    {
      title: "Ajuda",
      links: [
        { text: "Como comprar", href: "/faq" },
        { text: "Entrega e prazo", href: "/contato" },
        { text: "Trocas e devoluções", href: "/trocas-devolucoes" },
        { text: "Dúvidas frequentes", href: "/faq" },
      ],
    },
  ];
  return (
    <>
      <footer className="landing-footer">
        <div className="landing-width landing-footer-grid">
          <div>
            <img src={logo} alt="Rebequi" />
            <p>
              Tudo para sua obra, do início ao acabamento.
              <br />
              Materiais e soluções com qualidade e confiança.
            </p>
          </div>
          {columns.map((column) => (
            <div key={column.title}>
              <h3>{column.title}</h3>
              {column.links.map((link) => (
                <Link key={link.text} to={link.href}>
                  {link.text}
                </Link>
              ))}
            </div>
          ))}
          <div>
            <h3>Atendimento</h3>
            <a
              href={STORE_CONTACT.whatsappHref}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={14} />
              Fale pelo WhatsApp
            </a>
            <a href={`tel:+55${STORE_CONTACT.whatsappDigits}`}>
              <Phone size={14} />
              {STORE_CONTACT.whatsappDisplay}
            </a>
            <a href={`mailto:${STORE_CONTACT.email}`}>
              <Mail size={14} />
              {STORE_CONTACT.email}
            </a>
            <p>{STORE_CONTACT.openingHours.join(" · ")}</p>
          </div>
          <div className="landing-payment">
            <h3>Formas de pagamento</h3>
            <p>Consulte as opções com a loja.</p>
            <Link to="/carrinho">
              <ShieldCheck size={17} />
              Confira seu pedido
            </Link>
          </div>
        </div>
        <div className="landing-width landing-footer-bottom">
          <p>
            © {new Date().getFullYear()} Rebequi. Todos os direitos reservados.
          </p>
          <nav>
            <Link to="/politica-privacidade">Política de Privacidade</Link>
            <Link to="/termos-uso">Termos de Uso</Link>
          </nav>
        </div>
      </footer>
      <Link to="/carrinho" className="landing-mobile-cart">
        <ShoppingCart size={21} />
        Ver carrinho{totalItems ? <b>{totalItems}</b> : null}
        <ArrowRight size={19} />
      </Link>
    </>
  );
}
export function LandingPage() {
  const offers = useQuery({
    queryKey: ["promotions", "single-product-home"],
    queryFn: () =>
      fetchPromotions({ kind: "single_product", page: 1, limit: 4 }),
  });
  const campaigns = useQuery({
    queryKey: ["promotions", "highlights"],
    queryFn: () => fetchPromotions({ kind: "collection", page: 1, limit: 4 }),
  });
  const featured = useQuery({
    queryKey: ["products", "landing-featured"],
    queryFn: () => fetchProducts({ isFeatured: true, limit: 4 }),
  });
  const news = useQuery({
    queryKey: ["products", "landing-new"],
    queryFn: () => fetchProducts({ isNew: true, limit: 4 }),
  });
  const tools = useQuery({
    queryKey: ["products", "landing-tools"],
    queryFn: () => fetchProductsByCategory("ferramentas", 1, 4),
  });
  const paints = useQuery({
    queryKey: ["products", "landing-paints"],
    queryFn: () => fetchProductsByCategory("tintas-acessorios", 1, 4),
  });
  const cement = useQuery({
    queryKey: ["products", "landing-cement"],
    queryFn: () => fetchProductsByCategory("cimento-argamassa", 1, 4),
  });
  const electric = useQuery({
    queryKey: ["products", "landing-electric"],
    queryFn: () => fetchProductsByCategory("materiais-eletricos", 1, 4),
  });
  const offerItems =
    offers.data?.promotions.flatMap((promotion) => {
      const product = promotion.primaryProduct || promotion.products?.[0];
      return product ? [{ product, promotion }] : [];
    }) ?? [];
  const displayOffers: { product: Product; promotion?: Promotion }[] = [
    ...offerItems,
    ...(featured.data?.products ?? [])
      .filter(
        (product) => !offerItems.some((item) => item.product.id === product.id),
      )
      .map((product) => ({ product })),
  ].slice(0, 4);
  const shelf = (title: string, query: typeof tools, href: string) => (
    <ProductShelf
      title={title}
      products={query.data?.products ?? []}
      href={href}
      loading={query.isLoading}
      error={query.isError}
    />
  );
  return (
    <div className="rebequi-landing">
      <LandingHeader />
      <main>
        <section className="landing-hero">
          <Artwork box={[502, 44, 522, 210]} className="landing-hero-photo" />
          <div className="landing-width landing-hero-content">
            <h1>
              Tudo para sua obra,
              <br />
              <span>do início ao acabamento.</span>
            </h1>
            <p>Encontre ferramentas e materiais com facilidade.</p>
            <div>
              <Link className="landing-primary-button" to="/categorias">
                <Search size={20} />
                Explorar produtos
                <ArrowRight size={17} />
              </Link>
              <a
                className="landing-outline-button"
                href={STORE_CONTACT.whatsappHref}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={20} />
                Falar com a loja
              </a>
            </div>
          </div>
        </section>
        <div className="landing-benefits">
          <div className="landing-width">
            {[
              { icon: Truck, text: "Consulte entrega e retirada" },
              { icon: Plus, text: "Promoções imperdíveis" },
              { icon: ShieldCheck, text: "Compra segura" },
              { icon: CreditCard, text: "Diversas formas de pagamento" },
              { icon: Headphones, text: "Atendimento especializado" },
            ].map((benefit) => (
              <span key={benefit.text}>
                <benefit.icon size={22} />
                {benefit.text}
              </span>
            ))}
          </div>
        </div>
        <div className="landing-width landing-content">
          <PurchaseSteps className="landing-mobile-steps" />
          <LandingCategories />
          <div className="landing-offers-row">
            <section className="landing-offers">
              <SectionHeading
                title="Promoções imperdíveis"
                description="Aproveite ofertas selecionadas em ferramentas e materiais."
                href="/promoções"
                label="Ver todas as promoções"
              />
              <div className="landing-offer-grid">
                {displayOffers.map((item) => (
                  <CompactProduct featured key={item.product.id} {...item} />
                ))}
                {offers.isLoading || featured.isLoading ? (
                  <div className="landing-card-skeleton" />
                ) : null}
              </div>
              {offers.isError ? (
                <p role="alert">
                  Não foi possível consultar as promoções.{" "}
                  <Link to="/promoções">Tentar novamente</Link>
                </p>
              ) : !offerItems.length ? (
                <p className="landing-empty">
                  Produtos em destaque. Consulte as condições com a loja.
                </p>
              ) : null}
            </section>
            <PromoPanel />
          </div>
          <div className="landing-middle">
            <PromoPanel delivery />
            <PurchaseSteps className="landing-desktop-steps" />
          </div>
          <Campaigns promotions={campaigns.data?.promotions ?? []} />
          <LandingServices />
          <div className="landing-shelves">
            <ProductShelf
              title="Novidades"
              products={news.data?.products ?? []}
              href="/novidades"
              loading={news.isLoading}
              error={news.isError}
            />
            {shelf("Ferramentas", tools, "/categorias/ferramentas")}
            {shelf(
              "Tintas e acessórios",
              paints,
              "/categorias/tintas-acessorios",
            )}
            {shelf(
              "Cimento e argamassa",
              cement,
              "/categorias/cimento-argamassa",
            )}
            {shelf(
              "Materiais elétricos",
              electric,
              "/categorias/materiais-eletricos",
            )}
          </div>
          <LandingBrands />
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
