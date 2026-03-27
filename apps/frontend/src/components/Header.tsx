import { useState } from "react";
import { FileScan, LogOut, Menu, Search, ShoppingCart, User, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const navigation = [
    { name: "Home", href: "/" },
    { name: "Categorias", href: "/categorias" },
    { name: "Promoções", href: "/promocoes" },
    { name: "Novidades", href: "/novidades" },
    { name: "Contato", href: "/contato" },
  ];

  const accountHref = user?.role === 'ADMIN' ? '/painel-lojista/painel/visao-geral' : '/painel-cliente';

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 shadow-md" style={{ backgroundColor: '#f9ef38' }}>
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex min-h-[88px] items-center justify-between gap-3 py-3 lg:min-h-[104px] xl:h-[115px] xl:py-0">
          <div className="flex-shrink-0">
            <img
              src="/lovable-uploads/73f13341-b66a-4a9f-aa28-4bd40213b85f.png"
              alt="Rebequi Logo"
              className="h-12 w-auto sm:h-14 xl:h-16"
            />
          </div>

          <nav className="hidden items-center gap-5 xl:flex 2xl:gap-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="font-medium text-foreground transition-colors duration-200 hover:text-primary"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          <div className="hidden max-w-md flex-1 items-center lg:flex xl:max-w-lg">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
              <Input type="search" placeholder="Buscar produtos..." className="pl-10 pr-4" />
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button asChild className="hidden gap-2 lg:inline-flex">
              <Link to="/solicitar-orcamento">
                <FileScan className="h-4 w-4" />
                Solicitar orçamento
              </Link>
            </Button>

            <Button variant="ghost" size="icon" className="lg:hidden">
              <Search className="h-5 w-5" />
            </Button>

            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-red text-xs text-white">
                0
              </span>
            </Button>

            <Button variant="ghost" size="icon" asChild>
              <Link to={isAuthenticated ? accountHref : "/login"} aria-label="Ir para a área da conta">
                <User className="h-5 w-5" />
              </Link>
            </Button>

            {isAuthenticated && (
              <Button variant="ghost" size="icon" onClick={() => void handleLogout()} aria-label="Sair">
                <LogOut className="h-5 w-5" />
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="xl:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <div className="py-3 lg:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
            <Input type="search" placeholder="Buscar produtos..." className="pl-10 pr-4" />
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="border-t xl:hidden">
            <nav className="flex flex-col space-y-1 py-3">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="rounded-md px-3 py-2 text-foreground transition-colors duration-200 hover:bg-muted hover:text-primary"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <Link
                to="/solicitar-orcamento"
                className="rounded-md px-3 py-2 text-foreground transition-colors duration-200 hover:bg-muted hover:text-primary"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Solicitar orçamento
              </Link>
              <Link
                to={isAuthenticated ? accountHref : "/login"}
                className="rounded-md px-3 py-2 text-foreground transition-colors duration-200 hover:bg-muted hover:text-primary"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {isAuthenticated ? `Conta: ${user?.name}` : 'Entrar'}
              </Link>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
