import { lazy, Suspense, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api/client';
import { PARTNER_PORTFOLIO_CONFIG, IMAGE_UPLOAD_ACCEPT, readFileAsDataUrl } from '@/lib/image-tools';
import { Button } from '@/components/ui/button';
import { DashboardError, DashboardLoading } from './DashboardList';
const CropDialog = lazy(async () => ({ default: (await import('@/components/ui/image-crop-dialog')).ImageCropDialog }));
type Image = { id: string; url: string; width: number; height: number };
export function ReceiptEvidence({ receiptId, writable = false }: { receiptId: string; writable?: boolean }) {
  const client = useQueryClient(); const [open, setOpen] = useState(false);
  const [source, setSource] = useState<string>(); const [fileName, setFileName] = useState('recebimento');
  const [draft, setDraft] = useState<File>(); const [authorized, setAuthorized] = useState(false); const [error, setError] = useState('');
  const intent = useRef<{ file: File; key: string }>();
  const query = useQuery({ queryKey: ['receipt-evidence', receiptId], enabled: open, retry: false,
    queryFn: async () => (await apiFetch<{ data: Image[] }>(`/receipt-evidence/${encodeURIComponent(receiptId)}`)).data });
  const save = useMutation({ mutationFn: async () => {
    if (!draft || !authorized) throw new Error('Recorte a imagem e confirme a autorização.');
    if (intent.current?.file !== draft) intent.current = { file: draft, key: crypto.randomUUID() };
    const form = new FormData(); form.append('image', draft); form.append('requestKey', intent.current.key); form.append('authorized', 'true');
    return apiFetch(`/receipt-evidence/${encodeURIComponent(receiptId)}`, { method: 'POST', body: form });
  }, onSuccess: async () => { setDraft(undefined); setAuthorized(false); setError(''); intent.current = undefined; await client.invalidateQueries({ queryKey: ['receipt-evidence', receiptId] }); }, onError: failure => setError(failure.message) });
  const select = async (file?: File) => {
    if (!file) return;
    try { setSource(await readFileAsDataUrl(file)); setFileName(file.name); setDraft(undefined); setAuthorized(false); setError(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível abrir a imagem.'); }
  };
  return <details className="mt-2 rounded-lg border p-3" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="cursor-pointer text-sm font-medium">Fotos do recebimento (opcional)</summary>
    {query.isLoading ? <DashboardLoading label="Consultando fotos…" /> : query.isError ? <DashboardError message="Não foi possível consultar as fotos." onRetry={() => query.refetch()} /> : query.data ? <>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">{query.data.map(image => <a key={image.id} href={image.url} target="_blank" rel="noopener noreferrer"><img className="aspect-[4/3] w-full rounded-lg object-contain" src={image.url} width={image.width} height={image.height} alt="Evidência do recebimento" loading="lazy" /></a>)}</div>
      {!query.data.length ? <p className="mt-2 text-xs text-muted-foreground">Nenhuma foto anexada.</p> : null}
      {writable && query.data.length < 3 ? <div className="mt-3 space-y-3">
        <label className="block text-sm font-medium">1. Escolher e recortar foto<input className="mt-2 block max-w-full text-sm" type="file" accept={IMAGE_UPLOAD_ACCEPT} disabled={save.isPending} onChange={event => { void select(event.target.files?.[0]); event.target.value = ''; }} /></label>
        {draft ? <><p className="text-xs text-muted-foreground">Imagem preparada · {Math.ceil(draft.size / 1024)} KB</p><label className="flex gap-2 text-sm"><input type="checkbox" checked={authorized} disabled={save.isPending} onChange={event => setAuthorized(event.target.checked)} />2. O recebedor autorizou esta foto como evidência do recebimento.</label><Button size="sm" disabled={!authorized || save.isPending} onClick={() => save.mutate()}>{save.isPending ? 'Anexando…' : '3. Anexar foto'}</Button></> : null}
      </div> : null}
    </> : null}
    {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
    {source ? <Suspense fallback={<DashboardLoading label="Preparando recorte…" />}><CropDialog config={{ ...PARTNER_PORTFOLIO_CONFIG, fallbackBaseName: 'recebimento' }} fileName={fileName} open sourceUrl={source} title="Recortar foto do recebimento" onConfirm={file => { setDraft(file); setSource(undefined); }} onOpenChange={value => { if (!value) setSource(undefined); }} /></Suspense> : null}
  </details>;
}
