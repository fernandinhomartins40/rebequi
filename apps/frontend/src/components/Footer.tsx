import { MapPin, Phone, Mail, Clock, Facebook, Instagram, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { STORE_CONTACT } from "@/lib/store-contact";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const socialLinks = [
    { icon: Facebook, href: "#", label: "Facebook", color: "bg-[#1877F2] hover:bg-[#1877F2]/80" },
    { icon: Instagram, href: "#", label: "Instagram", color: "bg-gradient-to-br from-[#f09433] via-[#dc2743] to-[#bc1888] hover:opacity-80" },
  ];

  const quickLinks = [
    { label: "Sobre nós", href: "/sobre" },
    { label: "Política de Privacidade", href: "/politica-privacidade" },
    { label: "Termos de Uso", href: "/termos-uso" },
    { label: "Dúvidas Frequentes", href: "/faq" },
    { label: "Trocas e Devoluções", href: "/trocas-devolucoes" },
  ];

  return (
    <footer className="bg-foreground text-background">
      {/* Top wave decoration */}
      <div className="h-2 bg-gradient-to-r from-brand-yellow via-brand-red to-brand-blue" />

      <div className="container mx-auto px-4 py-12 sm:px-6 sm:py-16">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 xl:grid-cols-4">
          {/* Brand & Contact */}
          <div className="sm:col-span-2 xl:col-span-1">
            <div className="mb-5">
              <img
                src="/lovable-uploads/73f13341-b66a-4a9f-aa28-4bd40213b85f.png"
                alt="Rebequi Logo"
                className="h-10 w-auto"
              />
            </div>
            <p className="mb-5 text-sm leading-relaxed text-background/70">
              Materiais de construção com qualidade, preço justo e entrega rápida. Há mais de 15 anos construindo sonhos.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-yellow/10">
                  <MapPin className="h-4 w-4 text-brand-yellow" />
                </div>
                <p className="text-sm text-background/80">
                  {STORE_CONTACT.address.join(", ")}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-yellow/10">
                  <Phone className="h-4 w-4 text-brand-yellow" />
                </div>
                <p className="text-sm text-background/80">{STORE_CONTACT.whatsappDisplay}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-yellow/10">
                  <Mail className="h-4 w-4 text-brand-yellow" />
                </div>
                <p className="break-all text-sm text-background/80 sm:break-normal">{STORE_CONTACT.email}</p>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-5 text-sm font-bold uppercase tracking-widest text-brand-yellow">
              Links úteis
            </h4>
            <ul className="space-y-3">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="group inline-flex items-center gap-1 text-sm text-background/70 transition-colors hover:text-brand-yellow"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3 w-3 opacity-0 transition-all group-hover:opacity-100" />
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Hours */}
          <div>
            <h4 className="mb-5 text-sm font-bold uppercase tracking-widest text-brand-yellow">
              Horário de Funcionamento
            </h4>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-brand-yellow/10">
                  <Clock className="h-4 w-4 text-brand-yellow" />
                </div>
                <div className="text-sm text-background/80">
                  {STORE_CONTACT.openingHours.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Social & CTA */}
          <div>
            <h4 className="mb-5 text-sm font-bold uppercase tracking-widest text-brand-yellow">
              Redes Sociais
            </h4>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${social.color} text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5`}
                >
                  <social.icon className="h-5 w-5" />
                </a>
              ))}
            </div>

            <div className="mt-6">
              <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-background/50">
                Área comercial
              </h5>
              <Button
                asChild
                className="w-full rounded-xl bg-brand-red text-white shadow-lg transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-red/90 hover:shadow-xl sm:w-auto"
              >
                <Link to="/painel-lojista">
                  Painel do Lojista
                  <ArrowUpRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-background/10 pt-8 text-center sm:flex-row sm:text-left">
          <p className="text-xs text-background/50">
            © {currentYear} Rebequi. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-background/40">
              Desenvolvido com 💛 para construir melhor
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
