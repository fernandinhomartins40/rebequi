import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { parseMoneyCents } from '@rebequi/shared/utils';
import type { PartnerPayoutInput } from '@rebequi/shared/schemas';
import { getWallet, recordPayout } from '@/services/api/partner-program';
import { formatIntegerCents } from '@/lib/integer-money';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DashboardError, DashboardLoading } from '@/components/dashboard/DashboardList';
const KINDS: Record<string, string> = { EARN: 'Benefício da venda', REVERSE: 'Estorno', PAYOUT: 'Pagamento registrado', PAYMENT_HOLD: 'Pagamento pendente', HOLD_RELEASE: 'Pagamento confirmado', INELIGIBLE: 'Venda sem elegibilidade', REDEMPTION_HOLD: 'Pontos reservados para resgate', REDEMPTION_RELEASE: 'Reserva de pontos devolvida' };
export function PartnerWallet({ partnerId }: { partnerId?: string }) {
  const client = useQueryClient(); const [page, setPage] = useState(1); const [amount, setAmount] = useState(''); const [reference, setReference] = useState(''); const [confirmed, setConfirmed] = useState(false); const [error, setError] = useState('');
  const intent = useRef<{ fingerprint: string; key: string }>();
  const query = useQuery({ queryKey: ['partners', 'wallet', partnerId ?? 'me', page], queryFn: () => getWallet(partnerId, page), retry: false });
  const payout = useMutation({ mutationFn: (input: PartnerPayoutInput) => recordPayout(partnerId!, input), onSuccess: async () => { setAmount(''); setReference(''); setConfirmed(false); setError(''); await client.invalidateQueries({ queryKey: ['partners', 'wallet'] }); }, onError: failure => setError(failure.message) });
  const submitPayout = () => {
    try {
      const amountCents = parseMoneyCents(amount);
      if (!amountCents || amountCents > 100000000 || reference.trim().length < 3) throw new Error('Informe um valor válido e a referência única do comprovante.');
      const fingerprint = JSON.stringify({ amountCents, reference: reference.trim() });
      if (intent.current?.fingerprint !== fingerprint) intent.current = { fingerprint, key: crypto.randomUUID() };
      setError(''); payout.mutate({ amountCents, reference: reference.trim(), paidConfirmed: true, requestKey: intent.current.key });
    } catch (failure) { setError((failure as Error).message); }
  };
  if (query.isLoading) return <DashboardLoading />;
  if (query.isError) return <DashboardError message={query.error.message} onRetry={() => query.refetch()} />;
  const data = query.data; if (!data) return null;
  return <section className="space-y-4 rounded-xl border bg-white p-4"><h2 className="font-bold">Extrato de benefícios</h2><div className="grid gap-3 sm:grid-cols-3">{[{ label: 'Comissão disponível', value: formatIntegerCents(data.availableCents) }, { label: 'Comissão a liberar', value: formatIntegerCents(data.pendingCents) }, { label: 'Pontos disponíveis', value: BigInt(data.availablePoints).toLocaleString('pt-BR') }].map(card => <div key={card.label} className="min-w-0 rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{card.label}</p><p className="mt-1 break-words text-lg font-bold">{card.value}</p></div>)}</div><p className="text-xs text-slate-500">{BigInt(data.pendingPoints).toLocaleString('pt-BR')} pontos a liberar. Comissões e pontos são saldos distintos; um pedido não é uma venda paga.</p>
    {!data.entries.length ? <p className="text-sm text-slate-500">Nenhuma movimentação de benefício.</p> : <ul className="space-y-2">{data.entries.map(entry => <li key={entry.id} className="rounded-lg border p-3 text-sm"><div className="flex flex-wrap justify-between gap-2"><strong>{KINDS[entry.kind] ?? entry.kind}</strong><span>{formatIntegerCents(entry.commissionCents)} · {BigInt(entry.points).toLocaleString('pt-BR')} pts</span></div><p className="mt-1 break-words text-xs text-slate-500">{entry.reference ?? 'Registro financeiro'} · {new Date(entry.createdAt).toLocaleDateString('pt-BR')}{entry.rule ? ` · regra ${entry.rule.version}` : ''}</p>{new Date(entry.availableAt) > new Date() ? <p className="mt-1 text-xs">Liberação: {new Date(entry.availableAt).toLocaleDateString('pt-BR')}</p> : null}</li>)}</ul>}
    {data.totalPages > 1 ? <div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Anterior</Button><span className="text-xs">{page} de {data.totalPages}</span><Button variant="outline" disabled={page >= data.totalPages} onClick={() => setPage(page + 1)}>Próxima</Button></div> : null}
    {partnerId ? <details className="border-t pt-3"><summary className="cursor-pointer text-sm font-semibold">Registrar pagamento já realizado</summary><div className="mt-3 space-y-3"><div><Label htmlFor={`payout-amount-${partnerId}`}>Valor pago (R$)</Label><Input id={`payout-amount-${partnerId}`} inputMode="decimal" value={amount} disabled={payout.isPending} onChange={event => { setAmount(event.target.value); setConfirmed(false); }} /></div><div><Label htmlFor={`payout-ref-${partnerId}`}>Referência do comprovante</Label><Input id={`payout-ref-${partnerId}`} maxLength={160} value={reference} disabled={payout.isPending} onChange={event => { setReference(event.target.value); setConfirmed(false); }} /></div><label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={confirmed} disabled={payout.isPending} onChange={event => setConfirmed(event.target.checked)} />O pagamento já foi realizado fora do sistema. Confirmo o registro e o valor.</label><Button disabled={!confirmed || payout.isPending} onClick={submitPayout}>{payout.isPending ? 'Registrando…' : 'Registrar pagamento'}</Button><p className="text-xs text-slate-500">Registra e abate a comissão disponível. Esta ação não transfere dinheiro.</p>{error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}{payout.isSuccess ? <p role="status" className="text-sm text-emerald-700">Pagamento registrado.</p> : null}</div></details> : null}
  </section>;
}
