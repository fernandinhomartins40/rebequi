import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Camera, CheckCircle2, FileText, KeyRound, LogOut, Plus, Trash2, UserRound } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { formatDateTime, formatWhatsapp } from '@rebequi/shared/utils';
import { QuoteDocumentCaptureCard } from '@/components/QuoteDocumentCaptureCard';
import { LeadStatusBadge, QuoteStatusBadge } from '@/components/QuoteStatusBadge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { clearProvisionalCredentials, readProvisionalCredentials } from '@/lib/provisional-credentials';
import { formatQuoteTimestamp } from '@/lib/quote-ui';
import { createAuthenticatedQuoteDraft, fetchMyQuotes, submitMyQuote, updateMyQuoteDraft } from '@/services/api/quotes';
import type { QuoteItemInputDTO, QuoteRequest } from '@/types';

type EditableQuoteItem = QuoteItemInputDTO & { id?: string };

type DraftEditorState = {
  title: string;
  customerNote: string;
  items: EditableQuoteItem[];
};

const EMPTY_ITEM: EditableQuoteItem = {
  name: '',
  quantity: 1,
  unit: '',
  notes: '',
};

function buildEditorState(quote?: QuoteRequest | null): DraftEditorState {
  if (!quote) {
    return {
      title: '',
      customerNote: '',
      items: [{ ...EMPTY_ITEM }],
    };
  }

  return {
    title: quote.title || '',
    customerNote: quote.customerNote || '',
    items:
      quote.items.length > 0
        ? quote.items.map((item) => ({
            id: item.id,
            productId: item.productId || undefined,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit || '',
            notes: item.notes || '',
          }))
        : [{ ...EMPTY_ITEM }],
  };
}

