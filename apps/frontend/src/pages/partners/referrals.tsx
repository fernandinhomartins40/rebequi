import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/api/client';
import { Button } from '@/components/ui/button';
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';
import { PartnerWallet } from '@/components/PartnerWallet';
import { PartnerRewards } from '@/components/PartnerRewards';
import { PartnerProgram, PartnerRuleHistory } from './program';

type Referrals = { code: string; canShare: boolean; page: number; total: number; totalPages: number; referrals: { id: string; createdAt: string; referenceCode: string; orderStatus: string; saleStatus: string | null }[] };
export function PartnerReferrals() {
  const [page, setPage] = useState(1); const [message, setMessage] = useState(''); const [qrError, setQrError] = useState(''); const canvas = useRef<HTMLCanvasElement>(null);
  const query = useQuery({ queryKey: ['partners', 'referrals', page], queryFn: async () => (await apiFetch<{ data: Referrals }>(`/partners/referrals?page=${page}`)).data, retry: false });
  const link = query.data?.canShare ? `${location.origin}/indicacao/${query.data.code}` : '';
  useEffect(() => { let active = true; if (link && canvas.current) { const element = canvas.current; import('qrcode').then(module => module.toCanvas(element, link, { width: 220, margin: 4, errorCorrectionLevel: 'M' })).catch(() => { if (active) setQrError('Não foi possível criar o QR. Use o link abaixo.'); }); } return () => { active = false; }; }, [link]);
  if (query.isLoading) return <DashboardLoading />;
  if (query.isError) return <DashboardError message={query.error.message} onRetry={() => query.refetch()} />;
  if (!query.data) return null;
  const share = async () => { try { if (navigator.share) await navigator.share({ title: 'Materiais na Rebequi', url: link }); else { await navigator.clipboard.writeText(link); setMessage('Link copiado.'); } } catch (failure) { if ((failure as Error).name !== 'AbortError') setMessage('Selecione o link abaixo e copie para compartilhar.'); } };
  return <section className="space-y-4 rounded-2xl border bg-white p-5"><h1 className="text-xl font-bold">Indicações e benefícios</h1><PartnerProgram /><PartnerWallet /><PartnerRewards /><PartnerRuleHistory />
    {query.data.canShare ? <div className="space-y-3"><h2 className="font-semibold">Seu link de indicação</h2><canvas ref={canvas} role="img" aria-label="QR Code do seu link de indicação" className="mx-auto max-w-full" />{qrError ? <p role="alert" className="text-sm">{qrError}</p> : null}<input readOnly aria-label="Link de indicação" value={link} className="min-h-11 w-full rounded-lg border px-3 text-sm" onFocus={event => event.target.select()} /><Button onClick={share}>Compartilhar link</Button><p className="text-xs text-slate-500">O cliente confirma a indicação no checkout. Nomes, contatos e itens de compras não aparecem aqui.</p></div> : <p className="text-sm">O compartilhamento fica disponível com cadastro aprovado.</p>}
    {message ? <p role="status" className="text-sm text-blue-700">{message}</p> : null}<h2 className="font-semibold">Pedidos indicados</h2>{!query.data.referrals.length ? <p className="text-sm text-slate-500">Nenhum pedido com indicação confirmada.</p> : <ul className="space-y-2">{query.data.referrals.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm"><div><p className="font-semibold">{item.referenceCode}</p><time className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString('pt-BR')}</time></div><span>{item.saleStatus === 'PAID' ? 'Venda paga' : item.saleStatus === 'CANCELED' || item.orderStatus === 'CANCELED' ? 'Cancelado' : 'Em atendimento'}</span></li>)}</ul>}
    {query.data.totalPages > 1 ? <div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button><span className="text-xs">{page} de {query.data.totalPages}</span><Button variant="outline" disabled={page >= query.data.totalPages} onClick={() => setPage(page + 1)}>Próxima</Button></div> : null}
  </section>;
}
