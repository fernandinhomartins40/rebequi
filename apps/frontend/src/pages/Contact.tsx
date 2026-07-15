import { ArrowRight, Clock3, FileScan, Mail, MapPin, Phone, Store } from "lucide-react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { STORE_CONTACT } from "@/lib/store-contact";

const CONTACT_CHANNELS: Array<{
  title: string;
  description: string;
  detail: string;
  cta: string;
  href: string;
  icon: LucideIcon;
  kind: "external" | "internal";
}> = [
  {
    title: "Telefone",
    description: "Para dúvidas rápidas sobre disponibilidade, atendimento e operação da loja.",
    detail: STORE_CONTACT.whatsappDisplay,
    cta: "Ligar agora",
    href: `tel:+55${STORE_CONTACT.whatsappDigits}`,
    icon: Phone,
    kind: "external",
  },
  {
    title: "E-mail",
    description: "Ideal para pedidos de retorno, documentos, parcerias e contatos comerciais.",
    detail: STORE_CONTACT.email,
    cta: "Enviar e-mail",
    href: `mailto:${STORE_CONTACT.email}`,
    icon: Mail,
    kind: "external",
  },
  {
    title: "Orçamento",
    description: "Envie a lista da obra e receba retorno do time com mais contexto do pedido.",
    detail: "Fluxo publico com envio de itens e acompanhamento da solicitacao.",
    cta: "Abrir solicitacao",
    href: "/solicitar-orçamento",
    icon: FileScan,
    kind: "internal",
  },
];

const SUPPORT_TOPICS: Array<{
  title: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    title: "Atendimento comercial",
    description: "Compra de materiais, validacao de estoque e orientacao para fechar o pedido.",
    icon: Store,
  },
  {
    title: "Acompanhamento de orçamentos",
    description: "Retorno sobre solicitações enviadas, ajustes de itens e atualizacao do status.",
    icon: FileScan,
  },
  {
    title: "Contato institucional",
    description: "Parcerias, dúvidas gerais, suporte de conta e assuntos administrativos.",
    icon: Mail,
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_28%,#f8f6ef_100%)]">
      <Header />

      <main className="pb-16 pt-10">
        <div className="container mx-auto space-y-8 px-4 sm:px-6">
          <section className="overflow-hidden rounded-[2rem] border border-[#eadfba] bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(255,255,255,0.98))] p-6 shadow-[0_28px_72px_-48px_rgba(217,119,6,0.22)] sm:p-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] xl:items-end">
              <div className="space-y-4">
                <Badge className="border-none bg-secondary text-secondary-foreground">Contato</Badge>
                <h1 className="max-w-3xl text-3xl font-bold leading-tight text-foreground sm:text-4xl">
                  Fale com a equipe da Rebequi pelo canal mais direto
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  Esta página concentra os caminhos publicos para atendimento comercial, envio de orçamento e contato
                  institucional, sem empurrar o cliente para uma página vazia ou um formulario sem resposta.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-black/5 bg-white/90 px-4 py-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    Telefone
                  </div>
                  <p className="mt-3 text-lg font-bold text-foreground">{STORE_CONTACT.whatsappDisplay}</p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/90 px-4 py-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    E-mail
                  </div>
                  <p className="mt-3 break-all text-lg font-bold text-foreground sm:break-normal">{STORE_CONTACT.email}</p>
                </div>
                <div className="rounded-2xl border border-black/5 bg-white/90 px-4 py-4">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    <Clock3 className="h-4 w-4" />
                    Horario
                  </div>
                  <p className="mt-3 text-lg font-bold text-foreground">Seg a Sab</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="grid gap-4">
              {CONTACT_CHANNELS.map((channel) => {
                const Icon = channel.icon;

                return (
                  <Card
                    key={channel.title}
                    className="border-black/5 bg-white/92 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]"
                  >
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <Badge variant="outline" className="border-black/10 bg-slate-50 text-foreground">
                          Canal ativo
                        </Badge>
                      </div>
                      <div>
                        <CardTitle className="text-2xl">{channel.title}</CardTitle>
                        <CardDescription className="mt-2 text-sm leading-7 text-muted-foreground">
                          {channel.description}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Detalhe</p>
                        <p className="mt-2 break-words text-base font-semibold text-foreground">{channel.detail}</p>
                      </div>

                      {channel.kind === "internal" ? (
                        <Button asChild className="gap-2">
                          <Link to={channel.href}>
                            {channel.cta}
                            <ArrowRight className="h-4 w-4" />
                          </Link>
                        </Button>
                      ) : (
                        <Button asChild className="gap-2">
                          <a href={channel.href}>
                            {channel.cta}
                            <ArrowRight className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="space-y-6">
              <Card className="border-[#dfe6f7] bg-[linear-gradient(160deg,rgba(239,246,255,0.94),rgba(255,255,255,0.98))] shadow-[0_22px_60px_-44px_rgba(37,99,235,0.22)]">
                <CardHeader className="space-y-3">
                  <Badge className="w-fit border-none bg-white text-foreground">Loja fisica</Badge>
                  <CardTitle className="text-2xl">Atendimento presencial e retirada</CardTitle>
                  <CardDescription className="text-sm leading-7 text-muted-foreground">
                    Se o cliente precisa validar um item de perto, tirar uma duvida rápida ou alinhar retirada, o endereço e o horário ficam claros aqui.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-2xl border border-black/5 bg-white/90 px-4 py-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      Endereco
                    </div>
                    <p className="mt-3 text-sm leading-7 text-foreground">
                      {STORE_CONTACT.address.map((line) => (
                        <span key={line}>
                          {line}
                          <br />
                        </span>
                      ))}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-black/5 bg-white/90 px-4 py-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                      <Clock3 className="h-4 w-4" />
                      Horarios
                    </div>
                    <p className="mt-3 text-sm leading-7 text-foreground">
                      {STORE_CONTACT.openingHours.map((line) => (
                        <span key={line}>
                          {line}
                          <br />
                        </span>
                      ))}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-black/5 bg-white/92 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
                <CardHeader>
                  <Badge className="w-fit border-none bg-accent text-accent-foreground">Como ajudar</Badge>
                  <CardTitle className="mt-3 text-2xl">Tipos de demanda mais comuns</CardTitle>
                  <CardDescription className="text-sm leading-7 text-muted-foreground">
                    Organizamos os assuntos mais frequentes para a pessoa cair no canal certo sem perder tempo.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {SUPPORT_TOPICS.map((topic) => {
                    const Icon = topic.icon;

                    return (
                      <div
                        key={topic.title}
                        className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white shadow-sm">
                            <Icon className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground">{topic.title}</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{topic.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="rounded-[2rem] border border-black/5 bg-white px-6 py-8 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.24)] sm:px-8">
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
              <div>
                <Badge className="border-none bg-primary/10 text-primary">Atalho rápido</Badge>
                <h2 className="mt-4 text-2xl font-bold text-foreground sm:text-3xl">
                  Ja tem a lista da obra ou quer explorar antes de falar com a equipe?
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
                  Voce pode seguir direto para o fluxo de orçamento ou navegar pelas categorias publicas para chegar ao atendimento com a necessidade mais bem definida.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button asChild className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 sm:w-auto">
                  <Link to="/solicitar-orçamento">Solicitar orçamento</Link>
                </Button>
                <Button asChild variant="outline" className="w-full border-black/10 bg-white hover:bg-white sm:w-auto">
                  <Link to="/categorias">Ver catálogo</Link>
                </Button>
              </div>
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
