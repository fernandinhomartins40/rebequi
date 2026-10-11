import { DashboardInfo } from '@/components/dashboard/DashboardList';
import { Link } from "react-router-dom";
import {
  DashboardHeading,
  DashboardSteps,
  DashboardHelp,
} from "@/components/dashboard/DashboardElements";
import {
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import { ArrowRight, Camera, FileText, Plus, Trash2 } from "lucide-react";
import {
  LiveDocumentScanner,
  type ScannedDocument,
} from "@/components/LiveDocumentScanner";
import { QuoteStatusBadge } from "@/components/QuoteStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  buildQuoteDisplayTitle,
  buildQuoteSourceLabel,
  formatQuoteTimestamp,
  getQuoteOcrStatusDescription,
  getQuoteOcrStatusLabel,
  getQuoteStatusDescription,
} from "@/lib/quote-ui";
import type { QuoteItemInputDTO, QuoteRequest } from "@/types";

type EditableQuoteItem = QuoteItemInputDTO & { id?: string };
type DraftEditorState = {
  title: string;
  customerNote: string;
  items: EditableQuoteItem[];
};

const EMPTY_ITEM: EditableQuoteItem = {
  name: "",
  quantity: 1,
  unit: "",
  notes: "",
};

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
  onCaptureDocument: (selection: ScannedDocument) => Promise<void>;
  onSelectQuote: (id: string) => void;
  onSaveDraft: () => Promise<unknown>;
  onSaveAndSend: () => Promise<unknown>;
}) {
  const editableItemCount = editorState.items.filter((item) =>
    item.name.trim(),
  ).length;
  const [scannerOpen, setScannerOpen] = useState(false);

  if (scannerOpen) {
    return (
      <LiveDocumentScanner
        onCapture={(doc) => {
          setScannerOpen(false);
          void onCaptureDocument(doc);
        }}
        onCancel={() => setScannerOpen(false)}
      />
    );
  }

  return (
    <div className="animate-fade-in-up space-y-5">
      <DashboardHeading
        title="Seus orçamentos"
        actions={
          <Button asChild>
            <Link to="/pedido">Nova lista</Link>
          </Button>
        }
      />
      <DashboardSteps
        activeStep={
          selectedQuote ? (selectedQuote.status === "DRAFT" ? 1 : 2) : 0
        }
        steps={[
          { title: "Criar lista", href: "/pedido" },
          {
            title: "Conferir itens",
            href: !selectedQuote ? "/pedido" : undefined,
            onClick: () =>
              editorCardRef.current?.scrollIntoView({
                block: "start",
                behavior: "smooth",
              }),
          },
          {
            title: "Enviar à loja",
            href: !selectedQuote ? "/pedido" : undefined,
            onClick: () =>
              editorCardRef.current?.scrollIntoView({
                block: "start",
                behavior: "smooth",
              }),
          },
        ]}
      />
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        {/* Coluna esquerda: captura + lista */}
        <div className="space-y-5">
          {/* Captura */}
          <section className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Novo orçamento
              </p>
              <h3 className="mt-1 text-base font-semibold text-foreground">
                Tire uma foto da sua lista
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Fotografe ou escolha uma imagem — montamos o rascunho para você
                revisar.
              </p>
            </div>

            <Button
              type="button"
              size="lg"
              className="h-14 w-full gap-2 text-base font-semibold"
              onClick={() => setScannerOpen(true)}
              disabled={createDraftPending}
            >
              <Camera className="h-5 w-5" />
              {createDraftPending ? "Enviando…" : "Fotografar minha lista"}
            </Button>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              A câmera captura sozinha quando a lista estiver enquadrada.
            </p>
          </section>

          {/* Lista de orçamentos */}
          <section className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Histórico
                </p>
                <h3 className="mt-1 text-lg font-semibold text-foreground">
                  Todos os orçamentos
                </h3>
              </div>
              <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                {quotes.length} total
              </div>
            </div>

            {quotesLoading ? (
              <p className="text-sm text-muted-foreground">
                Carregando orçamentos...
              </p>
            ) : quotes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-10 text-center">
                <Camera className="mx-auto h-6 w-6 text-muted-foreground/40" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Nenhum orçamento ainda. Capture o primeiro documento acima.
                </p>
              </div>
            ) : (
              <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                {quotes.map((quote) => (
                  <button
                    key={quote.id}
                    type="button"
                    aria-pressed={selectedQuote?.id === quote.id}
                    onClick={() => onSelectQuote(quote.id)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                      selectedQuote?.id === quote.id
                        ? "border-primary/30 bg-blue-50/60 shadow-sm"
                        : "border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {buildQuoteDisplayTitle(quote)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {quote.itemCount} item(ns) ·{" "}
                          {getQuoteOcrStatusLabel(quote.ocrStatus)}
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

        {/* Coluna direita: detalhe / editor */}
        <div className="space-y-5">
          {!selectedQuote ? (
            <section className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-16 text-center shadow-sm">
              <FileText className="mx-auto h-8 w-8 text-muted-foreground/40" />
              <h3 className="mt-4 text-lg font-semibold text-foreground">
                Selecione um orçamento
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Capture um novo documento ou escolha um item da lista para
                continuar.
              </p>
            </section>
          ) : (
            <>
              {/* Cabeçalho do orçamento selecionado */}
              <section
                ref={editorCardRef}
                className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {selectedQuote.referenceCode}
                    </p>
                    <h3 className="truncate text-xl font-semibold tracking-tight text-foreground">
                      {buildQuoteDisplayTitle(selectedQuote)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {getQuoteStatusDescription(selectedQuote.status)}
                    </p>
                  </div>
                  <QuoteStatusBadge status={selectedQuote.status} />
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <InfoPanel
                    label="Origem"
                    value={buildQuoteSourceLabel(selectedQuote.source)}
                  />
                  <InfoPanel
                    label="Leitura"
                    value={getQuoteOcrStatusLabel(selectedQuote.ocrStatus)}
                  />
                  <InfoPanel
                    label="Atualização"
                    value={formatQuoteTimestamp(
                      selectedQuote.updatedAt || selectedQuote.createdAt,
                    )}
                  />
                </div>

                {selectedQuote.status === "DRAFT" ? (
                  <div
                    className={`mt-4 rounded-xl border p-4 ${
                      selectedQuote.ocrStatus === "FAILED"
                        ? "border-amber-200 bg-amber-50/80"
                        : selectedQuote.ocrStatus === "COMPLETED"
                          ? "border-emerald-200 bg-emerald-50/80"
                          : "border-sky-200 bg-sky-50/80"
                    }`}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {getQuoteOcrStatusLabel(selectedQuote.ocrStatus)}
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {getQuoteOcrStatusDescription(selectedQuote.ocrStatus)}
                    </p>
                    {selectedQuote.ocrError ? (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {selectedQuote.ocrError}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {selectedQuote.customerNote ? (
                  <div className="mt-4 rounded-xl border border-slate-200/70 bg-slate-50/80 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Observação
                    </p>
                    <p className="mt-2 text-sm text-foreground">
                      {selectedQuote.customerNote}
                    </p>
                  </div>
                ) : null}
              </section>

              {selectedQuote.status === "DRAFT" ? (
                <>
                  {/* Editor do rascunho */}
                  <section className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Edição
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-foreground">
                          Revisar rascunho
                        </h3>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          Confira os itens e corrija o que for necessário antes
                          de enviar.
                        </p>
                      </div>
                      <div className="hidden rounded-xl bg-slate-100 p-3 text-slate-600 sm:flex">
                        <FileText className="h-5 w-5" />
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="qt">Título</Label>
                        <Input
                          id="qt"
                          value={editorState.title}
                          onChange={(e) =>
                            setEditorState((state) => ({
                              ...state,
                              title: e.target.value,
                            }))
                          }
                          placeholder="Ex.: Materiais para reforma"
                          className="mt-1.5 rounded-lg border-slate-200/80 bg-white"
                        />
                      </div>
                      <div>
                        <Label htmlFor="qref">Referência</Label>
                        <Input
                          id="qref"
                          value={selectedQuote.referenceCode}
                          disabled
                          className="mt-1.5 rounded-lg border-slate-200/80 bg-slate-50"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <Label htmlFor="qn">Observações</Label>
                      <Textarea
                        id="qn"
                        rows={3}
                        value={editorState.customerNote}
                        onChange={(e) =>
                          setEditorState((state) => ({
                            ...state,
                            customerNote: e.target.value,
                          }))
                        }
                        placeholder="Entrega, urgência, marcas ou qualquer detalhe extra."
                        className="mt-1.5 rounded-lg border-slate-200/80 bg-white"
                      />
                    </div>

                    <div className="mt-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Itens
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {editableItemCount} item(ns) preenchido(s)
                        </p>
                      </div>

                      {editorState.items.map((item, idx) => (
                        <div
                          key={`${item.id || "n"}-${idx}`}
                          className="rounded-lg border border-slate-200/70 bg-slate-50/80 p-3"
                        >
                          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_88px_88px_auto]">
                            <Input
                              value={item.name}
                              onChange={(e) =>
                                setEditorState((state) => ({
                                  ...state,
                                  items: state.items.map(
                                    (candidate, itemIndex) =>
                                      itemIndex === idx
                                        ? { ...candidate, name: e.target.value, productId: null }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder="Item"
                              className="rounded-lg border-slate-200/80 bg-white"
                            />
                            <Input
                              inputMode="decimal"
                              value={item.quantity}
                              onChange={(e) =>
                                setEditorState((state) => ({
                                  ...state,
                                  items: state.items.map(
                                    (candidate, itemIndex) =>
                                      itemIndex === idx
                                        ? {
                                            ...candidate,
                                            quantity:
                                              Number(
                                                e.target.value.replace(
                                                  ",",
                                                  ".",
                                                ),
                                              ) || 1,
                                          }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder="Qtd"
                              className="rounded-lg border-slate-200/80 bg-white"
                            />
                            <Input
                              value={item.unit || ""}
                              onChange={(e) =>
                                setEditorState((state) => ({
                                  ...state,
                                  items: state.items.map(
                                    (candidate, itemIndex) =>
                                      itemIndex === idx
                                        ? { ...candidate, unit: e.target.value }
                                        : candidate,
                                  ),
                                }))
                              }
                              placeholder="un"
                              className="rounded-lg border-slate-200/80 bg-white"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="rounded-lg text-red-500 hover:bg-red-50 hover:text-red-600"
                              onClick={() =>
                                setEditorState((state) => ({
                                  ...state,
                                  items:
                                    state.items.length === 1
                                      ? [{ ...EMPTY_ITEM }]
                                      : state.items.filter(
                                          (_, itemIndex) => itemIndex !== idx,
                                        ),
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
                        className="gap-1.5 border-slate-200/80 bg-white"
                        onClick={() =>
                          setEditorState((state) => ({
                            ...state,
                            items: [...state.items, { ...EMPTY_ITEM }],
                          }))
                        }
                      >
                        <Plus className="h-3.5 w-3.5" /> Adicionar item
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Itens vazios não entram no envio.
                      </p>
                    </div>

                    {selectedQuote.ocrText ? (
                      <div className="mt-4 rounded-lg border border-slate-200/70 bg-slate-50/80 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Texto do documento original
                        </p>
                        <p className="mt-2 max-h-36 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">
                          {selectedQuote.ocrText}
                        </p>
                      </div>
                    ) : null}
                  </section>

                  {/* Ação de envio */}
                  <section className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Envio
                        </p>
                        <h3 className="mt-1 text-lg font-semibold text-foreground">
                          Salvar ou enviar para a loja
                        </h3>
                        <p className="mt-1.5 text-sm text-muted-foreground">
                          Quando o rascunho estiver correto, envie para que a
                          loja processe o seu pedido.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={saveDraftPending || editableItemCount === 0}
                          onClick={() => void onSaveDraft()}
                        >
                          {saveDraftPending ? "Salvando..." : "Salvar rascunho"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 border-slate-200/80 bg-white"
                          disabled={
                            saveDraftPending ||
                            submitPending ||
                            editableItemCount === 0
                          }
                          onClick={() => void onSaveAndSend()}
                        >
                          {submitPending ? "Enviando..." : "Enviar para a loja"}
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </section>
                </>
              ) : (
                /* Orçamento enviado — somente leitura */
                <section className="rounded-xl border border-slate-200/70 bg-white p-5 shadow-sm">
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Detalhes
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-foreground">
                      Orçamento enviado
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      Este orçamento já foi enviado e está aguardando resposta
                      da loja.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {selectedQuote.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-slate-200/70 bg-slate-50/80 px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">
                              {item.name}
                            </p>
                            {item.notes ? (
                              <p className="mt-1 text-sm text-muted-foreground">
                                {item.notes}
                              </p>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-sm font-medium text-muted-foreground">
                            {item.quantity} {item.unit || "un"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedQuote.ocrText ? (
                    <div className="mt-4 rounded-lg border border-slate-200/70 bg-slate-50/80 p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Texto do documento original
                      </p>
                      <p className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">
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

function InfoPanel({ label, value }: { label: string; value: string }) {
  return <DashboardInfo label={label} value={value} />;
}

