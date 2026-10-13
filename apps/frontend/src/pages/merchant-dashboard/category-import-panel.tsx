import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { linkExternalCategorySchema, previewCategoryImportSchema, revokeExternalCategoryLinkSchema, type PreviewCategoryImportInput } from '@rebequi/shared/schemas';
import { apiFetch } from '@/services/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PartnerSteps } from '@/pages/partners/steps';

type Row = { row: number; externalId: string; slug: string; localCategoryId: string | null; conflicts: string[]; status: string };
type Preview = { rows: Row[]; summary: { total: number; conflicts: number }; applied: false };
type Link = { id: string; source: string; externalId: string; revokedAt: string | null; category: { id: string; name: string; slug: string } };
const endpoint = '/integrations/external-api/imports/categories';
const conflicts: Record<string, string> = { DUPLICATE_EXTERNAL_ID: 'ID externo repetido', DUPLICATE_SLUG: 'Endereço repetido no arquivo',
  SLUG_NAME_COLLISION: 'Nome e endereço pertencem a categorias diferentes', CATEGORY_INACTIVE: 'Categoria local inativa',
  LINK_SLUG_MISMATCH: 'Vínculo existente com outro endereço', CATEGORY_LINKED_TO_OTHER_ID: 'Categoria já vinculada a outro ID',
  SLUG_ALREADY_LOCAL: 'Categoria já cadastrada', NAME_ALREADY_LOCAL: 'Nome já cadastrado com outro endereço' };

