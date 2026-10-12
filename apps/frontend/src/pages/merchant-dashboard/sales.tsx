import { DashboardRecord } from "@/components/dashboard/DashboardElements";
import { DashboardSearch, DashboardLoading, DashboardError, DashboardEmpty } from "@/components/dashboard/DashboardList";
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Coins, Package, Plus, TrendingUp, Wallet } from 'lucide-react';
import { formatDateTime } from '@rebequi/shared/utils';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  formatCurrency,
  getPaymentMethodLabel,
  getSaleStatusLabel,
  getSaleStatusTone,
} from '@/lib/sale-ui';
import { fetchRevenueSummary, fetchSales, updateSaleStatus } from '@/services/api/sales';
import { PaymentMethod, SaleStatus } from '@/types';
import type { Sale } from '@/types';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, PageHeader, StatCard } from './components';
import { SaleReturns } from '@/components/SaleReturns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

type StatusFilterValue = 'all' | SaleStatus;
type PaymentFilterValue = 'all' | PaymentMethod;

const STATUS_OPTIONS: Array<{ label: string; value: StatusFilterValue }> = [
  { label: 'Todos os status', value: 'all' },
  { label: 'Pago', value: SaleStatus.PAID },
  { label: 'A receber', value: SaleStatus.PENDING_PAYMENT },
  { label: 'Cancelada', value: SaleStatus.CANCELED },
];

const PAYMENT_OPTIONS: Array<{ label: string; value: PaymentFilterValue }> = [
  { label: 'Todas as formas', value: 'all' },
  { label: 'Pix', value: PaymentMethod.PIX },
  { label: 'Dinheiro', value: PaymentMethod.CASH },
  { label: 'Cartão', value: PaymentMethod.CARD },
  { label: 'A prazo / boleto', value: PaymentMethod.INSTALLMENT },
];

