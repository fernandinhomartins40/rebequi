import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/services/api/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';

type Performance = { month: string; paidSales: number; grossCents: string; refundCents: string; netCents: string; goal: { targetCents: string } | null; commissionCalculated: false };
const currentMonth = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; };
const money = (value: string) => { const cents = BigInt(value); const abs = cents < 0n ? -cents : cents;
  return `${cents < 0n ? '-' : ''}R$ ${String(abs / 100n).replace(/\B(?=(\d{3})+(?!\d))/g, '.')},${String(abs % 100n).padStart(2, '0')}`; };

export function CommercialPerformance() {
  const [month, setMonth] = useState(currentMonth);
  const query = useQuery({ queryKey: ['commercial-performance', month], enabled: /^20\d{2}-(0[1-9]|1[0-2])$/.test(month), retry: false,
    queryFn: async () => (await apiFetch<{ data: Performance }>(`/commercial/performance/me?month=${encodeURIComponent(month)}`)).data });
  return <section className="space-y-3 rounded-xl border bg-white p-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="font-bold">Meu desempenho</h2><p className="text-xs text-muted-foreground">Vendas pagas creditadas a você no mês escolhido.</p></div><div><Label htmlFor="seller-performance-month">Mês</Label><Input id="seller-performance-month" type="month" className="max-w-44" value={month} onChange={event => setMonth(event.target.value)} /></div></div>
    {query.isLoading ? <DashboardLoading /> : query.isError ? <DashboardError message="Não foi possível consultar o desempenho." onRetry={() => query.refetch()} /> : query.data ? <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{[
      { label: 'Vendas pagas', value: String(query.data.paidSales) }, { label: 'Total vendido', value: money(query.data.grossCents) },
      { label: 'Devoluções', value: money(query.data.refundCents) }, { label: 'Saldo após devoluções', value: money(query.data.netCents) },
    ].map(item => <div key={item.label} className="min-w-0 rounded-lg bg-slate-50 p-3"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 break-words text-sm font-bold sm:text-base">{item.value}</p></div>)}</div> : null}
    {query.data?.goal ? <p className="text-sm">Meta do mês: <strong>{money(query.data.goal.targetCents)}</strong>. Saldo atual: {money(query.data.netCents)}.</p> : null}
    <p className="text-xs text-muted-foreground">Devoluções dessas vendas atualizam o saldo mesmo quando registradas depois do mês. Vendas antigas sem vendedor creditado não entram aqui. Este resumo não calcula comissão.</p>
  </section>;
}
