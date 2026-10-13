import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { linkExternalProductSchema, previewProductImportSchema, revokeExternalProductLinkSchema, type PreviewProductImportInput } from '@rebequi/shared/schemas';
import { apiFetch } from '@/services/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PartnerSteps } from '@/pages/partners/steps';

type PreviewRow = { row: number; externalId: string; sku: string; localProductId: string | null; conflicts: string[]; status: string };
type Preview = { source: string; rows: PreviewRow[]; summary: { total: number; conflicts: number; readyForReview: number }; applied: false };
type ProductLink = { id: string; source: string; externalId: string; revokedAt: string | null; product: { sku: string | null; name: string } };
const conflictNames: Record<string, string> = {
  DUPLICATE_EXTERNAL_ID: 'ID externo repetido', DUPLICATE_SKU: 'SKU repetido no arquivo',
  SKU_ALREADY_LOCAL: 'SKU já cadastrado', CATEGORY_NOT_FOUND: 'Categoria não encontrada',
  LINK_SKU_MISMATCH: 'Vínculo existente com outro SKU',
  PRODUCT_LINKED_TO_OTHER_ID: 'Produto já vinculado a outro ID desta origem',
  SKU_ARCHIVED_LOCAL: 'SKU pertence a um produto arquivado na loja',
};
const endpoint = '/integrations/external-api/imports/products';

