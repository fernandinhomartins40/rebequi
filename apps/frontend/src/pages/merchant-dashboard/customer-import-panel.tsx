import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { linkExternalCustomerSchema, previewCustomerImportSchema, stageCustomerImportSchema, revokeExternalCustomerLinkSchema, type PreviewCustomerImportInput } from '@rebequi/shared/schemas';
import { apiFetch } from '@/services/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type PreviewRow = { row: number; externalId: string; localCustomerId: string | null; conflicts: string[]; status: string };
type Preview = { rows: PreviewRow[];
  summary: { total: number; conflicts: number }; applied: false };
type Link = { id: string; source: string; externalId: string; customerId: string; revokedAt: string | null };
type Batch = { id: string; source: string; createdAt: string; summary: { total: number; conflicts: number } };
type BatchDetail = { id: string; source: string; savedPreview: Preview; currentPreview: Preview; changedRows: number[]; applied: false };
const endpoint = '/integrations/external-api/imports/customers';
const conflictNames: Record<string, string> = {
  DUPLICATE_EXTERNAL_ID: 'ID externo repetido', DUPLICATE_EMAIL: 'E-mail repetido no arquivo',
  DUPLICATE_WHATSAPP: 'WhatsApp repetido no arquivo', IDENTITY_COLLISION: 'E-mail e WhatsApp pertencem a contas diferentes',
  USER_ROLE_CONFLICT: 'Identificador pertence a colaborador', LOCAL_CUSTOMER_EXISTS: 'Cliente já existe na loja',
  CUSTOMER_INACTIVE: 'Conta de cliente inativa',
  LINK_IDENTITY_MISMATCH: 'O vínculo registrado não corresponde aos contatos atuais',
  CUSTOMER_LINKED_TO_OTHER_ID: 'Cliente já vinculado a outro ID nesta origem',
};