const CustomerDashboard = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout, changePassword } = useAuth();
  const { toast } = useToast();
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
  });
  const [editorState, setEditorState] = useState<DraftEditorState>(buildEditorState());
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(searchParams.get('quoteId'));
  const [provisionalCredentials, setProvisionalCredentials] = useState(() => readProvisionalCredentials());

  const quotesQuery = useQuery({
    queryKey: ['customer', 'quotes'],
    queryFn: fetchMyQuotes,
  });

  const createDraftMutation = useMutation({
    mutationFn: createAuthenticatedQuoteDraft,
    onSuccess: async (quote) => {
      await queryClient.invalidateQueries({ queryKey: ['customer', 'quotes'] });
      setSelectedQuoteId(quote.id);
      setSearchParams({ quoteId: quote.id });
      toast({
        title: 'Rascunho criado',
        description: 'Revise os itens reconhecidos e envie o orçamento quando estiver tudo certo.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao criar rascunho',
        description: error instanceof Error ? error.message : 'Não foi possível processar a imagem.',
      });
    },
  });

  const updateDraftMutation = useMutation({
    mutationFn: async (params: { id: string; payload: DraftEditorState }) =>
      updateMyQuoteDraft(params.id, {
        title: params.payload.title || null,
        customerNote: params.payload.customerNote || null,
        items: params.payload.items
          .filter((item) => item.name.trim().length > 0)
          .map((item) => ({
            productId: item.productId || null,
            name: item.name.trim(),
            quantity: Number(item.quantity) || 1,
            unit: item.unit?.trim() || null,
            notes: item.notes?.trim() || null,
          })),
      }),
    onSuccess: async (quote) => {
      await queryClient.invalidateQueries({ queryKey: ['customer', 'quotes'] });
      setSelectedQuoteId(quote.id);
      toast({
        title: 'Rascunho salvo',
        description: 'As alteracoes do orçamento foram registradas com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao salvar rascunho',
        description: error instanceof Error ? error.message : 'Não foi possível salvar o orçamento.',
      });
    },
  });

  const submitQuoteMutation = useMutation({
    mutationFn: submitMyQuote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customer', 'quotes'] });
      toast({
        title: 'Orçamento enviado',
        description: 'Seu orçamento agora está disponível para a equipe administrativa.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao enviar orçamento',
        description: error instanceof Error ? error.message : 'Não foi possível enviar o orçamento.',
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      clearProvisionalCredentials();
      setProvisionalCredentials(null);
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
      });
      toast({
        title: 'Senha atualizada',
        description: 'Sua conta deixou de usar a senha provisória.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao atualizar senha',
        description: error instanceof Error ? error.message : 'Não foi possível alterar sua senha.',
      });
    },
  });

  const quotes = quotesQuery.data ?? [];
  const selectedQuote = useMemo(() => {
    if (selectedQuoteId) {
      return quotes.find((quote) => quote.id === selectedQuoteId) || null;
    }

    return quotes.find((quote) => quote.status === 'DRAFT') || quotes[0] || null;
  }, [quotes, selectedQuoteId]);

  useEffect(() => {
    setEditorState(buildEditorState(selectedQuote));
  }, [selectedQuote]);

  useEffect(() => {
    const quoteId = searchParams.get('quoteId');
    if (quoteId) {
      setSelectedQuoteId(quoteId);
    }
  }, [searchParams]);

  const draftQuotes = quotes.filter((quote) => quote.status === 'DRAFT');
  const submittedQuotes = quotes.filter((quote) => quote.status !== 'DRAFT');

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const handleSelectQuote = (quoteId: string) => {
    setSelectedQuoteId(quoteId);
    setSearchParams({ quoteId });
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#fffef9_0%,#ffffff_28%,#f8f6ef_100%)] px-4 py-8 sm:px-6 sm:py-10">
      <div className="container mx-auto max-w-7xl space-y-6">
        <header className="rounded-[2rem] border border-[#e7dcc3] bg-white/95 px-6 py-6 shadow-[0_35px_80px_-50px_rgba(15,23,42,0.35)]">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                <CheckCircle2 className="h-4 w-4" />
                Painel do cliente
              </p>
              <div>
                <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Central de orçamentos</h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                  Tire foto do documento, revise os itens reconhecidos pelo OCR e acompanhe o status de cada orçamento.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" className="gap-2" onClick={() => void handleLogout()}>
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <MetricCard
              icon={<UserRound className="h-5 w-5 text-primary" />}
              label="Acesso"
              value={user?.identifier || '-'}
              detail={user?.whatsapp ? formatWhatsapp(user.whatsapp) : user?.email || 'Sessão autenticada'}
            />
            <MetricCard
              icon={<FileText className="h-5 w-5 text-primary" />}
              label="Orçamentos"
              value={`${quotes.length}`}
              detail={`${draftQuotes.length} rascunhos e ${submittedQuotes.length} enviados`}
            />
            <MetricCard
              icon={<KeyRound className="h-5 w-5 text-primary" />}
              label="Senha"
              value={user?.mustChangePassword ? 'Provisoria' : 'Atualizada'}
              detail={user?.mustChangePassword ? 'Recomendado trocar no bloco abaixo.' : 'Acesso principal em uso.'}
            />
          </div>
        </header>

        {user?.mustChangePassword || provisionalCredentials ? (
          <Alert className="border-primary/20 bg-primary/5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <AlertTitle>Acesso provisório disponível</AlertTitle>
            <AlertDescription>
              Use <strong>{provisionalCredentials?.identifier || user?.identifier}</strong> para entrar. Senha atual:{' '}
              <strong>{provisionalCredentials?.password || 'definida por você'}</strong>.
            </AlertDescription>
          </Alert>
        ) : null}

        <QuoteDocumentCaptureCard
          title="Enviar um novo documento"
          description="Use a câmera do celular para fotografar um documento e deixar o OCR montar automaticamente os itens do orçamento."
          helper="Depois do processamento, o rascunho aparece logo abaixo para revisão e envio."
          processing={createDraftMutation.isPending}
          buttonLabel="Tirar foto do documento"
          onSelectFile={async (file) => {
            await createDraftMutation.mutateAsync({ file });
          }}
        />

        <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
          <Card className="border-black/5 bg-white/92 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
            <CardHeader>
              <CardTitle>Meus orçamentos</CardTitle>
              <CardDescription>
                Selecione um rascunho para revisar os itens ou acompanhe os orçamentos já enviados.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {quotesQuery.isLoading ? (
                <p className="text-sm text-muted-foreground">Carregando orçamentos...</p>
              ) : quotes.length === 0 ? (
                <div className="rounded-[1.5rem] border border-dashed border-[#e7dcc3] bg-slate-50 px-5 py-8 text-center">
                  <p className="font-semibold text-foreground">Nenhum orçamento por enquanto</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Envie o primeiro documento com a câmera para abrir um rascunho aqui.
                  </p>
                </div>
              ) : (
                quotes.map((quote) => (
                  <button
                    key={quote.id}
                    type="button"
                    onClick={() => handleSelectQuote(quote.id)}
                    className={`w-full rounded-[1.5rem] border px-4 py-4 text-left transition ${
                      selectedQuote?.id === quote.id
                        ? 'border-primary bg-primary/5 shadow-[0_18px_42px_-35px_rgba(37,99,235,0.35)]'
                        : 'border-black/5 bg-slate-50 hover:border-primary/35'
                    }`}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {quote.referenceCode}
                        </p>
                        <h2 className="mt-1 text-lg font-semibold text-foreground">{quote.title || 'Orçamento sem título'}</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                          {quote.itemCount} itens | criado em {formatQuoteTimestamp(quote.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <QuoteStatusBadge status={quote.status} />
                        {quote.lead ? <LeadStatusBadge status={quote.lead.status} /> : null}
                      </div>
                    </div>

                    {quote.customerNote ? (
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{quote.customerNote}</p>
                    ) : quote.ocrText ? (
                      <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{quote.ocrText}</p>
                    ) : null}
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-black/5 bg-white/92 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
            <CardHeader>
              <CardTitle>Revisao do rascunho</CardTitle>
              <CardDescription>
                Edite os itens reconhecidos antes de enviar o orçamento para a equipe administrativa.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {!selectedQuote ? (
                <p className="text-sm text-muted-foreground">Selecione um orçamento para visualizar os detalhes.</p>
              ) : selectedQuote.status !== 'DRAFT' ? (
                <div className="space-y-4">
                  <div className="rounded-[1.5rem] border border-black/5 bg-slate-50 px-5 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                          {selectedQuote.referenceCode}
                        </p>
                        <h2 className="mt-1 text-xl font-semibold text-foreground">{selectedQuote.title || 'Orçamento enviado'}</h2>
                      </div>
                      <QuoteStatusBadge status={selectedQuote.status} />
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                      Enviado em {formatQuoteTimestamp(selectedQuote.submittedAt || selectedQuote.updatedAt)} com{' '}
                      {selectedQuote.itemCount} itens.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {selectedQuote.items.map((item) => (
                      <div key={item.id} className="rounded-[1.25rem] border border-black/5 bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-foreground">{item.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.quantity} {item.unit || 'un'}
                          </p>
                        </div>
                        {item.notes ? <p className="mt-2 text-sm text-muted-foreground">{item.notes}</p> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="quote-title">Título do orçamento</Label>
                      <Input
                        id="quote-title"
                        value={editorState.title}
                        onChange={(event) => setEditorState((current) => ({ ...current, title: event.target.value }))}
                        placeholder="Ex.: Materiais para reforma da cozinha"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="quote-note">Observações</Label>
                      <Textarea
                        id="quote-note"
                        rows={4}
                        value={editorState.customerNote}
                        onChange={(event) => setEditorState((current) => ({ ...current, customerNote: event.target.value }))}
                        placeholder="Acrescente detalhes importantes sobre o documento ou a entrega."
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    {editorState.items.map((item, index) => (
                      <div key={`${item.id || 'new'}-${index}`} className="rounded-[1.5rem] border border-black/5 bg-slate-50 px-4 py-4">
                        <div className="grid gap-3 sm:grid-cols-[1.5fr_0.35fr_0.35fr_auto]">
                          <div className="space-y-2">
                            <Label>Item</Label>
                            <Input
                              value={item.name}
                              onChange={(event) =>
                                setEditorState((current) => ({
                                  ...current,
                                  items: current.items.map((entry, entryIndex) =>
                                    entryIndex === index ? { ...entry, name: event.target.value } : entry
                                  ),
                                }))
                              }
                              placeholder="Nome do produto ou insumo"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Qtd.</Label>
                            <Input
                              inputMode="decimal"
                              value={item.quantity}
                              onChange={(event) =>
                                setEditorState((current) => ({
                                  ...current,
                                  items: current.items.map((entry, entryIndex) =>
                                    entryIndex === index
                                      ? { ...entry, quantity: Number(event.target.value.replace(',', '.')) || 1 }
                                      : entry
                                  ),
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Unidade</Label>
                            <Input
                              value={item.unit || ''}
                              onChange={(event) =>
                                setEditorState((current) => ({
                                  ...current,
                                  items: current.items.map((entry, entryIndex) =>
                                    entryIndex === index ? { ...entry, unit: event.target.value } : entry
                                  ),
                                }))
                              }
                              placeholder="un"
                            />
                          </div>
                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="outline"
                              className="gap-2"
                              onClick={() =>
                                setEditorState((current) => ({
                                  ...current,
                                  items:
                                    current.items.length === 1
                                      ? [{ ...EMPTY_ITEM }]
                                      : current.items.filter((_, entryIndex) => entryIndex !== index),
                                }))
                              }
                            >
                              <Trash2 className="h-4 w-4" />
                              Remover
                            </Button>
                          </div>
                        </div>

                        <div className="mt-3 space-y-2">
                          <Label>Observação do item</Label>
                          <Input
                            value={item.notes || ''}
                            onChange={(event) =>
                              setEditorState((current) => ({
                                ...current,
                                items: current.items.map((entry, entryIndex) =>
                                  entryIndex === index ? { ...entry, notes: event.target.value } : entry
                                ),
                              }))
                            }
                            placeholder="Detalhes extras do item reconhecido"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() =>
                      setEditorState((current) => ({
                        ...current,
                        items: [...current.items, { ...EMPTY_ITEM }],
                      }))
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar item
                  </Button>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      className="gap-2"
                      onClick={() => {
                        if (!selectedQuote) {
                          return;
                        }

                        void updateDraftMutation.mutateAsync({
                          id: selectedQuote.id,
                          payload: editorState,
                        });
                      }}
                      disabled={updateDraftMutation.isPending}
                    >
                      {updateDraftMutation.isPending ? 'Salvando...' : 'Salvar rascunho'}
                    </Button>

                    <Button
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        if (!selectedQuote) {
                          return;
                        }

                        void updateDraftMutation
                          .mutateAsync({
                            id: selectedQuote.id,
                            payload: editorState,
                          })
                          .then((quote) => submitQuoteMutation.mutateAsync(quote.id));
                      }}
                      disabled={updateDraftMutation.isPending || submitQuoteMutation.isPending}
                    >
                      {submitQuoteMutation.isPending ? 'Enviando...' : 'Salvar e enviar'}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </section>

        <Card className="border-black/5 bg-white/92 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
          <CardHeader>
            <CardTitle>Atualizar senha</CardTitle>
            <CardDescription>
              Troque a senha provisória por uma senha pessoal para continuar acessando o painel com mais segurança.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[1fr_1fr_auto]">
            <div className="space-y-2">
              <Label htmlFor="current-password">Senha atual</Label>
              <Input
                id="current-password"
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))}
                placeholder="Senha atual"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">Nova senha</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))}
                placeholder="Nova senha"
              />
            </div>
            <div className="flex items-end">
              <Button
                className="w-full gap-2 md:w-auto"
                disabled={changePasswordMutation.isPending}
                onClick={() => {
                  void changePasswordMutation.mutateAsync(passwordForm);
                }}
              >
                {changePasswordMutation.isPending ? 'Atualizando...' : 'Atualizar senha'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const MetricCard = ({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="rounded-[1.5rem] border border-black/5 bg-slate-50 px-5 py-4">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="rounded-full bg-white p-2 shadow-sm">{icon}</div>
    </div>
    <p className="mt-3 break-words text-lg font-bold text-foreground sm:text-xl">{value}</p>
    <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
  </div>
);

export default CustomerDashboard;
