import { MapPin, Phone, Mail, Clock, Facebook, Instagram, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <div className="mb-4">
              <img
                src="/lovable-uploads/73f13341-b66a-4a9f-aa28-4bd40213b85f.png"
                alt="Rebequi Logo"
                className="h-10 w-auto"
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-start space-x-2">
                <MapPin className="mt-0.5 h-5 w-5 text-brand-yellow" />
                <p className="text-sm">
                  Rua dos Materiais, 123
                  <br />
                  Centro - Sao Paulo, SP
                  <br />
                  CEP: 01234-567
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-brand-yellow" />
                <p className="text-sm">(11) 9999-9999</p>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-brand-yellow" />
                <p className="break-all text-sm sm:break-normal">contato@rebequi.com.br</p>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Links uteis</h4>
            <ul className="space-y-2">
              <li><a href="/sobre" className="text-sm transition-colors hover:text-brand-yellow">Sobre nos</a></li>
              <li><a href="/politica-privacidade" className="text-sm transition-colors hover:text-brand-yellow">Politica de Privacidade</a></li>
              <li><a href="/termos-uso" className="text-sm transition-colors hover:text-brand-yellow">Termos de Uso</a></li>
              <li><a href="/faq" className="text-sm transition-colors hover:text-brand-yellow">Duvidas Frequentes</a></li>
              <li><a href="/trocas-devolucoes" className="text-sm transition-colors hover:text-brand-yellow">Trocas e Devolucoes</a></li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Redes Sociais</h4>
            <div className="flex flex-wrap gap-3">
              <a href="#" className="rounded-full bg-brand-blue p-2 transition-colors hover:bg-brand-blue/80">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="rounded-full bg-brand-red p-2 transition-colors hover:bg-brand-red/80">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="rounded-full bg-brand-yellow p-2 transition-colors hover:bg-brand-yellow/80">
                <Twitter className="h-5 w-5 text-foreground" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Horario de Funcionamento</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-brand-yellow" />
                <div className="text-sm">
                  <p>Seg - Sex: 7h as 18h</p>
                  <p>Sabado: 7h as 16h</p>
                  <p>Domingo: 8h as 12h</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-4 border-t border-background/20 pt-8 text-center sm:flex-row sm:text-left">
          <Button asChild className="w-full bg-brand-red text-white hover:bg-brand-red/80 sm:w-auto">
            <Link to="/painel-lojista">Painel do Lojista</Link>
          </Button>
          <p className="text-sm text-background/80">© 2024 Rebequi. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