export function CustomerImportPanel() {
  const client = useQueryClient();
  const [source, setSource] = useState('');
  const [rows, setRows] = useState<PreviewCustomerImportInput['rows']>([]);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<PreviewRow | null>(null);
  const [linking, setLinking] = useState(false);
  const [linked, setLinked] = useState(false);
  const [page, setPage] = useState(1);
  const [revoking, setRevoking] = useState('');
  const [reason, setReason] = useState('');
  const intent = useRef<{ fingerprint: string; key: string }>();
  const stageIntent = useRef<{ fingerprint: string; key: string }>();
  const [staging, setStaging] = useState(false);
  const [staged, setStaged] = useState('');
  const [batchPage, setBatchPage] = useState(1);
  const [batchDetail, setBatchDetail] = useState<BatchDetail | null>(null);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const links = useQuery({ queryKey: ['external-customer-links', page], retry: false,
    queryFn: async () => (await apiFetch<{ data: { links: Link[]; totalPages: number } }>(`${endpoint}/links?page=${page}`)).data });
  const batches = useQuery({ queryKey: ['external-customer-batches', batchPage], retry: false,
    queryFn: async () => (await apiFetch<{ data: { batches: Batch[]; totalPages: number } }>(`${endpoint}/batches?page=${batchPage}`)).data });
  const chooseFile = async (file?: File) => {
    setRows([]); setFileName(''); setPreview(null); setSelected(null); setLinked(false); setStaged(''); setError('');
    if (!file) return;
    if (file.size > 256000) { setError('O arquivo deve ter até 256 KB.'); return; }
    try {
      const value = JSON.parse(await file.text());
      const parsed = previewCustomerImportSchema.parse({ source: source.trim() || 'arquivo', rows: value });
      setRows(parsed.rows); setFileName(file.name);
    } catch { setError('Use um arquivo JSON com até 100 clientes e e-mail ou WhatsApp em cada linha.'); }
  };
  const runPreview = async () => {
    const input = previewCustomerImportSchema.safeParse({ source: source.trim(), rows });
    if (!input.success) { setError('Confira a origem e os clientes do arquivo.'); return; }
    setError(''); setPreview(null); setStaged(''); setPending(true);
    try {
      const result = await apiFetch<{ data: Preview }>('/integrations/external-api/imports/customers/preview', {
        method: 'POST', body: JSON.stringify(input.data),
      });
      setPreview(result.data);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível conferir o arquivo.'); }
    finally { setPending(false); }
  };
  const stage = async () => {
    if (!preview || staging) return;
    const values = { source: source.trim(), rows };
    const fingerprint = JSON.stringify(values);
    if (stageIntent.current?.fingerprint !== fingerprint) stageIntent.current = { fingerprint, key: crypto.randomUUID() };
    const input = stageCustomerImportSchema.safeParse({ ...values, requestKey: stageIntent.current.key, confirmed: true });
    if (!input.success) { setError('Confira novamente a origem e o arquivo.'); return; }
    setStaging(true); setError('');
    try {
      const result = await apiFetch<{ data: { id: string } }>(`${endpoint}/batches`, { method: 'POST', body: JSON.stringify(input.data) });
      setStaged(result.data.id); setBatchPage(1); await client.invalidateQueries({ queryKey: ['external-customer-batches'] });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível salvar o lote.'); }
    finally { setStaging(false); }
  };
  const reviewBatch = async (id: string) => {
    setLoadingBatch(true); setError(''); setBatchDetail(null);
    try { setBatchDetail((await apiFetch<{ data: BatchDetail }>(`${endpoint}/batches/${encodeURIComponent(id)}`)).data); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível rever o lote.'); }
    finally { setLoadingBatch(false); }
  };
  const createLink = async () => {
    if (!selected?.localCustomerId) return;
    const row = rows[selected.row - 1];
    if (!row || row.externalId !== selected.externalId) return;
    const fingerprint = JSON.stringify({ source, externalId: row.externalId, customerId: selected.localCustomerId,
      expectedEmail: row.email, expectedWhatsapp: row.whatsapp });
    if (intent.current?.fingerprint !== fingerprint) intent.current = { fingerprint, key: crypto.randomUUID() };
    const input = linkExternalCustomerSchema.parse({ requestKey: intent.current.key, source, externalId: row.externalId,
      customerId: selected.localCustomerId, expectedEmail: row.email, expectedWhatsapp: row.whatsapp, confirmed: true });
    setLinking(true); setError('');
    try {
      await apiFetch(`${endpoint}/links`, { method: 'POST', body: JSON.stringify(input) });
      setSelected(null); setLinked(true); setPreview(null);
      await client.invalidateQueries({ queryKey: ['external-customer-links'] });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível registrar o vínculo.'); }
    finally { setLinking(false); }
  };
  const revoke = async (id: string) => {
    const input = revokeExternalCustomerLinkSchema.safeParse({ confirmed: true, reason });
    if (!input.success) return;
    setError(''); setLinking(true);
    try {
      await apiFetch(`${endpoint}/links/${encodeURIComponent(id)}/revoke`, { method: 'POST', body: JSON.stringify(input.data) });
      setRevoking(''); setReason(''); setPreview(null);
      await client.invalidateQueries({ queryKey: ['external-customer-links'] });
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível revogar o vínculo.'); }
    finally { setLinking(false); }
  };
  return <details className="rounded-xl border p-4">
    <summary className="cursor-pointer font-semibold">Conferir clientes de outro sistema</summary>
    <section aria-label="Prévia de clientes externos" className="mt-4 space-y-3">
      <p className="text-sm text-muted-foreground">Confira duplicidades antes de vincular contas. Esta etapa não cria clientes nem modifica cadastros.</p>
      <div><Label htmlFor="import-customers-source">Identificação do sistema</Label><Input id="import-customers-source" maxLength={120} value={source} onChange={event => { setSource(event.target.value); setPreview(null); setSelected(null); setLinked(false); setStaged(''); }} placeholder="Ex.: meu-pdv" /></div>
      <div><Label htmlFor="import-customers-file">Arquivo de clientes (.json)</Label><Input id="import-customers-file" type="file" accept="application/json,.json" onChange={event => void chooseFile(event.target.files?.[0])} /></div>
      {fileName ? <p className="text-sm">{fileName} · {rows.length} clientes</p> : null}
      <p className="text-xs text-muted-foreground">Cada linha precisa de externalId, name e pelo menos email ou whatsapp. Até 100 clientes. Os contatos não aparecem no resultado.</p>
      <Button type="button" disabled={!source.trim() || !rows.length || pending} onClick={() => void runPreview()}>{pending ? 'Conferindo…' : 'Conferir clientes'}</Button>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {preview ? <div className="space-y-2"><p role="status" className="text-sm">{preview.summary.total} clientes · {preview.summary.conflicts} com conflito. Nenhuma conta foi alterada.</p>
        <ul className="max-h-80 space-y-2 overflow-auto">{preview.rows.map(row => <li key={row.row} className="rounded-lg border p-3 text-sm">
          <p className="font-semibold">{row.row}. ID externo: {row.externalId}</p>
          <p>{row.status === 'LINKED_REVIEW' ? 'Vínculo registrado para revisão' : row.conflicts.length ? row.conflicts.map(code => conflictNames[code] ?? 'Conflito').join(' · ') : 'Pronto para revisão'}</p>
          {row.conflicts.length === 1 && row.conflicts[0] === 'LOCAL_CUSTOMER_EXISTS' && row.localCustomerId ?
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setSelected(row)}>Conferir vínculo do cliente</Button> : null}
        </li>)}</ul></div> : null}
      {preview ? <Button type="button" variant="outline" disabled={staging || Boolean(staged)} onClick={() => void stage()}>
        {staging ? 'Salvando…' : staged ? 'Lote salvo para revisão' : 'Salvar lote para revisão'}
      </Button> : null}
      {staged ? <p role="status" className="text-sm text-green-800">Lote {staged} salvo. Nenhum cliente foi criado ou alterado.</p> : null}
      {selected ? <div className="space-y-2 rounded-lg border bg-slate-50 p-3 text-sm">
        <p>ID externo {selected.externalId} será vinculado ao cliente local {selected.localCustomerId}. Confira a linha {selected.row} do arquivo antes de confirmar. A conta não será alterada.</p>
        <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setSelected(null)}>Voltar</Button>
          <Button type="button" disabled={linking} onClick={() => void createLink()}>Confirmar vínculo do cliente</Button></div>
      </div> : null}
      {linked ? <p role="status" className="text-sm text-green-800">Vínculo de cliente registrado.</p> : null}
      <details className="rounded-lg border p-3"><summary className="cursor-pointer font-medium">Lotes salvos para revisão</summary>
        {batches.isLoading ? <p className="mt-2 text-sm">Carregando lotes…</p> : batches.isError ?
          <p role="alert" className="mt-2 text-sm text-red-700">{batches.error.message}</p> :
          !batches.data?.batches.length ? <p className="mt-2 text-sm">Nenhum lote salvo.</p> :
          <ul className="mt-3 space-y-2">{batches.data.batches.map(batch => <li key={batch.id} className="rounded-lg border p-3 text-sm">
            <p className="break-all font-semibold">{batch.source} · {new Date(batch.createdAt).toLocaleString('pt-BR')}</p>
            <p>{batch.summary.total} clientes · {batch.summary.conflicts} conflitos</p>
            <Button type="button" variant="outline" size="sm" className="mt-2" disabled={loadingBatch}
              onClick={() => void reviewBatch(batch.id)}>Rever lote</Button>
          </li>)}</ul>}
        {batchDetail ? <div className="mt-3 space-y-2 rounded-lg border bg-slate-50 p-3 text-sm">
          <p className="font-semibold">{batchDetail.source} · {batchDetail.currentPreview.summary.total} clientes</p>
          <p>{batchDetail.changedRows.length ? `${batchDetail.changedRows.length} linhas mudaram desde o salvamento: ${batchDetail.changedRows.join(', ')}.` : 'Nenhuma linha mudou desde o salvamento.'}</p>
          <p>{batchDetail.currentPreview.summary.conflicts} conflitos atuais. Nenhuma conta foi alterada.</p>
        </div> : null}
        {batches.data && batches.data.totalPages > 1 ? <div className="mt-3 flex justify-between gap-2">
          <Button type="button" variant="outline" disabled={batchPage === 1} onClick={() => setBatchPage(value => value - 1)}>Anterior</Button>
          <Button type="button" variant="outline" disabled={batchPage >= batches.data.totalPages} onClick={() => setBatchPage(value => value + 1)}>Próxima</Button>
        </div> : null}
      </details>
      <details className="rounded-lg border p-3"><summary className="cursor-pointer font-medium">Clientes vinculados</summary>
        {links.isLoading ? <p className="mt-2 text-sm">Carregando vínculos…</p> : links.isError ? <p role="alert" className="mt-2 text-sm text-red-700">{links.error.message}</p> :
          !links.data?.links.length ? <p className="mt-2 text-sm">Nenhum vínculo registrado.</p> :
          <ul className="mt-3 space-y-2">{links.data.links.map(item => <li key={item.id} className="rounded-lg border p-3 text-sm">
            <p className="break-all font-semibold">{item.source}: {item.externalId}</p>
            <p className="break-all text-xs">ID local: {item.customerId}</p>
            {item.revokedAt ? <p className="text-xs">Revogado</p> : revoking === item.id ? <div className="mt-2 space-y-2">
              <Label htmlFor={`customer-revoke-${item.id}`}>Motivo</Label><Input id={`customer-revoke-${item.id}`} maxLength={300} value={reason} onChange={event => setReason(event.target.value)} />
              <div className="flex gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setRevoking('')}>Voltar</Button>
                <Button type="button" variant="destructive" size="sm" disabled={reason.trim().length < 3 || linking} onClick={() => void revoke(item.id)}>Confirmar revogação</Button></div>
            </div> : <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => { setRevoking(item.id); setReason(''); }}>Revogar vínculo</Button>}
          </li>)}</ul>}
        {links.data && links.data.totalPages > 1 ? <div className="mt-3 flex justify-between gap-2"><Button type="button" variant="outline" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Anterior</Button>
          <Button type="button" variant="outline" disabled={page >= links.data.totalPages} onClick={() => setPage(value => value + 1)}>Próxima</Button></div> : null}
      </details>
    </section>
  </details>;
}
