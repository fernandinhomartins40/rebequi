import { type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, FileScan, Home, PhoneCall, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import type { RegisterInput } from '@rebequi/shared/schemas';
import { registerSchema } from '@rebequi/shared/schemas';
import { formatWhatsapp } from '@rebequi/shared/utils';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { QuoteDocumentCaptureCard, type QuoteDocumentSelection } from '@/components/QuoteDocumentCaptureCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { buildQuoteDisplayTitle } from '@/lib/quote-ui';
import { saveProvisionalCredentials } from '@/lib/provisional-credentials';
import { processPublicQuoteDocument, startPublicLead } from '@/services/api/quotes';
import type { QuoteRequest } from '@/types';

type FormValues = RegisterInput;

export default function RequestQuotePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { refreshSession } = useAuth();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      whatsapp: '',
    },
  });

  const leadMutation = useMutation({
    mutationFn: startPublicLead,
  });

  const quoteMutation = useMutation({
    mutationFn: processPublicQuoteDocument,
  });

  const whatsappValue = watch('whatsapp');
  const leadData = leadMutation.data;
  const processedQuote = quoteMutation.data?.quote;
  const currentStage = processedQuote ? 3 : leadData?.lead ? 2 : 1;

  const handleCreateLead = handleSubmit(async (values) => {
    try {
      const result = await leadMutation.mutateAsync(values);
      saveProvisionalCredentials(result.provisionalCredentials);

      toast({
        title: 'Dados registrados',
        description: 'Agora capture o documento para montar o rascunho automaticamente.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Falha ao iniciar a solicitacao',
        description: error instanceof Error ? error.message : 'Nao foi possivel registrar seus dados agora.',
      });
    }
  });

  const handleProcessDocument = async (selection: QuoteDocumentSelection) => {
    if (!leadData?.lead) {
      return;
    }

    try {
      const result = await quoteMutation.mutateAsync({
        leadId: leadData.lead.id,
        file: selection.file,
        width: selection.width,
        height: selection.height,
      });

      queryClient.setQueryData<QuoteRequest[]>(['customer', 'quotes'], (current) => {
        const nextQuotes = current ?? [];
        return [result.quote, ...nextQuotes.filter((quote) => quote.id !== result.quote.id)];
      });

      await refreshSession();
      toast({
        title: 'Rascunho criado',
        description: `${result.quote.itemCount} item(ns) reconhecido(s). Revise e envie no painel do cliente.`,
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Falha ao processar documento',
        description: error instanceof Error ? error.message : 'Nao foi possivel processar o documento enviado.',
      });
    }
  };

  const handleRestartFlow = () => {
    leadMutation.reset();
    quoteMutation.reset();
    reset({
      name: '',
      whatsapp: '',
    });
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_30%,#f8fafc_100%)]">
      <Header />

      <div className="container mx-auto px-4 py-10">
        <Button asChild variant="ghost" className="px-0 text-muted-foreground hover:bg-transparent hover:text-foreground">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a loja
          </Link>
        </Button>

        <section className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <Card className="border-[#e7dcc3] bg-white/95 shadow-[0_30px_70px_-48px_rgba(15,23,42,0.34)]">
              <CardHeader className="space-y-4">
                <Badge className="w-fit border-none bg-accent text-accent-foreground">Solicitacao de orcamento</Badge>
                <div>
                  <CardTitle className="text-2xl leading-tight">Um fluxo simples, do contato ao rascunho.</CardTitle>
                  <CardDescription className="mt-3 text-sm leading-7 text-muted-foreground">
                    O processo inteiro ficou em tres etapas objetivas: identificar, capturar e confirmar.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <JourneyStep
                  number={1}
                  title="Identificacao"
                  description="Nome e WhatsApp para abrir o atendimento."
                  active={currentStage === 1}
                  done={currentStage > 1}
                  icon={<PhoneCall className="h-4 w-4" />}
                />
                <JourneyStep
                  number={2}
                    title="Foto"
                    description="Camera do aparelho ou imagem da galeria."
                  active={currentStage === 2}
                  done={currentStage > 2}
                  icon={<FileScan className="h-4 w-4" />}
                />
                <JourneyStep
                  number={3}
                  title="Confirmacao"
                  description="Rascunho pronto para seguir no painel do cliente."
                  active={currentStage === 3}
                  done={Boolean(processedQuote)}
                  icon={<CheckCircle2 className="h-4 w-4" />}
                />
              </CardContent>
            </Card>

            {leadData?.lead ? (
              <Card className="border-black/5 bg-white/90 shadow-[0_20px_45px_-36px_rgba(15,23,42,0.28)]">
                <CardHeader className="space-y-2 pb-3">
                  <CardTitle className="text-base">Contato registrado</CardTitle>
                  <CardDescription>Esse atendimento ja ficou vinculado ao seu acesso provisiorio.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoRow label="Nome" value={leadData.user.name} />
                  <InfoRow label="WhatsApp" value={formatWhatsapp(leadData.lead.whatsapp)} />
                  <InfoRow label="Lead" value={leadData.lead.id} />
                </CardContent>
              </Card>
            ) : null}

            {processedQuote ? (
              <Card className="border-emerald-200/70 bg-emerald-50/70 shadow-[0_18px_40px_-34px_rgba(16,185,129,0.3)]">
                <CardHeader className="space-y-2 pb-3">
                  <CardTitle className="text-base text-emerald-900">Rascunho pronto</CardTitle>
                  <CardDescription className="text-emerald-800">
                    O sistema montou um rascunho e registrou o atendimento para continuar no painel do cliente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-emerald-950">
                  <InfoRow label="Referencia" value={processedQuote.referenceCode} />
                  <InfoRow label="Titulo" value={buildQuoteDisplayTitle(processedQuote)} />
                  <InfoRow label="Itens" value={`${processedQuote.itemCount}`} />
                </CardContent>
              </Card>
            ) : null}
          </aside>

          <div className="space-y-6">
            {currentStage === 1 ? (
              <Card className="border-black/5 bg-white/94 shadow-[0_30px_70px_-48px_rgba(15,23,42,0.3)]">
                <CardHeader className="space-y-3">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <ShieldCheck className="h-4 w-4" />
                    Etapa 1
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Comece pelo contato</CardTitle>
                    <CardDescription className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                      Registramos seus dados primeiro para que o rascunho nao se perca e o atendimento continue mesmo se voce sair da pagina.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <form className="space-y-5" onSubmit={handleCreateLead}>
                    <div className="space-y-2">
                      <Label htmlFor="request-name">Nome</Label>
                      <Input id="request-name" placeholder="Seu nome" {...register('name')} />
                      {errors.name ? <p className="text-sm text-red-500">{errors.name.message}</p> : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="request-whatsapp">WhatsApp com DDD</Label>
                      <Input
                        id="request-whatsapp"
                        inputMode="tel"
                        placeholder="(11) 99999-0000"
                        value={whatsappValue}
                        {...register('whatsapp')}
                        onChange={(event) => {
                          const digits = event.target.value.replace(/\D/g, '').slice(0, 11);
                          setValue('whatsapp', formatWhatsapp(digits), { shouldValidate: true });
                        }}
                      />
                      {errors.whatsapp ? <p className="text-sm text-red-500">{errors.whatsapp.message}</p> : null}
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button type="submit" disabled={leadMutation.isPending} className="gap-2">
                        {leadMutation.isPending ? 'Registrando...' : 'Continuar'}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Button asChild variant="outline">
                        <Link to="/">Voltar para a loja</Link>
                      </Button>
                    </div>
                  </form>

                  <div className="grid gap-3">
                    <SmallFeature
                      title="Sem cadastro manual"
                      description="Se voce ainda nao tiver conta, o sistema cria um acesso provisiorio automaticamente."
                    />
                    <SmallFeature
                      title="Fluxo retomavel"
                      description="O lead e o rascunho continuam salvos para a equipe e para o seu painel."
                    />
                    <SmallFeature
                      title="Mesmo caminho em todo o sistema"
                      description="A experiencia publica, do cliente e do lojista passa a seguir a mesma logica."
                    />
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {currentStage === 2 ? (
              <Card className="border-black/5 bg-white/94 shadow-[0_30px_70px_-48px_rgba(15,23,42,0.3)]">
                <CardHeader className="space-y-3">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    <FileScan className="h-4 w-4" />
                    Etapa 2
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Adicione a foto do pedido</CardTitle>
                    <CardDescription className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                      O sistema gera um rascunho a partir da imagem enviada. Use a camera do aparelho ou escolha uma imagem ja salva.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {leadData?.provisionalCredentials ? (
                    <Alert className="border-primary/20 bg-primary/5">
                      <AlertTitle>Acesso provisiorio criado</AlertTitle>
                      <AlertDescription>
                        Usuario: <strong>{leadData.provisionalCredentials.identifier}</strong> | senha provisoria:{' '}
                        <strong>{leadData.provisionalCredentials.password}</strong>
                      </AlertDescription>
                    </Alert>
                  ) : null}

                  <QuoteDocumentCaptureCard
                    title="Foto do pedido"
                    description="Tire uma foto legivel para que o rascunho seja montado com mais consistencia."
                    helper="Use boa luz e mantenha a lista visivel."
                    processing={quoteMutation.isPending}
                    onSelectFile={handleProcessDocument}
                  />
                </CardContent>
              </Card>
            ) : null}

            {currentStage === 3 && processedQuote ? (
              <Card className="border-emerald-200/70 bg-white shadow-[0_30px_70px_-48px_rgba(15,23,42,0.3)]">
                <CardHeader className="space-y-3">
                  <div className="inline-flex w-fit items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="h-4 w-4" />
                    Etapa 3 concluida
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Rascunho criado com sucesso</CardTitle>
                    <CardDescription className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                      Agora voce pode abrir o painel do cliente para revisar os itens, ajustar quantidades e enviar a solicitacao para a loja.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                  <div className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <InfoRow label="Referencia" value={processedQuote.referenceCode} />
                      <InfoRow label="Itens" value={`${processedQuote.itemCount}`} />
                      <InfoRow label="Status" value="Rascunho" />
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/85 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Resumo do rascunho</p>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">{buildQuoteDisplayTitle(processedQuote)}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        O rascunho ja foi vinculado ao seu acesso. A proxima etapa agora e revisar e enviar no painel do cliente.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <Button className="gap-2" onClick={() => navigate(`/painel-cliente?tab=quotes&quoteId=${processedQuote.id}`)}>
                        Abrir painel do cliente
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" onClick={handleRestartFlow}>
                        Nova solicitacao
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-[1.5rem] border border-slate-200/80 bg-slate-50/85 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Proximos passos</p>
                    <div className="mt-4 space-y-3">
                      <SmallFeature
                        title="Revise os itens"
                        description="Ajuste nomes, quantidades, unidade e observacoes antes de enviar."
                      />
                      <SmallFeature
                        title="Envie quando estiver pronto"
                        description="O lojista so passa a ver a solicitacao operacional depois do envio."
                      />
                      <SmallFeature
                        title="Acompanhe o retorno"
                        description="O painel do cliente mostra quando a equipe estiver analisando ou quando o retorno chegar."
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : null}

            {quoteMutation.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Falha ao processar o documento</AlertTitle>
                <AlertDescription>
                  {quoteMutation.error instanceof Error ? quoteMutation.error.message : 'Tente novamente com um documento mais nitido.'}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </section>
      </div>

      <Footer />
    </main>
  );
}

function JourneyStep({
  number,
  title,
  description,
  active,
  done,
  icon,
}: {
  number: number;
  title: string;
  description: string;
  active: boolean;
  done: boolean;
  icon: ReactNode;
}) {
  return (
    <div
      className={`rounded-[1.4rem] border px-4 py-4 transition-all ${
        active
          ? 'border-primary/20 bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(255,251,235,0.94))] shadow-sm'
          : done
            ? 'border-emerald-200/70 bg-emerald-50/60'
            : 'border-slate-200/70 bg-slate-50/80'
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            active ? 'bg-primary text-white' : done ? 'bg-emerald-500 text-white' : 'bg-white text-slate-500'
          }`}
        >
          {done ? <CheckCircle2 className="h-4 w-4" /> : icon}
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Passo {number}</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
    </div>
  );
}

function SmallFeature({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200/70 bg-white/90 p-4">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200/70 bg-white/92 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
