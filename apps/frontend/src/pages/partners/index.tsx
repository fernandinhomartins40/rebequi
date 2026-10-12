import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { HardHat, Home, UserRound, ArrowLeft } from 'lucide-react';
import { getPartnerProfile } from '@/services/api/partners';
import { BrandLogo } from '@/components/BrandLogo';
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';
import { useAuth } from '@/contexts/AuthContext';
import { PartnerProfileForm } from './profile';

const PARTNER_STATUS_LABELS = { PENDING: 'Aguardando análise', APPROVED: 'Cadastro aprovado', SUSPENDED: 'Participação suspensa', REJECTED: 'Cadastro precisa de ajustes' } as const;

export default function PartnersPage() {
  const { user } = useAuth(); const [params, setParams] = useSearchParams();
  const query = useQuery({ queryKey: ['partners', 'profile', user?.id], queryFn: getPartnerProfile, retry: false });
  const profile = query.data; const edit = params.get('area') === 'perfil';
  return <div className="min-h-screen bg-slate-50 pb-24 text-slate-950"><header className="border-b bg-[#ffeb18]"><div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3"><Link to="/" aria-label="Ir à loja Rebequi"><BrandLogo className="w-28" /></Link><span className="flex items-center gap-2 text-sm font-bold"><HardHat size={19} />Parceiros</span><Link to="/painel-cliente" className="text-xs font-medium">Minha conta</Link></div></header>
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">{query.isLoading ? <DashboardLoading /> : query.isError ? <DashboardError message={query.error.message} onRetry={() => query.refetch()} retrying={query.isFetching} /> : !profile || edit ? <PartnerProfileForm key={profile?.id ?? 'new'} profile={profile ?? null} /> : <>
      <div><p className="text-sm text-slate-500">Olá, {user?.name.split(' ')[0]}</p><h1 className="mt-1 text-2xl font-bold">Seu espaço profissional</h1></div>
      <section className="rounded-2xl border bg-white p-5"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${profile.status === 'APPROVED' ? 'bg-green-100 text-green-900' : 'bg-yellow-100 text-yellow-900'}`}>{PARTNER_STATUS_LABELS[profile.status]}</span><p className="mt-3 text-sm">{profile.status === 'PENDING' ? 'A loja está conferindo seu perfil. Você pode atualizar suas informações.' : profile.status === 'APPROVED' ? 'Suas especialidades e região estão cadastradas.' : profile.reviewReason ?? 'Confira seus dados e fale com a loja.'}</p><button className="mt-4 min-h-11 rounded-lg border px-4 text-sm font-semibold" onClick={() => setParams({ area: 'perfil' })}>Conferir meu perfil</button></section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Materiais para sua obra</h2><p className="mt-2 text-sm text-slate-500">Solicite uma cotação por foto ou lista e acompanhe a resposta.</p><Link className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white" to="/painel-cliente?tab=quotes">Solicitar cotação</Link></section>
      <p className="text-xs text-slate-500">O programa de pontos e comissões ainda não está ativado.</p>
    </>}
      <Link className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-500" to="/"><ArrowLeft size={16} />Voltar à loja</Link>
    </main><nav aria-label="Navegação de parceiros" className="fixed inset-x-0 bottom-0 z-30 border-t bg-white pb-[env(safe-area-inset-bottom)]"><div className="mx-auto flex max-w-3xl">{[{ area: '', title: 'Início', Icon: Home }, { area: 'perfil', title: 'Perfil', Icon: UserRound }].map(({ area, title, Icon }) => <button key={title} aria-current={(edit ? 'perfil' : '') === area ? 'page' : undefined} className="flex min-h-16 flex-1 flex-col items-center justify-center gap-1 text-xs font-semibold aria-[current=page]:text-blue-700" onClick={() => setParams(area ? { area } : {})}><Icon size={21} />{title}</button>)}</div></nav>
  </div>;
}
