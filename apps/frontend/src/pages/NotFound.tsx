import { Link } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
export default function NotFound() {
  return (
    <main className="min-h-screen">
      <Header />
      <section className="container mx-auto px-4 py-16 text-center">
        <p className="mb-3 text-5xl font-extrabold text-primary">404</p>
        <h1 className="mb-4 text-3xl">Página não encontrada</h1>
        <p className="mb-6 text-muted-foreground">
          Vamos ajudar você a encontrar os materiais para sua obra.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link to="/categorias">Explorar produtos</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/">Voltar à página inicial</Link>
          </Button>
        </div>
      </section>
      <Footer />
    </main>
  );
}
