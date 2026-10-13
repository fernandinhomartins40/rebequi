import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiFetch } from '@/services/api/client';
import { fetchAdminProducts } from '@/services/api/products';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { DashboardError, DashboardLoading, DashboardSearch } from '@/components/dashboard/DashboardList';
import { Button } from '@/components/ui/button';
import { PageHeader } from './components';
import { ADMIN_BASE_PATH } from './config';
import { CommercialQuoteEditor } from './commercial-quote-editor';
import { CommercialOrderEditor } from './commercial-order-editor';
import { CommercialPerformance } from './commercial-performance';
import { CommercialGoalEditor } from './commercial-goal-editor';
import { CommercialNotifications } from './commercial-notifications';
import { CommercialCommissionDraft } from './commercial-commission-draft';
type Workbench = { counts: { quotes: number; orders: number; followUps: number; pendingSales: number }; quotes: { id: string; referenceCode: string; title: string | null; status: string }[]; orders: { id: string; referenceCode: string; customerNameSnapshot: string }[]; customers: { id: string; name: string; followUpAt: string }[]; pendingSales: { id: string; referenceCode: string }[] };
export default function CommercialWorkbench() {
  const [newAction, setNewAction] = useState<'quote' | 'order' | null>(null);
  const [search, setSearch] = useState(''); const debounced = useDebouncedValue(search, 300);
  const query = useQuery({ queryKey: ['merchant-dashboard', 'commercial-workbench'], queryFn: async () => (await apiFetch<{ data: Workbench }>('/commercial/workbench')).data, retry: false });
  const catalog = useQuery({ queryKey: ['commercial-catalog', debounced], queryFn: () => fetchAdminProducts({ search: debounced, page: 1, limit: 10 }), enabled: debounced.trim().length >= 2, retry: false });
  const data = query.data;
  return <div className="space-y-5"><PageHeader title="Meus atendimentos" description="Escolha o próximo atendimento." />
    <div className="flex flex-wrap gap-2"><Button variant={newAction === 'quote' ? 'default' : 'outline'} onClick={() => setNewAction(value => value === 'quote' ? null : 'quote')}>Criar orçamento para cliente</Button><Button variant={newAction === 'order' ? 'default' : 'outline'} onClick={() => setNewAction(value => value === 'order' ? null : 'order')}>Criar pedido para cliente</Button></div>
    {newAction === 'quote' ? <CommercialQuoteEditor onClose={() => setNewAction(null)} /> : null}
    {newAction === 'order' ? <CommercialOrderEditor onClose={() => setNewAction(null)} /> : null}
    <CommercialPerformance /><CommercialNotifications /><CommercialGoalEditor /><CommercialCommissionDraft />{query.isLoading ? <DashboardLoading /> : query.isError ? <DashboardError message={query.error.message} onRetry={() => query.refetch()} /> : data ? <><div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[{ title: 'Orçamentos', count: data.counts.quotes, href: '/orçamentos' }, { title: 'Pedidos', count: data.counts.orders, href: '/pedidos' }, { title: 'Retornos vencidos', count: data.counts.followUps, href: '/clientes' }, { title: 'Pagamentos pendentes', count: data.counts.pendingSales, href: '/vendas' }].map(item => <Link key={item.title} className="min-w-0 rounded-xl border bg-white p-4" to={`${ADMIN_BASE_PATH}${item.href}`}><span className="text-xs text-muted-foreground">{item.title}</span><p className="mt-1 text-xl font-bold">{item.count}</p></Link>)}</div><section className="space-y-3 rounded-xl border bg-white p-4"><h2 className="font-bold">Próximos atendimentos</h2><p className="text-xs text-muted-foreground">Até cinco pendências de cada tipo, começando pelas mais antigas.</p><ul className="space-y-2">{data.quotes.map(item => <li key={item.id}><Link className="block rounded-lg border p-3 text-sm" to={`${ADMIN_BASE_PATH}/${encodeURIComponent('orçamentos')}?quoteId=${item.id}`}>{item.referenceCode} · {item.title || 'Conferir orçamento'}</Link></li>)}{data.orders.map(item => <li key={item.id}><Link className="block rounded-lg border p-3 text-sm" to={`${ADMIN_BASE_PATH}/pedidos/${item.id}`}>{item.referenceCode} · {item.customerNameSnapshot}</Link></li>)}{data.customers.map(item => <li key={item.id}><Link className="block rounded-lg border p-3 text-sm" to={`${ADMIN_BASE_PATH}/clientes/${item.id}`}>{item.name} · Retorno {new Date(item.followUpAt).toLocaleDateString('pt-BR')}</Link></li>)}{data.pendingSales.map(item => <li key={item.id}><Link className="block rounded-lg border p-3 text-sm" to={`${ADMIN_BASE_PATH}/vendas`}>{item.referenceCode} · Conferir pagamento</Link></li>)}</ul>{!data.quotes.length && !data.orders.length && !data.customers.length && !data.pendingSales.length ? <p className="text-sm text-muted-foreground">Nenhuma pendência atribuída a você.</p> : null}</section></> : null}
    <section className="space-y-3 rounded-xl border bg-white p-4"><h2 className="font-bold">Consultar produto e estoque</h2><DashboardSearch value={search} onChange={setSearch} placeholder="Digite o nome ou SKU" />{catalog.isFetching ? <DashboardLoading /> : catalog.isError ? <DashboardError message={catalog.error.message} onRetry={() => catalog.refetch()} /> : catalog.data ? <ul className="space-y-2">{catalog.data.products.map(product => <li key={product.id} className="min-w-0 rounded-lg border p-3"><p className="break-words text-sm font-semibold">{product.name}</p><p className="mt-1 text-xs text-muted-foreground">{product.sku || 'Sem SKU'} · {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} · {Math.max(0, product.stock - (product.reservedStock ?? 0))} disponíveis{!product.isActive ? ' · Produto desativado' : ''}</p></li>)}{!catalog.data.products.length ? <li className="text-sm text-muted-foreground">Nenhum produto encontrado.</li> : null}</ul> : <p className="text-xs text-muted-foreground">Digite pelo menos dois caracteres. Consulta sem alteração de preço ou estoque.</p>}</section><Button asChild variant="outline"><Link to={`${ADMIN_BASE_PATH}/vendas/nova`}>Registrar venda</Link></Button>
  </div>;
}
