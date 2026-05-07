import { type ReactNode } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, FileScan, PhoneCall, ShieldCheck } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import type { RegisterInput } from '@rebequi/shared/schemas';
import { registerSchema } from '@rebequi/shared/schemas';
import { formatWhatsapp } from '@rebequi/shared/utils';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { QuoteDocumentCaptureCard, type QuoteDocumentSelection } from '@/components/QuoteDocumentCaptureCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
    defaultValues: { name: '', whatsapp: '' },
  });

  const leadMutation = useMutation({ mutationFn: startPublicLead });
  const quoteMutation = useMutation({ mutationFn: processPublicQuoteDocument });

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
        description: 'Agora capture o documento para montar o rascunho.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível registrar seus dados',
        description: error instanceof Error ? error.message : 'Tente novamente.',
      });
    }
  });

  const handleProcessDocument = async (selection: QuoteDocumentSelection) => {
    if (!leadData?.lead) return;
    try {
      const result = await quoteMutation.mutateAsync({
        leadId: leadData.lead.id,
        file: selection.file,
        width: selection.width,
        height: selection.height,
      });
      queryClient.setQueryData<QuoteRequest[]>(['customer', 'quotes'], (current) => {
        const next = current ?? [];
        return [result.quote, ...next.filter((q) => q.id !== result.quote.id)];
      });
      await refreshSession();
      toast({
        title: 'Rascunho criado',
        description: 'A leitura do documento continua em segundo plano. Revise ou preencha os itens no painel.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Não foi possível processar a imagem',
        description: error instanceof Error ? error.message : 'Tente com uma foto mais nítida.',
      });
    }
  };

  const handleRestartFlow = () => {
    leadMutation.reset();
    quoteMutation.reset();
    reset({ name: '', whatsapp: '' });
  };

  return (
    <main className="min-h-screen bg-slate-50/60">
      <Header />

      <div className="container mx-auto px-4 py-8 sm:py-10">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="mb-6 gap-1.5 px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
        >
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            Voltar para a loja
          </Link>
        </Button>

        <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
          {/* Sidebar de progresso */}
          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Solicitar orçamento</p>
              <h2 className="mt-1 text-base font-semibold text-foreground">Três passos simples</h2>
              <p className="mt-1 text-sm text-muted-foreground">Identifique-se, fotografe e confirme.</p>

              <div className="mt-4 space-y-2">
                <StepItem
                  number={1}
                  icon={<PhoneCall className="h-3.5 w-3.5" />}
                  title="Contato"
                  description="Nome e WhatsApp"
                  active={currentStage === 1}
                  done={currentStage > 1}
                />
                <StepItem
                  number={2}
                  icon={<FileScan className="h-3.5 w-3.5" />}
                  title="Foto"
                  description="Câmera ou galeria"
                  active={currentStage === 2}
                  done={currentStage > 2}
                />
                <StepItem
                  number={3}
                  icon={<CheckCircle2 className="h-3.5 w-3.5" />}
                  title="Confirmação"
                  description="Rascunho pronto"
                  active={currentStage === 3}
                  done={Boolean(processedQuote)}
                />
              </div>
            </div>

            {leadData?.lead ? (
              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-4 text-sm">
                <p className="font-semibold text-emerald-900">{leadData.user.name}</p>
                <p className="mt-0.5 text-emerald-800">{formatWhatsapp(leadData.lead.whatsapp)}</p>
              </div>
            ) : null}

            {processedQuote ? (
              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-4 text-sm">
                <p className="font-semibold text-emerald-900">Rascunho criado</p>
                <p className="mt-0.5 text-emerald-800">Leitura em segundo plano</p>
              </div>
            ) : null}
          </aside>

          {/* Conteúdo principal */}
          <div className="space-y-5">
            {/* Etapa 1 — Contato */}
            {currentStage === 1 ? (
              <div className="rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">1</span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Etapa 1</p>
                    <h3 className="text-base font-semibold text-foreground">Informe seu contato</h3>
                  </div>
                </div>

                <form className="space-y-4 max-w-sm" onSubmit={handleCreateLead}>
                  <div className="space-y-1.5">
                    <Label htmlFor="request-name">Nome</Label>
                    <Input id="request-name" placeholder="Seu nome completo" {...register('name')} />
                    {errors.name ? <p className="text-sm text-red-500">{errors.name.message}</p> : null}
                  </div>

                  <div className="space-y-1.5">
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

                  <div className="flex flex-wrap gap-3 pt-1">
                    <Button type="submit" disabled={leadMutation.isPending} className="gap-1.5">
                      {leadMutation.isPending ? 'Registrando...' : 'Continuar'}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button asChild variant="outline">
                      <Link to="/">Cancelar</Link>
                    </Button>
                  </div>
                </form>

                <div className="mt-6 flex items-start gap-2 rounded-lg border border-slate-200/70 bg-slate-50 px-3 py-2.5 text-sm text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <p>Seus dados são usados apenas para identificar o atendimento. Nada é compartilhado.</p>
                </div>
              </div>
            ) : null}

            {/* Etapa 2 — Foto */}
            {currentStage === 2 ? (
              <div className="rounded-xl border border-slate-200/70 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-white">2</span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Etapa 2</p>
                    <h3 className="text-base font-semibold text-foreground">Fotografe sua lista</h3>
                  </div>
                </div>

                <p className="mb-4 text-sm text-muted-foreground">
                  Tire uma foto da sua lista de materiais ou escolha uma imagem da galeria. Montamos o rascunho automaticamente.
                </p>

                <QuoteDocumentCaptureCard
                  helper="Use boa luz e mantenha a lista legível para melhor resultado."
                  processing={quoteMutation.isPending}
                  buttonLabel="criar rascunho"
                  onSelectFile={handleProcessDocument}
                />
              </div>
            ) : null}

            {/* Etapa 3 — Confirmação */}
            {currentStage === 3 && processedQuote ? (
              <div className="rounded-xl border border-emerald-200/70 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Etapa 3</p>
                    <h3 className="text-base font-semibold text-foreground">Rascunho criado com sucesso</h3>
                  </div>
                </div>

                <div className="mb-5 rounded-lg border border-slate-200/70 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-foreground">{buildQuoteDisplayTitle(processedQuote)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Rascunho criado · Código {processedQuote.referenceCode}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Abra o painel do cliente para acompanhar a leitura, revisar os itens ou preencher manualmente.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    className="gap-1.5"
                    onClick={() => navigate(`/painel-cliente?tab=quotes&quoteId=${processedQuote.id}`)}
                  >
                    Abrir painel do cliente
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={handleRestartFlow}>
                    Nova solicitação
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Erro de processamento */}
            {quoteMutation.isError ? (
              <Alert variant="destructive">
                <AlertTitle>Não foi possível processar a imagem</AlertTitle>
                <AlertDescription>
                  {quoteMutation.error instanceof Error
                    ? quoteMutation.error.message
                    : 'Tente novamente com uma foto mais nítida e bem iluminada.'}
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  );
}

function StepItem({
  number,
  icon,
  title,
  description,
  active,
  done,
}: {
  number: number;
  icon: ReactNode;
  title: string;
  description: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-all ${
        active
          ? 'border-primary/20 bg-primary/5'
          : done
            ? 'border-emerald-200/70 bg-emerald-50/60'
            : 'border-slate-200/70 bg-slate-50/60'
      }`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          active ? 'bg-primary text-white' : done ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400 ring-1 ring-slate-200'
        }`}
      >
        {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : icon ?? number}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}