export function MerchantDashboardSales() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilterValue>('all');
  const debouncedSearch = useDebouncedValue(search, 300);

  const revenueQuery = useQuery({
    queryKey: ['merchant-dashboard', 'sales', 'revenue'],
    queryFn: () => fetchRevenueSummary(),
  });

  const salesQuery = useQuery({
    queryKey: ['merchant-dashboard', 'sales', 'list', debouncedSearch, statusFilter, paymentFilter],
    queryFn: () =>
      fetchSales({
        limit: 100,
        page: 1,
        search: debouncedSearch || undefined,
        status: statusFilter === 'all' ? undefined : statusFilter,
        paymentMethod: paymentFilter === 'all' ? undefined : paymentFilter,
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SaleStatus }) => updateSaleStatus(id, { status }),
    onSuccess: async (sale) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'sales'] }),
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'sales-badge'] }),
        queryClient.invalidateQueries({ queryKey: ['merchant-dashboard', 'products'] }),
      ]);
      toast({ title: 'Venda atualizada', description: `${sale.referenceCode} → ${getSaleStatusLabel(sale.status)}` });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Falha ao atualizar venda',
        description: error instanceof Error ? error.message : 'Erro inesperado.',
      });
    },
  });

  const revenue = revenueQuery.data;
  const sales = salesQuery.data?.sales ?? [];

  const paymentByMethod = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const row of revenue?.paymentBreakdown ?? []) {
      map.set(row.paymentMethod, { total: row.total, count: row.count });
    }
    return map;
  }, [revenue]);

  const handleStatus = (sale: Sale, status: SaleStatus) => {
    if (status === SaleStatus.CANCELED && !window.confirm(`Cancelar a venda ${sale.referenceCode}? O estoque será estornado.`)) {
      return;
    }
    statusMutation.mutate({ id: sale.id, status });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendas e faturamento"
        description="Registre vendas fechadas, controle o pagamento e acompanhe o faturamento da loja. Toda venda dá baixa automática no estoque."
        actions={
          <Button size="sm" className="gap-1.5" onClick={() => navigate(`${ADMIN_BASE_PATH}/vendas/nova`)}>
            <Plus className="h-3.5 w-3.5" />
            Registrar venda
          </Button>
        }
      />

      {/* KPIs de faturamento */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Coins className="h-4 w-4" />}
          label="Faturamento (pago)"
          value={revenueQuery.isLoading ? '—' : formatCurrency(revenue?.paidRevenue ?? 0)}
          delta={`${revenue?.paidCount ?? 0} venda(s)`}
          tone="green"
        />
        <StatCard
          icon={<TrendingUp className="h-4 w-4" />}
          label="Ticket médio"
          value={revenueQuery.isLoading ? '—' : formatCurrency(revenue?.averageTicket ?? 0)}
          tone="blue"
        />
        <StatCard
          icon={<Package className="h-4 w-4" />}
          label="Itens vendidos"
          value={revenueQuery.isLoading ? '—' : `${revenue?.itemsSold ?? 0}`}
          tone="default"
        />
        <StatCard
          icon={<Wallet className="h-4 w-4" />}
          label="A receber"
          value={revenueQuery.isLoading ? '—' : formatCurrency(revenue?.pendingRevenue ?? 0)}
          delta={`${revenue?.pendingCount ?? 0} pendente(s)`}
          tone={(revenue?.pendingRevenue ?? 0) > 0 ? 'yellow' : 'default'}
        />
      </section>

      {/* Breakdown por forma de pagamento */}
      <DashboardPanel
        title="Recebido por forma de pagamento"
        description="Considera apenas vendas pagas no período."
        accent="blue"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PAYMENT_OPTIONS.filter((o) => o.value !== 'all').map((option) => {
            const data = paymentByMethod.get(option.value as string);
            return (
              <div key={option.value} className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
                <p className="text-xs font-medium text-muted-foreground">{option.label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                  {formatCurrency(data?.total ?? 0)}
                </p>
                <p className="text-[11px] text-muted-foreground">{data?.count ?? 0} venda(s)</p>
              </div>
            );
          })}
        </div>
      </DashboardPanel>

      {/* Lista de vendas */}
      <DashboardPanel title="Vendas registradas" description="Histórico de vendas fechadas." accent="red">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row">
          <DashboardSearch value={search} onChange={setSearch} placeholder="Buscar por referência, cliente ou WhatsApp…" />
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilterValue)}>
            <SelectTrigger className="lg:w-48"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={paymentFilter} onValueChange={(v) => setPaymentFilter(v as PaymentFilterValue)}>
            <SelectTrigger className="lg:w-48"><SelectValue placeholder="Pagamento" /></SelectTrigger>
            <SelectContent>
              {PAYMENT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {salesQuery.isLoading ? (
          <DashboardLoading />
        ) : salesQuery.isError ? (
          <DashboardError message="Não foi possível carregar vendas." onRetry={() => void salesQuery.refetch()} retrying={salesQuery.isFetching} />
        ) : sales.length === 0 ? (
          <DashboardEmpty title="Nenhum resultado encontrado" action={search || statusFilter !== 'all' || paymentFilter !== 'all' ? <Button variant="outline" size="sm" onClick={() => { setSearch(''); setStatusFilter('all'); setPaymentFilter('all'); }}>Limpar filtros</Button> : <Button size="sm" onClick={() => navigate(`${ADMIN_BASE_PATH}/vendas/nova`)}>Registrar venda</Button>} />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-hidden rounded-lg border border-border/60 xl:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-medium">Referência</TableHead>
                    <TableHead className="font-medium">Cliente</TableHead>
                    <TableHead className="font-medium">Pagamento</TableHead>
                    <TableHead className="font-medium">Status</TableHead>
                    <TableHead className="text-right font-medium">Total</TableHead>
                    <TableHead className="font-medium">Data</TableHead>
                    <TableHead className="text-right font-medium">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.map((sale) => (
                    <TableRow key={sale.id} className="hover:bg-muted/30">
                      <TableCell><span className="font-mono text-sm font-medium">{sale.referenceCode}</span></TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{sale.customer?.name || sale.customerNameSnapshot || 'Balcão'}</p>
                        <p className="text-xs text-muted-foreground">{sale.itemCount} item(ns)</p>
                      </TableCell>
                      <TableCell className="text-sm">{getPaymentMethodLabel(sale.paymentMethod)}</TableCell>
                      <TableCell>
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getSaleStatusTone(sale.status)}`}>
                          {getSaleStatusLabel(sale.status)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(sale.total)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDateTime(sale.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <SaleRowActions sale={sale} isMutating={statusMutation.isPending} onStatus={handleStatus} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="space-y-2 xl:hidden">
              {sales.map((sale) => (
                <DashboardRecord key={sale.id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{sale.customer?.name || sale.customerNameSnapshot || 'Balcão'}</p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">{sale.referenceCode}</p>
                    </div>
                    <p className="font-semibold tabular-nums text-foreground">{formatCurrency(sale.total)}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getSaleStatusTone(sale.status)}`}>
                        {getSaleStatusLabel(sale.status)}
                      </span>
                      <span className="text-xs text-muted-foreground">{getPaymentMethodLabel(sale.paymentMethod)}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">{formatDateTime(sale.createdAt)}</span>
                  </div>
                  <div className="mt-3 border-t border-border/40 pt-3">
                    <SaleRowActions sale={sale} isMutating={statusMutation.isPending} onStatus={handleStatus} />
                  </div>
                </DashboardRecord>
              ))}
            </div>
          </>
        )}
      </DashboardPanel>
    </div>
  );
}

function SaleRowActions({
  sale,
  isMutating,
  onStatus,
}: {
  sale: Sale;
  isMutating: boolean;
  onStatus: (sale: Sale, status: SaleStatus) => void;
}) {
  const [showReturns, setShowReturns] = useState(false);
  const returns = <Dialog open={showReturns} onOpenChange={setShowReturns}><DialogTrigger asChild><Button variant="ghost" size="sm">Devoluções</Button></DialogTrigger><DialogContent className="max-h-[90dvh] overflow-y-auto"><DialogHeader><DialogTitle>Devoluções da venda</DialogTitle></DialogHeader>{showReturns ? <SaleReturns sale={sale} /> : null}</DialogContent></Dialog>;
  if (sale.status === SaleStatus.CANCELED) {
    return returns;
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {returns}
      {sale.status === SaleStatus.PENDING_PAYMENT ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={isMutating}
          onClick={() => onStatus(sale, SaleStatus.PAID)}
          className="h-8 gap-1.5 text-emerald-600 hover:text-emerald-700"
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          Marcar pago
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="sm"
        disabled={isMutating}
        onClick={() => onStatus(sale, SaleStatus.CANCELED)}
        className="h-8 gap-1.5 text-red-600 hover:text-red-700"
      >
        Cancelar
      </Button>
    </div>
  );
}
