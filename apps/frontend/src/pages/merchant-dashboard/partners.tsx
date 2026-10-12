import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PartnerProfile, PartnerStatus } from '@rebequi/shared/types';
import type { ReviewPartnerInput } from '@rebequi/shared/schemas';
import { listPartners, reviewPartner } from '@/services/api/partners';
import { DashboardEmpty, DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';
import { PageHeader } from './components';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PartnerPortfolio } from '@/pages/partners/portfolio';
import { PartnerWallet } from '@/components/PartnerWallet';
import { PartnerProgramSettings } from './partner-program';
import { PartnerRewards } from '@/components/PartnerRewards';

const LABELS = { PENDING: 'Aguardando análise', APPROVED: 'Aprovados', SUSPENDED: 'Suspensos', REJECTED: 'Precisam de ajustes' } as const;
function PartnerReview({ partner }: { partner: PartnerProfile }) {
  const [showWallet, setShowWallet] = useState(false);
  const [showPortfolio, setShowPortfolio] = useState(false);
  const client = useQueryClient(); const [reason, setReason] = useState('');
  const mutation = useMutation({ mutationFn: (status: ReviewPartnerInput['status']) => reviewPartner(partner.id, { status, reason: reason.trim() || (status === 'APPROVED' ? 'Cadastro conferido pela loja.' : ''), expectedVersion: partner.version }), onSuccess: async () => { setReason(''); await client.invalidateQueries({ queryKey: ['merchant-dashboard', 'partners'] }); } });
  return <article className="rounded-xl border bg-white p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-base font-bold">{partner.user?.name}</h2><p className="mt-1 text-sm text-muted-foreground">{partner.city} · {partner.region}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">{LABELS[partner.status]}</span></div><p className="mt-3 text-sm font-medium">{partner.specialties.join(' · ')}</p><p className="mt-2 text-sm">{partner.experienceYears} anos de experiência</p>{partner.services ? <p className="mt-2 break-words text-sm text-muted-foreground">{partner.services}</p> : null}<p className="mt-2 text-sm">WhatsApp: {partner.user?.whatsapp || 'Não informado'}</p>{partner.reviewReason ? <p className="mt-3 text-xs text-muted-foreground">Última análise: {partner.reviewReason}</p> : null}
    <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowPortfolio(current => !current)}>{showPortfolio ? 'Fechar portfólio' : 'Ver portfólio'}</Button>{showPortfolio ? <div className="mt-3"><PartnerPortfolio partnerId={partner.id} /></div> : null}
    <Button variant="outline" size="sm" className="ml-2 mt-3" onClick={() => setShowWallet(current => !current)}>{showWallet ? 'Fechar extrato' : 'Extrato e pagamentos'}</Button>{showWallet ? <div className="mt-3"><PartnerWallet partnerId={partner.id} /></div> : null}
    <div className="mt-4"><Label htmlFor={`reason-${partner.id}`}>Motivo da análise (obrigatório para suspender ou pedir ajustes)</Label><Textarea id={`reason-${partner.id}`} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} /></div>
    <div className="mt-3 flex flex-wrap gap-2"><Button disabled={mutation.isPending || partner.status === 'APPROVED' || !partner.user?.isActive} onClick={() => mutation.mutate('APPROVED')}>Aprovar cadastro</Button><Button variant="outline" disabled={mutation.isPending || reason.trim().length < 3 || partner.status === 'REJECTED'} onClick={() => mutation.mutate('REJECTED')}>Pedir ajustes</Button><Button variant="outline" disabled={mutation.isPending || reason.trim().length < 3 || partner.status === 'SUSPENDED'} onClick={() => mutation.mutate('SUSPENDED')}>Suspender</Button></div>{mutation.isError ? <p role="alert" className="mt-3 text-sm text-red-600">{mutation.error.message}</p> : null}{mutation.isSuccess ? <p role="status" className="mt-3 text-sm text-green-700">Análise registrada.</p> : null}
  </article>;
}
export default function MerchantPartnersPage() {
  const [showProgram, setShowProgram] = useState(false);
  const [showRewards, setShowRewards] = useState(false);
  const [status, setStatus] = useState<PartnerStatus>('PENDING'); const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['merchant-dashboard', 'partners', status, page], queryFn: () => listPartners({ status, page }), retry: false });
  return <div className="space-y-5"><PageHeader title="Profissionais parceiros" description="Confira o perfil e aprove a participação." /><div className="flex flex-wrap gap-2" aria-label="Filtrar situação">{Object.entries(LABELS).map(([value, title]) => <Button key={value} variant={status === value ? 'default' : 'outline'} onClick={() => { setStatus(value as PartnerStatus); setPage(1); }}>{title}</Button>)}</div>{query.isLoading ? <DashboardLoading /> : query.isError ? <DashboardError message={query.error.message} onRetry={() => query.refetch()} /> : !query.data?.partners.length ? <DashboardEmpty title="Nenhum cadastro nesta situação" /> : <div className="grid items-start gap-4 xl:grid-cols-2">{query.data.partners.map(partner => <PartnerReview key={`${partner.id}-${partner.version}`} partner={partner} />)}</div>}
    {query.data && query.data.totalPages > 1 ? <div className="flex items-center justify-between"><Button variant="outline" disabled={page === 1} onClick={() => setPage(current => current - 1)}>Anterior</Button><span className="text-sm">Página {page}</span><Button variant="outline" disabled={page >= query.data.totalPages} onClick={() => setPage(current => current + 1)}>Próxima</Button></div> : null}
    <Button variant="outline" onClick={() => setShowProgram(current => !current)}>{showProgram ? 'Fechar regras do programa' : 'Configurar programa de benefícios'}</Button>{showProgram ? <PartnerProgramSettings /> : null}
    <Button variant="outline" onClick={() => setShowRewards(current => !current)}>{showRewards ? 'Fechar recompensas' : 'Gerenciar recompensas e resgates'}</Button>{showRewards ? <PartnerRewards admin /> : null}
  </div>;
}