export function ProductImportPanel() {
  const queryClient = useQueryClient();
  const [source, setSource] = useState(''); const [fileName, setFileName] = useState('');
  const [rows, setRows] = useState<PreviewProductImportInput['rows']>([]);
  const [step, setStep] = useState(1); const [error, setError] = useState('');
  const [selected, setSelected] = useState<PreviewRow | null>(null);
  const [linkedId, setLinkedId] = useState('');
  const [linkPage, setLinkPage] = useState(1); const [revoking, setRevoking] = useState<string | null>(null); const [revokeReason, setRevokeReason] = useState('');
  const links = useQuery({ queryKey: ['external-product-links', linkPage], retry: false,
    queryFn: async () => (await apiFetch<{ data: { links: ProductLink[]; totalPages: number } }>(`${endpoint}/links?page=${linkPage}`)).data });
  const intent = useRef<{ fingerprint: string; key: string }>();
  const preview = useMutation({ mutationFn: async (input: PreviewProductImportInput) =>
    (await apiFetch<{ data: Preview }>(`${endpoint}/preview`, { method: 'POST', body: JSON.stringify(input) })).data,
    onSuccess: () => { setStep(2); setError(''); }, onError: failure => setError(failure.message) });
  const link = useMutation({ mutationFn: async (row: PreviewRow) => {
    const fingerprint = JSON.stringify({ source, externalId: row.externalId, productId: row.localProductId, expectedSku: row.sku });
    if (intent.current?.fingerprint !== fingerprint) intent.current = { fingerprint, key: crypto.randomUUID() };
    const input = linkExternalProductSchema.parse({ requestKey: intent.current.key, source, externalId: row.externalId,
      productId: row.localProductId, expectedSku: row.sku, confirmed: true });
    return (await apiFetch<{ data: { id: string } }>(`${endpoint}/links`, { method: 'POST', body: JSON.stringify(input) })).data;
  }, onSuccess: async result => {
    setLinkedId(result.id); setSelected(null); setStep(2);
    await queryClient.invalidateQueries({ queryKey: ['external-product-links'] });
    const parsed = previewProductImportSchema.safeParse({ source, rows });
    if (parsed.success) await preview.mutateAsync(parsed.data);
  }, onError: failure => setError(failure.message) });
  const revoke = useMutation({ mutationFn: async (id: string) => {
    const input = revokeExternalProductLinkSchema.parse({ confirmed: true, reason: revokeReason });
    return apiFetch(`${endpoint}/links/${encodeURIComponent(id)}/revoke`, { method: 'POST', body: JSON.stringify(input) });
  }, onSuccess: async () => {
    setRevoking(null); setRevokeReason(''); setLinkedId('');
    await queryClient.invalidateQueries({ queryKey: ['external-product-links'] });
    const parsed = previewProductImportSchema.safeParse({ source, rows });
    if (parsed.success) await preview.mutateAsync(parsed.data);
  }, onError: failure => setError(failure.message) });
  const chooseFile = async (file?: File) => {
    setError(''); setSelected(null); setLinkedId(''); preview.reset(); setStep(1);
    if (!file) return;
    if (file.size > 256000) { setError('O arquivo deve ter até 256 KB.'); return; }
    try {
      const value = JSON.parse(await file.text());
      if (!Array.isArray(value)) throw new Error();
      const checked = previewProductImportSchema.safeParse({ source: source || 'arquivo', rows: value });
      if (!checked.success) throw new Error();
      setRows(checked.data.rows); setFileName(file.name);
    } catch { setRows([]); setFileName(''); setError('Use um arquivo JSON com até 100 produtos e os campos exigidos.'); }
  };
  const runPreview = () => {
    const parsed = previewProductImportSchema.safeParse({ source: source.trim(), rows });
    if (!parsed.success) { setError('Confira a origem e o arquivo JSON antes de continuar.'); return; }
    setError(''); preview.mutate(parsed.data);
  };
  return <details className="rounded-xl border p-4">
    <summary className="cursor-pointer font-semibold">Conferir produtos de outro sistema</summary>
    <section aria-label="Prévia de importação de produtos" className="mt-4 space-y-4">
      <p className="text-sm text-muted-foreground">Revise os produtos antes de configurar a integração. Preços e estoque continuam sob controle da loja.</p>
      <PartnerSteps step={step} labels={['Arquivo', 'Conflitos', 'Vínculo']} />
      {step === 1 ? <div className="space-y-3">
        <div><Label htmlFor="import-source">Identificação do sistema</Label><Input id="import-source" maxLength={120} value={source} onChange={event => { setSource(event.target.value); preview.reset(); }} placeholder="Ex.: meu-pdv" /></div>
        <div><Label htmlFor="import-products-file">Arquivo de produtos (.json)</Label><Input id="import-products-file" type="file" accept="application/json,.json" onChange={event => void chooseFile(event.target.files?.[0])} /></div>
        {fileName ? <p className="text-sm">{fileName} · {rows.length} produtos</p> : null}
        <p className="text-xs text-muted-foreground">Cada produto precisa de externalId, sku, name, categoryId, priceCents e stockQuantity. Máximo de 100 por arquivo.</p>
        <Button type="button" disabled={!source.trim() || !rows.length || preview.isPending} onClick={runPreview}>{preview.isPending ? 'Conferindo…' : 'Conferir arquivo'}</Button>
      </div> : null}
      {step >= 2 && preview.data ? <div className="space-y-3">
        <p role="status" className="text-sm">{preview.data.summary.total} produtos · {preview.data.summary.conflicts} com conflito. Nenhum produto foi importado.</p>
        <ul className="max-h-96 space-y-2 overflow-auto">{preview.data.rows.map(row => <li key={row.row} className="rounded-lg border p-3 text-sm">
          <p className="font-semibold">{row.row}. {row.sku}</p><p className="break-all text-xs text-muted-foreground">ID externo: {row.externalId}</p>
          <p>{row.status === 'LINKED_REVIEW' ? 'Vínculo registrado para revisão' : row.conflicts.length ? row.conflicts.map(code => conflictNames[code] ?? 'Conflito').join(' · ') : 'Pronto para revisão'}</p>
          {row.conflicts.length === 1 && row.conflicts[0] === 'SKU_ALREADY_LOCAL' && row.localProductId ? <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => { setSelected(row); setStep(3); setError(''); }}>Conferir vínculo</Button> : null}
        </li>)}</ul>
        <Button type="button" variant="outline" onClick={() => { setStep(1); setSelected(null); }}>Trocar arquivo</Button>
      </div> : null}
      {step === 3 && selected ? <div className="space-y-3 rounded-lg bg-slate-50 p-3 text-sm">
        <p>Origem {source}: {selected.externalId} → produto local {selected.sku}</p>
        <p>Registrar o vínculo apenas identifica o mesmo produto nos dois sistemas.</p>
        <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" onClick={() => { setStep(2); setSelected(null); }}>Voltar</Button><Button type="button" disabled={link.isPending} onClick={() => link.mutate(selected)}>{link.isPending ? 'Registrando…' : 'Confirmar vínculo'}</Button></div>
      </div> : null}
      {linkedId ? <p role="status" className="text-sm text-green-800">Vínculo registrado. Confira os demais conflitos antes de importar.</p> : null}
      <details className="rounded-lg border p-3"><summary className="cursor-pointer font-medium">Vínculos registrados</summary>
        {links.isLoading ? <p className="mt-2 text-sm">Carregando vínculos…</p> : links.isError ? <p role="alert" className="mt-2 text-sm text-red-700">{links.error.message}</p> : !links.data?.links.length ? <p className="mt-2 text-sm">Nenhum vínculo registrado.</p> : <ul className="mt-3 space-y-2">{links.data.links.map(item => <li key={item.id} className="rounded-lg border p-3 text-sm">
          <p className="break-words font-semibold">{item.product.name} · {item.product.sku ?? 'Sem SKU'}</p>
          <p className="break-all text-xs text-muted-foreground">{item.source}: {item.externalId}</p>
          {item.revokedAt ? <p className="text-xs">Revogado</p> : revoking === item.id ? <div className="mt-2 space-y-2">
            <Label htmlFor={`revoke-link-${item.id}`}>Motivo da revogação</Label><Input id={`revoke-link-${item.id}`} maxLength={300} value={revokeReason} onChange={event => setRevokeReason(event.target.value)} />
            <div className="flex flex-wrap gap-2"><Button type="button" size="sm" variant="outline" onClick={() => { setRevoking(null); setRevokeReason(''); }}>Voltar</Button><Button type="button" size="sm" variant="destructive" disabled={revokeReason.trim().length < 3 || revoke.isPending} onClick={() => revoke.mutate(item.id)}>Confirmar revogação</Button></div>
          </div> : <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => { setRevoking(item.id); setRevokeReason(''); setError(''); }}>Revogar vínculo</Button>}
        </li>)}</ul>}
        {links.data && links.data.totalPages > 1 ? <div className="mt-3 flex justify-between gap-2"><Button type="button" variant="outline" disabled={linkPage === 1} onClick={() => setLinkPage(value => value - 1)}>Anterior</Button><Button type="button" variant="outline" disabled={linkPage >= links.data.totalPages} onClick={() => setLinkPage(value => value + 1)}>Próxima</Button></div> : null}
      </details>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    </section>
  </details>;
}
