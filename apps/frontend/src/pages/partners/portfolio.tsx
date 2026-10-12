import { lazy, Suspense, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPortfolio, removePortfolio, uploadPortfolio } from '@/services/api/partners';
import { PARTNER_PORTFOLIO_CONFIG, IMAGE_UPLOAD_ACCEPT, readFileAsDataUrl } from '@/lib/image-tools';
import { DashboardEmpty, DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CropDialog = lazy(async () => ({ default: (await import('@/components/ui/image-crop-dialog')).ImageCropDialog }));
export function PartnerPortfolio({ partnerId, writable = false }: { partnerId?: string; writable?: boolean }) {
  const client = useQueryClient(); const input = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<string>(); const [fileName, setFileName] = useState('');
  const [caption, setCaption] = useState(''); const [authorized, setAuthorized] = useState(false);
  const [error, setError] = useState(''); const [removing, setRemoving] = useState<string | null>(null);
  const request = useRef<{ fingerprint: string; key: string } | null>(null);
  const query = useQuery({ queryKey: ['partners', 'portfolio', partnerId ?? 'me'], queryFn: () => getPortfolio(partnerId), retry: false });
  const refresh = () => client.invalidateQueries({ queryKey: ['partners', 'portfolio'] });
  const upload = useMutation({ mutationFn: ({ file, key }: { file: File; key: string }) => uploadPortfolio(file, caption.trim(), key), onSuccess: async () => { setSource(undefined); setCaption(''); setAuthorized(false); setError(''); await refresh(); }, onError: failure => setError(failure.message) });
  const remove = useMutation({ mutationFn: removePortfolio, onSuccess: async () => { setRemoving(null); await refresh(); }, onError: failure => setError(failure.message) });
  const select = async (file?: File) => {
    if (!file) return;
    try { setSource(await readFileAsDataUrl(file)); setFileName(file.name); setError(''); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Não foi possível abrir a foto.'); }
  };
  const confirm = async (file: File) => {
    if (!authorized) throw new Error('Confirme a autorização para usar esta foto.');
    const digest = await crypto.subtle.digest('SHA-256', await file.arrayBuffer());
    const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') + caption.trim();
    if (request.current?.fingerprint !== fingerprint) request.current = { fingerprint, key: crypto.randomUUID() };
    await upload.mutateAsync({ file, key: request.current.key });
  };
  return <section className="space-y-4 rounded-2xl border bg-white p-5"><h1 className="text-xl font-bold">{partnerId ? 'Trabalhos do profissional' : 'Meu portfólio'}</h1><p className="text-sm text-slate-500">Até 8 fotos. Visíveis ao profissional e à equipe que analisa o cadastro; sem publicação automática.</p>
    {query.isLoading ? <DashboardLoading /> : query.isError ? <DashboardError message={query.error.message} onRetry={() => query.refetch()} /> : !query.data?.length ? <DashboardEmpty title="Nenhuma foto cadastrada" /> : <div className="grid grid-cols-2 gap-3">{query.data.map(image => <article key={image.id} className="min-w-0 overflow-hidden rounded-xl border"><img src={image.url} alt={image.caption || 'Trabalho cadastrado pelo profissional'} width={1000} height={750} loading="lazy" className="aspect-[4/3] w-full object-cover" /><div className="space-y-2 p-3">{image.caption ? <p className="break-words text-sm">{image.caption}</p> : null}{writable ? removing === image.id ? <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={remove.isPending} onClick={() => setRemoving(null)}>Cancelar</Button><Button variant="destructive" size="sm" disabled={remove.isPending} onClick={() => remove.mutate(image.id)}>Confirmar remoção</Button></div> : <Button variant="outline" size="sm" onClick={() => setRemoving(image.id)}>Remover foto</Button> : null}</div></article>)}</div>}
    {writable && !query.isLoading && !query.isError && (query.data?.length ?? 0) < 8 ? <div className="space-y-3 border-t pt-4"><div><Label htmlFor="portfolio-caption">Descrição da foto (opcional)</Label><Input id="portfolio-caption" maxLength={160} value={caption} onChange={event => setCaption(event.target.value)} /></div><label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={authorized} onChange={event => setAuthorized(event.target.checked)} />Tenho autorização para usar esta foto.</label><input ref={input} type="file" accept={IMAGE_UPLOAD_ACCEPT} aria-label="Foto de trabalho para o portfólio" className="sr-only" onChange={event => { void select(event.target.files?.[0]); event.target.value = ''; }} /><Button disabled={!authorized || upload.isPending} onClick={() => input.current?.click()}>Adicionar foto</Button><p className="text-xs text-slate-500">Recorte em 4:3, compressão e conversão WebP antes do envio. Evite rostos, documentos e endereços.</p></div> : null}
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}{source ? <Suspense fallback={<DashboardLoading />}><CropDialog config={PARTNER_PORTFOLIO_CONFIG} fileName={fileName} sourceUrl={source} open={Boolean(source)} title="Recortar foto do trabalho" onConfirm={confirm} onOpenChange={open => { if (!open && !upload.isPending) setSource(undefined); }} /></Suspense> : null}
  </section>;
}
