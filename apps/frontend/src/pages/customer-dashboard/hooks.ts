import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { clearProvisionalCredentials, readProvisionalCredentials } from '@/lib/provisional-credentials';
import { createAuthenticatedQuoteDraft, fetchMyQuotes, submitMyQuote, updateMyQuoteDraft } from '@/services/api/quotes';
import type { QuoteRequest } from '@/types';
import { EMPTY_ITEM, type ActiveTab, type DraftEditorState } from './types';

function buildEditorState(quote?: QuoteRequest | null): DraftEditorState {
  if (!quote) return { title: '', customerNote: '', items: [{ ...EMPTY_ITEM }] };
  return {
    title: quote.title === 'Rascunho em processamento' ? '' : quote.title || '',
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

export function useCustomerDashboard() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, logout, changePassword } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<ActiveTab>(
    () => (searchParams.get('tab') as ActiveTab) || 'overview'
  );
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [editorState, setEditorState] = useState<DraftEditorState>(buildEditorState());
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(searchParams.get('quoteId'));
  const [provisionalCredentials, setProvisionalCredentials] = useState(() => readProvisionalCredentials());
  const editorCardRef = useRef<HTMLDivElement | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const quotesQuery = useQuery({
    queryKey: ['customer', 'quotes'],
    queryFn: fetchMyQuotes,
    refetchInterval: 5000,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createDraftMutation = useMutation({
    mutationFn: createAuthenticatedQuoteDraft,
    onSuccess: async (quote) => {
      queryClient.setQueryData<QuoteRequest[]>(['customer', 'quotes'], (current) => {
        const next = current ?? [];
        return [quote, ...next.filter((e) => e.id !== quote.id)];
      });
      await queryClient.invalidateQueries({ queryKey: ['customer', 'quotes'] });
      setSelectedQuoteId(quote.id);
      setEditorState(buildEditorState(quote));
      setSearchParams({ quoteId: quote.id, tab: 'quotes' });
      setActiveTab('quotes');
      toast({
        title: 'Rascunho criado',
        description: 'A leitura automatica continua em segundo plano. Voce pode revisar ou preencher manualmente.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao criar rascunho',
        description: error instanceof Error ? error.message : 'Erro ao processar imagem.',
      });
    },
  });

  const updateDraftMutation = useMutation({
    mutationFn: async (params: { id: string; payload: DraftEditorState }) =>
      updateMyQuoteDraft(params.id, {
        title: params.payload.title || null,
        customerNote: params.payload.customerNote || null,
        items: params.payload.items
          .filter((i) => i.name.trim())
          .map((i) => ({
            productId: i.productId || null,
            name: i.name.trim(),
            quantity: Number(i.quantity) || 1,
            unit: i.unit?.trim() || null,
            notes: i.notes?.trim() || null,
          })),
      }),
    onSuccess: async (quote) => {
      await queryClient.invalidateQueries({ queryKey: ['customer', 'quotes'] });
      setSelectedQuoteId(quote.id);
      toast({ title: 'Rascunho salvo' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao salvar',
        description: error instanceof Error ? error.message : 'Erro.',
      });
    },
  });

  const submitQuoteMutation = useMutation({
    mutationFn: submitMyQuote,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customer', 'quotes'] });
      toast({ title: 'Orçamento enviado' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao enviar',
        description: error instanceof Error ? error.message : 'Erro.',
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: changePassword,
    onSuccess: () => {
      clearProvisionalCredentials();
      setProvisionalCredentials(null);
      setPasswordForm({ currentPassword: '', newPassword: '' });
      toast({ title: 'Senha atualizada' });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao atualizar senha',
        description: error instanceof Error ? error.message : 'Erro.',
      });
    },
  });

  // ── Derived state ─────────────────────────────────────────────────────────
  const quotes = useMemo(() => {
    const list = quotesQuery.data ?? [];
    return [...list].sort((a, b) => {
      const aTime = new Date((a.updatedAt || a.createdAt || 0) as string | number | Date).getTime();
      const bTime = new Date((b.updatedAt || b.createdAt || 0) as string | number | Date).getTime();
      return bTime - aTime;
    });
  }, [quotesQuery.data]);

  const selectedQuote = useMemo(() => {
    if (selectedQuoteId) return quotes.find((q) => q.id === selectedQuoteId) || null;
    return quotes.find((q) => q.status === 'DRAFT') || quotes[0] || null;
  }, [quotes, selectedQuoteId]);

  const draftQuotes = quotes.filter((q) => q.status === 'DRAFT');
  const submittedQuotes = quotes.filter((q) => q.status === 'SUBMITTED');
  const inReviewQuotes = quotes.filter((q) => q.status === 'IN_REVIEW');
  const respondedQuotes = quotes.filter((q) => q.status === 'RESPONDED');
  const editableItemCount = editorState.items.filter((item) => item.name.trim()).length;

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => { setEditorState(buildEditorState(selectedQuote)); }, [selectedQuote]);

  useEffect(() => {
    const id = searchParams.get('quoteId');
    if (id) setSelectedQuoteId(id);
  }, [searchParams]);

  useEffect(() => {
    if (!selectedQuote || !selectedQuoteId) return;
    const frame = window.requestAnimationFrame(() =>
      editorCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    );
    return () => window.cancelAnimationFrame(frame);
  }, [selectedQuote?.id, selectedQuoteId]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLogout = async () => { await logout(); navigate('/'); };

  const handleSelectQuote = (id: string) => {
    setSelectedQuoteId(id);
    setSearchParams({ quoteId: id, tab: 'quotes' });
    setActiveTab('quotes');
  };

  const handleSaveDraft = async () => {
    if (!selectedQuote || selectedQuote.status !== 'DRAFT') return null;
    return updateDraftMutation.mutateAsync({ id: selectedQuote.id, payload: editorState });
  };

  const handleSaveAndSend = async () => {
    const quote = await handleSaveDraft();
    if (!quote) return;
    await submitQuoteMutation.mutateAsync(quote.id);
  };

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    const params: Record<string, string> = { tab };
    if (selectedQuoteId && tab === 'quotes') params.quoteId = selectedQuoteId;
    setSearchParams(params);
  };

  return {
    // auth
    user,
    provisionalCredentials,
    handleLogout,
    // navigation
    activeTab,
    handleTabChange,
    // quotes
    quotes,
    quotesLoading: quotesQuery.isLoading,
    selectedQuote,
    draftQuotes,
    submittedQuotes,
    inReviewQuotes,
    respondedQuotes,
    editableItemCount,
    handleSelectQuote,
    handleSaveDraft,
    handleSaveAndSend,
    createDraftPending: createDraftMutation.isPending,
    saveDraftPending: updateDraftMutation.isPending,
    submitPending: submitQuoteMutation.isPending,
    createDraftMutation,
    // editor
    editorState,
    setEditorState,
    editorCardRef,
    // password
    passwordForm,
    setPasswordForm,
    changePasswordMutation,
  };
}