export function CategoryImportPanel() {
  const client = useQueryClient(); const [source, setSource] = useState(''); const [rows, setRows] = useState<PreviewCategoryImportInput['rows']>([]);
  const [fileName, setFileName] = useState(''); const [step, setStep] = useState(1); const [error, setError] = useState('');
  const [selected, setSelected] = useState<Row | null>(null); const [linkedId, setLinkedId] = useState('');
  const [page, setPage] = useState(1); const [revoking, setRevoking] = useState(''); const [reason, setReason] = useState('');
  const intent = useRef<{ fingerprint: string; key: string }>();
  const links = useQuery({ queryKey: ['external-category-links', page], retry: false,
    queryFn: async () => (await apiFetch<{ data: { links: Link[]; totalPages: number } }>(`${endpoint}/links?page=${page}`)).data });
  const preview = useMutation({ mutationFn: async (input: PreviewCategoryImportInput) =>
    (await apiFetch<{ data: Preview }>(`${endpoint}/preview`, { method: 'POST', body: JSON.stringify(input) })).data,
    onSuccess: () => { setStep(2); setError(''); }, onError: failure => setError(failure.message) });
  const link = useMutation({ mutationFn: async (row: Row) => {
    const fingerprint = JSON.stringify({ source, externalId: row.externalId, categoryId: row.localCategoryId, expectedSlug: row.slug });
    if (intent.current?.fingerprint !== fingerprint) intent.current = { fingerprint, key: crypto.randomUUID() };
    const input = linkExternalCategorySchema.parse({ requestKey: intent.current.key, source, externalId: row.externalId,
      categoryId: row.localCategoryId, expectedSlug: row.slug, confirmed: true });
    return (await apiFetch<{ data: { id: string } }>(`${endpoint}/links`, { method: 'POST', body: JSON.stringify(input) })).data;
  }, onSuccess: async result => { setLinkedId(result.id); setSelected(null); setStep(2);
    await client.invalidateQueries({ queryKey: ['external-category-links'] });
    const input = previewCategoryImportSchema.safeParse({ source, rows }); if (input.success) await preview.mutateAsync(input.data);
  }, onError: failure => setError(failure.message) });
  const revoke = useMutation({ mutationFn: async (id: string) => {
    const input = revokeExternalCategoryLinkSchema.parse({ confirmed: true, reason });
    return apiFetch(`${endpoint}/links/${encodeURIComponent(id)}/revoke`, { method: 'POST', body: JSON.stringify(input) });
  }, onSuccess: async () => { setRevoking(''); setReason(''); setLinkedId(''); await client.invalidateQueries({ queryKey: ['external-category-links'] });
    const input = previewCategoryImportSchema.safeParse({ source, rows }); if (input.success) await preview.mutateAsync(input.data);
  }, onError: failure => setError(failure.message) });
  const chooseFile = async (file?: File) => { setError(''); setSelected(null); setLinkedId(''); preview.reset(); setStep(1);
    if (!file) return; if (file.size > 256000) { setError('O arquivo deve ter até 256 KB.'); return; }
    try { const value = JSON.parse(await file.text()); if (!Array.isArray(value)) throw new Error();
      const parsed = previewCategoryImportSchema.parse({ source: source || 'arquivo', rows: value }); setRows(parsed.rows); setFileName(file.name);
    } catch { setRows([]); setFileName(''); setError('Use JSON com até 100 categorias: externalId, name e slug.'); }
  };
  const runPreview = () => { const input = previewCategoryImportSchema.safeParse({ source: source.trim(), rows });
    if (!input.success) { setError('Confira a origem e o arquivo.'); return; } setError(''); preview.mutate(input.data); };
  return <details className="rounded-xl border p-4"><summary className="cursor-pointer font-semibold">Conferir categorias de outro sistema</summary>
    <section aria-label="Prévia de categorias externas" className="mt-4 space-y-4"><PartnerSteps step={step} labels={['Arquivo', 'Conflitos', 'Vínculo']} />
      {step === 1 ? <div className="space-y-3"><div><Label htmlFor="category-import-source">Identificação do sistema</Label><Input id="category-import-source" maxLength={120} value={source} onChange={event => { setSource(event.target.value); preview.reset(); }} placeholder="Ex.: meu-pdv" /></div>
        <div><Label htmlFor="category-import-file">Arquivo de categorias (.json)</Label><Input id="category-import-file" type="file" accept="application/json,.json" onChange={event => void chooseFile(event.target.files?.[0])} /></div>
        {fileName ? <p className="text-xs">{fileName} · {rows.length} categorias</p> : null}<Button type="button" disabled={!source.trim() || !rows.length || preview.isPending} onClick={runPreview}>Conferir categorias</Button></div> : null}
      {step >= 2 && preview.data ? <div className="space-y-3"><p role="status" className="text-sm">{preview.data.summary.total} categorias · {preview.data.summary.conflicts} com conflito. Nenhuma categoria foi importada.</p>
        <ul className="max-h-80 space-y-2 overflow-auto">{preview.data.rows.map(row => <li key={row.row} className="rounded-lg border p-3 text-sm"><p className="break-all font-semibold">{row.row}. {row.slug}</p><p className="break-all text-xs">ID externo: {row.externalId}{row.localCategoryId ? ` · ID local: ${row.localCategoryId}` : ''}</p>
          <p>{row.status === 'LINKED_REVIEW' ? 'Vínculo registrado para revisão' : row.conflicts.length ? row.conflicts.map(code => conflicts[code] ?? 'Conflito').join(' · ') : 'Pronta para revisão'}</p>
          {row.conflicts.length === 1 && row.conflicts[0] === 'SLUG_ALREADY_LOCAL' && row.localCategoryId ? <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => { setSelected(row); setStep(3); }}>Conferir vínculo da categoria</Button> : null}</li>)}</ul>
        <Button type="button" variant="outline" onClick={() => { setStep(1); setSelected(null); }}>Trocar arquivo</Button></div> : null}
      {step === 3 && selected ? <div className="space-y-2 rounded-lg bg-slate-50 p-3 text-sm"><p>{selected.externalId} → {selected.slug}. O vínculo identifica a mesma categoria nos dois sistemas.</p>
        <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => { setStep(2); setSelected(null); }}>Voltar</Button><Button type="button" disabled={link.isPending} onClick={() => link.mutate(selected)}>Confirmar vínculo da categoria</Button></div></div> : null}
      {linkedId ? <p role="status" className="text-sm text-green-800">Vínculo de categoria registrado.</p> : null}
      <details className="rounded-lg border p-3"><summary className="cursor-pointer font-medium">Categorias vinculadas</summary>
        {links.isLoading ? <p className="mt-2 text-sm">Carregando vínculos…</p> : links.isError ? <p role="alert" className="mt-2 text-sm text-red-700">{links.error.message}</p> : !links.data?.links.length ? <p className="mt-2 text-sm">Nenhum vínculo registrado.</p> : <ul className="mt-3 space-y-2">{links.data.links.map(item => <li key={item.id} className="rounded-lg border p-3 text-sm"><p className="font-semibold">{item.category.name} · {item.category.slug}</p><p className="break-all text-xs">{item.source}: {item.externalId} · ID local: {item.category.id}</p>
          {item.revokedAt ? <p className="text-xs">Revogado</p> : revoking === item.id ? <div className="mt-2 space-y-2"><Label htmlFor={`category-revoke-${item.id}`}>Motivo</Label><Input id={`category-revoke-${item.id}`} maxLength={300} value={reason} onChange={event => setReason(event.target.value)} /><div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => setRevoking('')}>Voltar</Button><Button type="button" size="sm" variant="destructive" disabled={reason.trim().length < 3 || revoke.isPending} onClick={() => revoke.mutate(item.id)}>Confirmar revogação</Button></div></div> : <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => { setRevoking(item.id); setReason(''); }}>Revogar vínculo</Button>}</li>)}</ul>}
        {links.data && links.data.totalPages > 1 ? <div className="mt-3 flex justify-between gap-2"><Button type="button" variant="outline" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</Button><Button type="button" variant="outline" disabled={page >= links.data.totalPages} onClick={() => setPage(value => value + 1)}>Próxima</Button></div> : null}</details>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    </section></details>;
}
