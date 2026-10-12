import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiFetch } from '@/services/api/client';
import { Button } from '@/components/ui/button';
import { BrandLogo } from '@/components/BrandLogo';
import { clearReferralIntent, saveReferralIntent } from '@/lib/partner-referral';
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';

export default function PartnerReferralPage() {
  const { code = '' } = useParams(); const navigate = useNavigate(); const [error, setError] = useState('');
  const query = useQuery({ queryKey: ['referral', code], queryFn: () => apiFetch<{ data: { code: string } }>(`/orders/referral/${encodeURIComponent(code)}`), retry: false });
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-4"><section className="w-full max-w-md space-y-5 rounded-2xl border bg-white p-6"><BrandLogo className="w-36" /><h1 className="text-2xl font-bold">Você recebeu uma indicação</h1>{query.isLoading ? <DashboardLoading /> : query.isError ? <DashboardError message="Esta indicação não está disponível." onRetry={() => query.refetch()} /> : <><p className="text-sm text-slate-600">Ao continuar, você poderá vincular seu pedido ao profissional que indicou a loja. A confirmação será feita no checkout.</p><p className="break-all rounded-lg bg-slate-50 p-3 text-sm">Código {code}</p><Button className="w-full" onClick={() => { try { saveReferralIntent(code); navigate('/categorias'); } catch (failure) { setError((failure as Error).message); } }}>Usar indicação e ver produtos</Button></>}{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}<Button variant="outline" asChild className="w-full"><Link to="/" onClick={clearReferralIntent}>Ir à loja sem usar esta indicação</Link></Button></section></main>;
}
