import { useState, useEffect } from "react";
import { FileScan, LogOut, Menu, Search, ShoppingCart, User, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { PublicProductSearch } from "@/components/PublicProductSearch";
import { Button } from "@/components/ui/button";
import { getDefaultRouteForRole } from "@/lib/auth-routing";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const { totalItems } = useCart();

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Categorias", href: "/categorias" },
    { name: "Promoções", href: "/promocoes" },
    { name: "Novidades", href: "/novidades" },
    { name: "Contato", href: "/contato" },
  ];

  const accountHref = getDefaultRouteForRole(user?.role);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "glass shadow-lg"
          : "shadow-sm"
      }`}
      style={{
        backgroundColor: isScrolled ? "rgba(249, 239, 56, 0.92)" : "#f9ef38",
      }}
    >
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex min-h-[68px] items-center justify-between gap-3 py-2 lg:min-h-[80px] xl:h-[92px] xl:py-0">
          {/* Logo */}
          <div className="flex-shrink-0 transition-transform duration-300 hover:scale-[1.02]">
            <Link to="/">
              <img
                src="/lovable-uploads/73f13341-b66a-4a9f-aa28-4bd40213b85f.png"
                alt="Rebequi Logo"
                className="h-11 w-auto sm:h-12 xl:h-14"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-6 xl:flex 2xl:gap-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="nav-link-modern text-sm font-semibold text-foreground/90 transition-colors duration-200 hover:text-foreground"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Search */}
          <div className="hidden max-w-sm flex-1 items-center lg:flex xl:max-w-md">
            <div className="search-pill w-full">
              <PublicProductSearch />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            <Button
              asChild
              className="hidden gap-2 rounded-xl bg-brand-red text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-red/90 hover:shadow-md lg:inline-flex"
            >
              <Link to="/solicitar-orcamento">
                <FileScan className="h-4 w-4" />
                <span className="hidden xl:inline">Solicitar orçamento</span>
                <span className="xl:hidden">Orçamento</span>
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full transition-colors hover:bg-black/5 lg:hidden"
              onClick={() => {
                const input = document.getElementById("public-product-search-mobile") as HTMLInputElement | null;
                input?.focus();
                input?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            >
              <Search className="h-5 w-5" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="relative rounded-full transition-colors hover:bg-black/5"
              asChild
            >
              <Link to="/carrinho" aria-label="Abrir carrinho">
                <ShoppingCart className="h-5 w-5" />
                {totalItems > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-red px-1 text-[11px] font-bold text-white shadow-sm ring-2 ring-[#f9ef38]">
                    {totalItems}
                  </span>
                )}
              </Link>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full transition-colors hover:bg-black/5"
              asChild
            >
              <Link to={isAuthenticated ? accountHref : "/login"} aria-label="Ir para a área da conta">
                <User className="h-5 w-5" />
              </Link>
            </Button>

            {isAuthenticated && (
              <Button
                variant="ghost"
                size="icon"
                className="hidden rounded-full transition-colors hover:bg-black/5 sm:inline-flex"
                onClick={() => void handleLogout()}
                aria-label="Sair"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="rounded-full transition-colors hover:bg-black/5 xl:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Search */}
        <div className="pb-3 md:hidden">
          <PublicProductSearch
            inputId="public-product-search-mobile"
            onNavigate={() => setIsMobileMenuOpen(false)}
          />
        </div>

        {/* Mobile Menu */}
        <div
          className={`overflow-hidden transition-all duration-300 ease-in-out xl:hidden ${
            isMobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="border-t border-black/10">
            <nav className="flex flex-col space-y-1 py-3">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-black/5 hover:text-primary"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <Link
                to="/solicitar-orcamento"
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-black/5 hover:text-primary"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Solicitar orçamento
              </Link>
              <Link
                to="/carrinho"
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-black/5 hover:text-primary"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Carrinho ({totalItems})
              </Link>
              <Link
                to={isAuthenticated ? accountHref : "/login"}
                className="rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors duration-200 hover:bg-black/5 hover:text-primary"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {isAuthenticated ? `Conta: ${user?.name}` : 'Entrar'}
              </Link>
              {isAuthenticated && (
                <button
                  className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-foreground transition-colors duration-200 hover:bg-black/5 hover:text-primary"
                  onClick={() => {
                    void handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Sair
                </button>
              )}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
