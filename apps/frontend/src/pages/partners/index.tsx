import { useQuery } from '@tanstack/react-query';
import { Link, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { HardHat, Home, UserRound, ArrowLeft, Building2, Calculator, Gift } from 'lucide-react';
import { getPartnerProfile } from '@/services/api/partners';
import { BrandLogo } from '@/components/BrandLogo';
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';
import { useAuth } from '@/contexts/AuthContext';
import { PartnerProfileForm } from './profile';
import { PartnerPwaControls } from './pwa';
import { useOnlineStatus } from '@/hooks/use-online-status';
import { PartnerProjects } from './projects';
import { PartnerCalculator } from './calculator';
import { PartnerLaborQuotes } from './labor';
import { PartnerPortfolio } from './portfolio';

const PARTNER_STATUS_LABELS = { PENDING: 'Aguardando análise', APPROVED: 'Cadastro aprovado', SUSPENDED: 'Participação suspensa', REJECTED: 'Cadastro precisa de ajustes' } as const;

export default function PartnersPage() {
  const { user, isAuthenticated, isLoading } = useAuth(); const [params, setParams] = useSearchParams();
  const online = useOnlineStatus(); const location = useLocation();
  const query = useQuery({ queryKey: ['partners', 'profile', user?.id], queryFn: getPartnerProfile, retry: false, enabled: isAuthenticated && user?.role === 'CUSTOMER' && online });
  const profile = query.data; const area = params.get('area') ?? ''; const edit = area === 'perfil';
  if (location.pathname === '/parceiros') return <Navigate to="/parceiros/" replace />;
  if (online && isLoading) return <DashboardLoading />;
  if (online && !isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (online && user?.role !== 'CUSTOMER') return <Navigate to="/painel-lojista/painel" replace />;
  return <div className="min-h-screen bg-slate-50 pb-24 text-slate-950"><header className="border-b bg-[#ffeb18]"><div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3"><Link to="/" aria-label="Ir à loja Rebequi"><BrandLogo className="w-28" /></Link><span className="flex items-center gap-2 text-sm font-bold"><HardHat size={19} />Parceiros</span><Link to="/painel-cliente" className="text-xs font-medium">Minha conta</Link></div></header>
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-6">{!online && area === 'calcular' ? <PartnerCalculator approved={false} online={false} /> : !online ? <section className="rounded-2xl border bg-white p-5"><h1 className="text-xl font-bold">Você está sem conexão</h1><p className="mt-3 text-sm text-slate-500">Seus dados privados não ficam no cache. Reconecte para consultar obras e enviar solicitações. Nenhum pedido será enviado automaticamente.</p><button className="mt-4 min-h-11 rounded-lg border px-4 text-sm font-semibold" onClick={() => setParams({ area: 'calcular' })}>Conferir área sem conexão</button></section> : query.isLoading ? <DashboardLoading /> : query.isError ? <DashboardError message={query.error.message} onRetry={() => query.refetch()} retrying={query.isFetching} /> : !profile || edit ? <PartnerProfileForm key={profile?.id ?? 'new'} profile={profile ?? null} /> : area === 'obras' ? <PartnerProjects approved={profile.status === 'APPROVED'} /> : area === 'calcular' ? <PartnerCalculator approved={profile.status === 'APPROVED'} online={online} /> : area === 'portfolio' ? <PartnerPortfolio writable={['PENDING', 'APPROVED'].includes(profile.status)} /> : area === 'mao-de-obra' ? <PartnerLaborQuotes approved={profile.status === 'APPROVED'} /> : area === 'beneficios' ? <section className="rounded-2xl border bg-white p-5"><h1 className="text-xl font-bold">Indicações e benefícios</h1><p className="mt-3 text-sm">O programa financeiro ainda não está ativado. Você será informado quando a loja definir as regras.</p></section> : <>
      <div><p className="text-sm text-slate-500">Olá, {user?.name.split(' ')[0]}</p><h1 className="mt-1 text-2xl font-bold">Seu espaço profissional</h1></div>
      <section className="rounded-2xl border bg-white p-5"><span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${profile.status === 'APPROVED' ? 'bg-green-100 text-green-900' : 'bg-yellow-100 text-yellow-900'}`}>{PARTNER_STATUS_LABELS[profile.status]}</span><p className="mt-3 text-sm">{profile.status === 'PENDING' ? 'A loja está conferindo seu perfil. Você pode atualizar suas informações.' : profile.status === 'APPROVED' ? 'Suas especialidades e região estão cadastradas.' : profile.reviewReason ?? 'Confira seus dados e fale com a loja.'}</p><button className="mt-4 min-h-11 rounded-lg border px-4 text-sm font-semibold" onClick={() => setParams({ area: 'perfil' })}>Conferir meu perfil</button><button className="ml-2 mt-4 min-h-11 rounded-lg border px-4 text-sm font-semibold" onClick={() => setParams({ area: 'portfolio' })}>Meu portfólio</button></section>
      <section className="rounded-2xl border bg-white p-5"><h2 className="font-bold">Materiais para sua obra</h2><p className="mt-2 text-sm text-slate-500">Solicite uma cotação por foto ou lista e acompanhe a resposta.</p><Link className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-red-600 px-4 text-sm font-semibold text-white" to="/painel-cliente?tab=quotes">Solicitar cotação</Link></section>
      {profile.status === 'APPROVED' ? <div className="grid grid-cols-2 gap-3"><button className="min-h-16 rounded-xl border bg-white p-3 text-sm font-semibold" onClick={() => setParams({ area: 'obras' })}>Minhas obras</button><button className="min-h-16 rounded-xl bg-blue-600 p-3 text-sm font-semibold text-white" onClick={() => setParams({ area: 'calcular' })}>Calcular materiais</button></div> : null}
      <p className="text-xs text-slate-500">O programa de pontos e comissões ainda não está ativado.</p>
    </>}
      <PartnerPwaControls canUpdate={Boolean(profile) && area === '' && online} showInstall={Boolean(profile) && area === '' && online} />
      <Link className="inline-flex min-h-11 items-center gap-2 text-sm text-slate-500" to="/"><ArrowLeft size={16} />Voltar à loja</Link>
    </main><nav aria-label="Navegação de parceiros" className="fixed inset-x-0 bottom-0 z-30 border-t bg-white pb-[env(safe-area-inset-bottom)]"><div className="mx-auto flex max-w-3xl">{[{ id: '', title: 'Início', Icon: Home }, { id: 'obras', title: 'Obras', Icon: Building2 }, { id: 'calcular', title: 'Calcular', Icon: Calculator }, { id: 'beneficios', title: 'Benefícios', Icon: Gift }, { id: 'perfil', title: 'Perfil', Icon: UserRound }].map(({ id, title, Icon }) => <button key={title} aria-current={area === id ? 'page' : undefined} className="flex min-h-16 min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] font-semibold aria-[current=page]:text-blue-700" onClick={() => setParams(id ? { area: id } : {})}><Icon size={21} />{title}</button>)}</div></nav>
  </div>;
}
