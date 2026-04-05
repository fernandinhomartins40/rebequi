import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { ArrowRight, Camera, FileText, Plus, ScanText, Trash2 } from 'lucide-react';
import { QuoteDocumentCaptureCard, type QuoteDocumentSelection } from '@/components/QuoteDocumentCaptureCard';
import { QuoteStatusBadge } from '@/components/QuoteStatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  buildQuoteDisplayTitle,
  buildQuoteSourceLabel,
  buildQuoteStageLabel,
  formatQuoteTimestamp,
  getQuoteStatusDescription,
} from '@/lib/quote-ui';
import type { QuoteItemInputDTO, QuoteRequest } from '@/types';

type EditableQuoteItem = QuoteItemInputDTO & { id?: string };
type DraftEditorState = { title: string; customerNote: string; items: EditableQuoteItem[] };

const EMPTY_ITEM: EditableQuoteItem = { name: '', quantity: 1, unit: '', notes: '' };

export function CustomerQuotesPanel({
  quotes,
  quotesLoading,
  selectedQuote,
  editorState,
  setEditorState,
  editorCardRef,
  createDraftPending,
  saveDraftPending,
  submitPending,
  onCaptureDocument,
  onSelectQuote,
  onSaveDraft,
  onSaveAndSend,
}: {
  quotes: QuoteRequest[];
  quotesLoading: boolean;
  selectedQuote: QuoteRequest | null;
  editorState: DraftEditorState;
  setEditorState: Dispatch<SetStateAction<DraftEditorState>>;
  editorCardRef: MutableRefObject<HTMLDivElement | null>;
  createDraftPending: boolean;
  saveDraftPending: boolean;
  submitPending: boolean;
  onCaptureDocument: (selection: QuoteDocumentSelection) => Promise<void>;
  onSelectQuote: (id: string) => void;
  onSaveDraft: () => Promise<unknown>;
  onSaveAndSend: () => Promise<unknown>;
}) {
  const draftQuotes = quotes.filter((q) => q.status === 'DRAFT');
  const submittedQuotes = quotes.filter((q) => q.status === 'SUBMITTED');
  const inReviewQuotes = quotes.filter((q) => q.status === 'IN_REVIEW');
  const respondedQuotes = quotes.filter((q) => q.status === 'RESPONDED');
  const editableItemCount = editorState.items.filter((item) => item.name.trim()).length;

  return (
    <div className="animate-fade-in-up space-y-5">
      <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/92 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Workspace de orcamentos</p>
            <h3 className="text-2xl font-semibold tracking-tight text-foreground">Um fluxo continuo do documento ao envio.</h3>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Capture um documento, abra o rascunho na fila e trabalhe sempre em um orcamento por vez.
            </p>
          </div>
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {buildQuoteStageLabel(selectedQuote)}
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummarySurface value={`${quotes.length}`} label="Total" description="Historico completo do cliente." />
          <SummarySurface value={`${draftQuotes.length}`} label="Rascunhos" description="Prontos para revisar ou completar." />
          <SummarySurface value={`${submittedQuotes.length + inReviewQuotes.length}`} label="Acompanhamento" description="Ja enviados e aguardando retorno." />
          <SummarySurface value={`${respondedQuotes.length}`} label="Respondidos" description="Solicitacoes encerradas no painel." />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-5">
          <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/92 p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Novo orcamento</p>
                <h3 className="mt-1 text-xl font-semibold text-foreground">Adicionar foto do pedido</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Use a camera do aparelho ou a galeria para criar um novo rascunho sem trocar de tela.
                </p>
              </div>
              <div className="hidden rounded-2xl bg-primary/10 p-3 text-primary sm:flex">
                <ScanText className="h-5 w-5" />
              </div>
            </div>

            <QuoteDocumentCaptureCard
              title="Foto do pedido"
              description="Tire uma foto simples ou escolha uma imagem. O sistema monta um rascunho editavel."
              helper="Use boa luz e mantenha a lista legivel."
              processing={createDraftPending}
              buttonLabel="Criar rascunho"
              onSelectFile={onCaptureDocument}
            />
          </section>

          <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/92 p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Fila</p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">Seus orcamentos</h3>
              </div>
              <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{quotes.length} total</div>
            </div>

            {quotesLoading ? (
              <p className="text-sm text-muted-foreground">Carregando orcamentos...</p>
            ) : quotes.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
                <Camera className="mx-auto h-6 w-6 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">Nenhum orcamento ainda. Capture o primeiro documento acima.</p>
              </div>
            ) : (
              <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                {quotes.map((quote) => (
                  <button
                    key={quote.id}
                    type="button"
                    onClick={() => onSelectQuote(quote.id)}
                    className={`w-full rounded-[1.25rem] border px-4 py-3 text-left transition-all ${
                      selectedQuote?.id === quote.id
                        ? 'border-primary/30 bg-[linear-gradient(135deg,rgba(239,246,255,0.96),rgba(255,252,237,0.9))] shadow-[0_20px_50px_-40px_rgba(37,99,235,0.45)]'
                        : 'border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">{buildQuoteDisplayTitle(quote)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {quote.itemCount} item(ns) · {formatQuoteTimestamp(quote.updatedAt || quote.createdAt)}
                        </p>
                      </div>
                      <QuoteStatusBadge status={quote.status} />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          {!selectedQuote ? (
            <section className="rounded-[1.75rem] border border-dashed border-slate-200 bg-white/90 px-5 py-16 text-center shadow-sm">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">Selecione um orcamento</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Capture um novo documento ou abra um item da fila para continuar o trabalho.
              </p>
            </section>
          ) : (
            <>
              <section ref={editorCardRef} className="rounded-[1.75rem] border border-slate-200/70 bg-white/92 p-5 shadow-sm">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                      {selectedQuote.referenceCode}
                    </p>
                    <h3 className="truncate text-2xl font-semibold tracking-tight text-foreground">
                      {buildQuoteDisplayTitle(selectedQuote)}
                    </h3>
                    <p className="text-sm leading-6 text-muted-foreground">{getQuoteStatusDescription(selectedQuote.status)}</p>
                  </div>
                  <QuoteStatusBadge status={selectedQuote.status} />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <InfoPanel label="Origem" value={buildQuoteSourceLabel(selectedQuote.source)} />
                  <InfoPanel label="Atualizacao" value={formatQuoteTimestamp(selectedQuote.updatedAt || selectedQuote.createdAt)} />
                  <InfoPanel label="Itens" value={`${selectedQuote.itemCount} item(ns)`} />
                </div>

                {selectedQuote.customerNote ? (
                  <div className="mt-4 rounded-[1.35rem] border border-slate-200/70 bg-slate-50/80 p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Observacao do cliente</p>
                    <p className="mt-2 text-sm leading-6 text-foreground">{selectedQuote.customerNote}</p>
                  </div>
                ) : null}
              </section>

              {selectedQuote.status === 'DRAFT' ? (
                <>
                  <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/92 p-5 shadow-sm">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Edicao</p>
                        <h3 className="mt-1 text-xl font-semibold text-foreground">Ajustar rascunho</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Revise apenas o necessario antes de enviar para a equipe.
                        </p>
                      </div>
                      <div className="hidden rounded-2xl bg-slate-100 p-3 text-slate-600 sm:flex">
                        <FileText className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="qt">Titulo</Label>
                        <Input
                          id="qt"
                          value={editorState.title}
                          onChange={(e) => setEditorState((state) => ({ ...state, title: e.target.value }))}
                          placeholder="Ex.: Materiais para reforma"
                          className="mt-1.5 rounded-xl border-slate-200/80 bg-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="qref">Referencia</Label>
                        <Input id="qref" value={selectedQuote.referenceCode} disabled className="mt-1.5 rounded-xl border-slate-200/80 bg-slate-50" />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label htmlFor="qn">Observacoes</Label>
                      <Textarea
                        id="qn"
                        rows={3}
                        value={editorState.customerNote}
                        onChange={(e) => setEditorState((state) => ({ ...state, customerNote: e.target.value }))}
                        placeholder="Entrega, urgencia, marcas ou qualquer detalhe extra."
                        className="mt-1.5 rounded-xl border-slate-200/80 bg-white"
                      />
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Itens</p>
                        <p className="text-xs text-muted-foreground">{editableItemCount} item(ns) preenchido(s)</p>
                      </div>

                      {editorState.items.map((item, idx) => (
                        <div key={`${item.id || 'n'}-${idx}`} className="rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3">
                          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_88px_88px_auto]">
                            <Input
                              value={item.name}
                              onChange={(e) =>
                                setEditorState((state) => ({
                                  ...state,
                                  items: state.items.map((candidate, itemIndex) =>
                                    itemIndex === idx ? { ...candidate, name: e.target.value } : candidate
                                  ),
                                }))
                              }
                              placeholder="Item"
                              className="rounded-xl border-slate-200/80 bg-white"
                            />
                            <Input
                              inputMode="decimal"
                              value={item.quantity}
                              onChange={(e) =>
                                setEditorState((state) => ({
                                  ...state,
                                  items: state.items.map((candidate, itemIndex) =>
                                    itemIndex === idx
                                      ? { ...candidate, quantity: Number(e.target.value.replace(',', '.')) || 1 }
                                      : candidate
                                  ),
                                }))
                              }
                              placeholder="Qtd"
                              className="rounded-xl border-slate-200/80 bg-white"
                            />
                            <Input
                              value={item.unit || ''}
                              onChange={(e) =>
                                setEditorState((state) => ({
                                  ...state,
                                  items: state.items.map((candidate, itemIndex) =>
                                    itemIndex === idx ? { ...candidate, unit: e.target.value } : candidate
                                  ),
                                }))
                              }
                              placeholder="un"
                              className="rounded-xl border-slate-200/80 bg-white"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() =>
                                setEditorState((state) => ({
                                  ...state,
                                  items: state.items.length === 1 ? [{ ...EMPTY_ITEM }] : state.items.filter((_, itemIndex) => itemIndex !== idx),
                                }))
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="gap-1.5 rounded-full border-slate-200/80 bg-white/90"
                        onClick={() => setEditorState((state) => ({ ...state, items: [...state.items, { ...EMPTY_ITEM }] }))}
                      >
                        <Plus className="h-3.5 w-3.5" /> Adicionar item
                      </Button>
                      <p className="text-xs text-muted-foreground">Itens vazios nao entram no envio.</p>
                    </div>

                    {selectedQuote.ocrText ? (
                      <div className="mt-4 rounded-[1.35rem] border border-slate-200/70 bg-slate-50/80 p-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Texto reconhecido</p>
                        <p className="mt-2 max-h-36 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                          {selectedQuote.ocrText}
                        </p>
                      </div>
                    ) : null}
                  </section>

                  <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/92 p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Acao final</p>
                        <h3 className="mt-1 text-lg font-semibold text-foreground">Salvar ou enviar para a loja</h3>
                        <p className="mt-2 text-sm leading-6 text-muted-foreground">
                          Quando o rascunho estiver correto, envie. O lojista so recebe a solicitacao operacional depois disso.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" disabled={saveDraftPending || editableItemCount === 0} className="rounded-full" onClick={() => void onSaveDraft()}>
                          {saveDraftPending ? 'Salvando...' : 'Salvar rascunho'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 rounded-full border-slate-200/80 bg-white/90"
                          disabled={saveDraftPending || submitPending || editableItemCount === 0}
                          onClick={() => void onSaveAndSend()}
                        >
                          {submitPending ? 'Enviando...' : 'Enviar para a loja'}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </section>
                </>
              ) : (
                <section className="rounded-[1.75rem] border border-slate-200/70 bg-white/92 p-5 shadow-sm">
                  <div className="mb-4">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Detalhes</p>
                    <h3 className="mt-1 text-xl font-semibold text-foreground">Orcamento em acompanhamento</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Esse item ja saiu da fase de edicao e agora fica apenas para consulta.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {selectedQuote.items.map((item) => (
                      <div key={item.id} className="rounded-[1.25rem] border border-slate-200/70 bg-slate-50/80 px-4 py-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{item.name}</p>
                            {item.notes ? <p className="mt-1 text-sm text-muted-foreground">{item.notes}</p> : null}
                          </div>
                          <div className="shrink-0 text-sm font-medium text-muted-foreground">
                            {item.quantity} {item.unit || 'un'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedQuote.ocrText ? (
                    <div className="mt-4 rounded-[1.35rem] border border-slate-200/70 bg-slate-50/80 p-4">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Texto reconhecido</p>
                      <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {selectedQuote.ocrText}
                      </p>
                    </div>
                  ) : null}
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SummarySurface({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200/70 bg-slate-50/80 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
    </div>
  );
}

function InfoPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200/70 bg-slate-50/80 p-4">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
