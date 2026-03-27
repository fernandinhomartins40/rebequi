import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle2, FileScan, PhoneCall } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import type { RegisterInput } from '@rebequi/shared/schemas';
import { registerSchema } from '@rebequi/shared/schemas';
import { formatWhatsapp } from '@rebequi/shared/utils';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { QuoteDocumentCaptureCard } from '@/components/QuoteDocumentCaptureCard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { saveProvisionalCredentials } from '@/lib/provisional-credentials';
import { processPublicQuoteDocument, startPublicLead } from '@/services/api/quotes';

type FormValues = RegisterInput;

export default function RequestQuotePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { refreshSession } = useAuth();
  const {
    register,
    handleSubmit,
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

  const handleCreateLead = handleSubmit(async (values) => {
    try {
      const result = await leadMutation.mutateAsync(values);
      saveProvisionalCredentials(result.provisionalCredentials);

      toast({
        title: 'Lead capturado',
        description: 'Agora envie a foto do documento para gerar o orçamento automaticamente.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Falha ao iniciar a solicitacao',
        description: error instanceof Error ? error.message : 'Nao foi possivel registrar seus dados agora.',
      });
    }
  });

  const handleProcessDocument = async (file: File) => {
    if (!leadData?.lead) {
      return;
    }

    try {
      const result = await quoteMutation.mutateAsync({
        leadId: leadData.lead.id,
        file,
      });

      await refreshSession();
      toast({
        title: 'Orcamento em rascunho',
        description: 'Revise os itens reconhecidos no painel do cliente antes de enviar.',
      });
      navigate(`/painel-cliente?quoteId=${result.quote.id}`);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Falha ao processar documento',
        description: error instanceof Error ? error.message : 'Nao foi possivel processar a foto enviada.',
      });
    }
  };

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_28%,#f8f6ef_100%)]">
      <Header />

      <div className="container mx-auto px-4 py-10">
        <Button asChild variant="ghost" className="px-0 text-muted-foreground hover:bg-transparent hover:text-foreground">
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a loja
          </Link>
        </Button>

        <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-[#e7dcc3] bg-white/95 shadow-[0_35px_80px_-50px_rgba(15,23,42,0.35)]">
            <CardHeader className="space-y-4">
              <Badge className="w-fit border-none bg-accent text-accent-foreground">Solicitar orcamento</Badge>
              <div>
                <CardTitle className="text-3xl leading-tight sm:text-4xl">
                  Envie a foto do documento e deixe o sistema montar o rascunho
                </CardTitle>
                <CardDescription className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
                  Primeiro capturamos seu nome e WhatsApp para registrar o lead. Em seguida, a foto do documento e
                  processada com OCR para montar os itens automaticamente.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <InfoPill icon={<PhoneCall className="h-4 w-4 text-primary" />} title="1. Identificacao" description="Nome e WhatsApp com DDD" />
              <InfoPill icon={<FileScan className="h-4 w-4 text-primary" />} title="2. Foto" description="Camera do celular ou galeria" />
              <InfoPill icon={<CheckCircle2 className="h-4 w-4 text-primary" />} title="3. Revisao" description="Edite os itens no painel" />
            </CardContent>
          </Card>

          <Card className="border-black/5 bg-white/92 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
            <CardHeader>
              <CardTitle>Seus dados para iniciar</CardTitle>
              <CardDescription>
                Se voce sair no meio do processo, seu acesso provisório e seu lead continuam registrados.
              </CardDescription>
            </CardHeader>
            <CardContent>
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

                <Button type="submit" className="w-full" disabled={leadMutation.isPending}>
                  {leadMutation.isPending ? 'Registrando lead...' : 'Continuar para a foto do documento'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </section>

        {leadData?.lead ? (
          <section className="mt-8 space-y-6">
            {leadData.provisionalCredentials ? (
              <Alert className="border-primary/20 bg-primary/5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertTitle>Acesso provisório criado</AlertTitle>
                <AlertDescription>
                  Usuario: <strong>{leadData.provisionalCredentials.identifier}</strong> | senha provisória:{' '}
                  <strong>{leadData.provisionalCredentials.password}</strong>
                </AlertDescription>
              </Alert>
            ) : null}

            <QuoteDocumentCaptureCard
              title="Fotografe o documento do orçamento"
              description="A imagem sera processada com OCR open source para identificar os itens e abrir um rascunho no painel do cliente."
              helper="Se a camera nao abrir automaticamente no seu aparelho, o seletor tambem permite enviar a imagem da galeria."
              processing={quoteMutation.isPending}
              onSelectFile={handleProcessDocument}
            />
          </section>
        ) : null}

        {quoteMutation.isError ? (
          <Alert variant="destructive" className="mt-6">
            <AlertTitle>Falha ao processar o documento</AlertTitle>
            <AlertDescription>
              {quoteMutation.error instanceof Error ? quoteMutation.error.message : 'Tente novamente com uma foto mais nítida.'}
            </AlertDescription>
          </Alert>
        ) : null}
      </div>

      <Footer />
    </main>
  );
}

function InfoPill({
  description,
  icon,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-black/5 bg-slate-50 px-4 py-4">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
