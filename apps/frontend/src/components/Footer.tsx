import { MapPin, Phone, Mail, Clock, Facebook, Instagram, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-foreground text-background">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
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
                <MapPin className="h-5 w-5 mt-0.5 text-brand-yellow" />
                <p className="text-sm">
                  Rua dos Materiais, 123<br />
                  Centro - São Paulo, SP<br />
                  CEP: 01234-567
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="h-5 w-5 text-brand-yellow" />
                <p className="text-sm">(11) 9999-9999</p>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-5 w-5 text-brand-yellow" />
                <p className="text-sm">contato@rebequi.com.br</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Links Úteis</h4>
            <ul className="space-y-2">
              <li><a href="/sobre" className="text-sm hover:text-brand-yellow transition-colors">Sobre Nós</a></li>
              <li><a href="/politica-privacidade" className="text-sm hover:text-brand-yellow transition-colors">Política de Privacidade</a></li>
              <li><a href="/termos-uso" className="text-sm hover:text-brand-yellow transition-colors">Termos de Uso</a></li>
              <li><a href="/faq" className="text-sm hover:text-brand-yellow transition-colors">Dúvidas Frequentes</a></li>
              <li><a href="/trocas-devolucoes" className="text-sm hover:text-brand-yellow transition-colors">Trocas e Devoluções</a></li>
            </ul>
          </div>

          {/* Social Media */}
          <div>
            <h4 className="font-semibold mb-4">Redes Sociais</h4>
            <div className="flex space-x-3">
              <a href="#" className="p-2 bg-brand-blue rounded-full hover:bg-brand-blue/80 transition-colors">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 bg-brand-red rounded-full hover:bg-brand-red/80 transition-colors">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 bg-brand-yellow rounded-full hover:bg-brand-yellow/80 transition-colors">
                <Twitter className="h-5 w-5 text-foreground" />
              </a>
            </div>
          </div>

          {/* Business Hours */}
          <div>
            <h4 className="font-semibold mb-4">Horário de Funcionamento</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-brand-yellow" />
                <div className="text-sm">
                  <p>Seg - Sex: 7h às 18h</p>
                  <p>Sábado: 7h às 16h</p>
                  <p>Domingo: 8h às 12h</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Painel do Lojista Button */}
        <div className="border-t border-background/20 mt-8 pt-8 flex flex-col sm:flex-row items-center justify-between">
          <Button asChild className="bg-brand-red hover:bg-brand-red/80 text-white mb-4 sm:mb-0">
            <Link to="/painel-lojista">Painel do Lojista</Link>
          </Button>
          <p className="text-sm text-background/80">
            © 2024 Rebequi. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
