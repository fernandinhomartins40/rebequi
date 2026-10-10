import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import "@/styles/application-design.css";

export function DesignFrame({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const auth = ["/login", "/registrar", "/painel-lojista"].includes(pathname);
  const workspace =
    pathname.startsWith("/painel-lojista/painel") ||
    pathname === "/painel-cliente";
  const surface =
    pathname === "/"
      ? "landing"
      : auth
        ? "auth"
        : workspace
          ? "workspace"
          : pathname === "/pedido"
            ? "quote"
            : "store";
  return (
    <div className={`rebequi-app design-${surface}`}>
      {auth ? (
        <header className="design-auth-header">
          <Link to="/" aria-label="Rebequi, página inicial">
            <img
              src="/lovable-uploads/73f13341-b66a-4a9f-aa28-4bd40213b85f.png"
              alt="Rebequi"
            />
          </Link>
          <Link to="/">
            <ArrowLeft size={16} />
            Voltar à loja
          </Link>
        </header>
      ) : null}
      {children}
    </div>
  );
}
