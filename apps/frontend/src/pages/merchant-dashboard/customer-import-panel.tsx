import { useState } from 'react';
import { previewCustomerImportSchema, type PreviewCustomerImportInput } from '@rebequi/shared/schemas';
import { apiFetch } from '@/services/api/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Preview = { rows: { row: number; externalId: string; localCustomerId: string | null; conflicts: string[] }[];
  summary: { total: number; conflicts: number }; applied: false };
const conflictNames: Record<string, string> = {
  DUPLICATE_EXTERNAL_ID: 'ID externo repetido', DUPLICATE_EMAIL: 'E-mail repetido no arquivo',
  DUPLICATE_WHATSAPP: 'WhatsApp repetido no arquivo', IDENTITY_COLLISION: 'E-mail e WhatsApp pertencem a contas diferentes',
  USER_ROLE_CONFLICT: 'Identificador pertence a colaborador', LOCAL_CUSTOMER_EXISTS: 'Cliente já existe na loja',
};

export function CustomerImportPanel() {
  const [source, setSource] = useState('');
  const [rows, setRows] = useState<PreviewCustomerImportInput['rows']>([]);
  const [fileName, setFileName] = useState('');
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const chooseFile = async (file?: File) => {
    setRows([]); setFileName(''); setPreview(null); setError('');
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
    setError(''); setPreview(null); setPending(true);
    try {
      const result = await apiFetch<{ data: Preview }>('/integrations/external-api/imports/customers/preview', {
        method: 'POST', body: JSON.stringify(input.data),
      });
      setPreview(result.data);
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível conferir o arquivo.'); }
    finally { setPending(false); }
  };
  return <details className="rounded-xl border p-4">
    <summary className="cursor-pointer font-semibold">Conferir clientes de outro sistema</summary>
    <section aria-label="Prévia de clientes externos" className="mt-4 space-y-3">
      <p className="text-sm text-muted-foreground">Confira duplicidades antes de vincular contas. Esta etapa não cria clientes nem modifica cadastros.</p>
      <div><Label htmlFor="import-customers-source">Identificação do sistema</Label><Input id="import-customers-source" maxLength={120} value={source} onChange={event => { setSource(event.target.value); setPreview(null); }} placeholder="Ex.: meu-pdv" /></div>
      <div><Label htmlFor="import-customers-file">Arquivo de clientes (.json)</Label><Input id="import-customers-file" type="file" accept="application/json,.json" onChange={event => void chooseFile(event.target.files?.[0])} /></div>
      {fileName ? <p className="text-sm">{fileName} · {rows.length} clientes</p> : null}
      <p className="text-xs text-muted-foreground">Cada linha precisa de externalId, name e pelo menos email ou whatsapp. Até 100 clientes. Os contatos não aparecem no resultado.</p>
      <Button type="button" disabled={!source.trim() || !rows.length || pending} onClick={() => void runPreview()}>{pending ? 'Conferindo…' : 'Conferir clientes'}</Button>
      {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
      {preview ? <div className="space-y-2"><p role="status" className="text-sm">{preview.summary.total} clientes · {preview.summary.conflicts} com conflito. Nenhuma conta foi alterada.</p>
        <ul className="max-h-80 space-y-2 overflow-auto">{preview.rows.map(row => <li key={row.row} className="rounded-lg border p-3 text-sm">
          <p className="font-semibold">{row.row}. ID externo: {row.externalId}</p>
          <p>{row.conflicts.length ? row.conflicts.map(code => conflictNames[code] ?? 'Conflito').join(' · ') : 'Pronto para revisão'}</p>
        </li>)}</ul></div> : null}
    </section>
  </details>;
}
