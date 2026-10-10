import { DashboardSearch } from "@/components/dashboard/DashboardList";
import { DashboardLoading, DashboardError, DashboardEmpty } from "@/components/dashboard/DashboardList";
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlarmClock, BellRing, TrendingUp, UserRound, Users } from 'lucide-react';
import { formatDateTime, formatWhatsapp } from '@rebequi/shared/utils';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import {
  CUSTOMER_STAGE_ORDER,
  formatCurrency,
  getCustomerStageLabel,
  getCustomerStageTone,
} from '@/lib/customer-ui';
import { fetchCustomers, fetchCustomerStages } from '@/services/api/customers';
import { CustomerStage } from '@/types';
import type { CustomerListItem } from '@/types';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, PageHeader, StatCard } from './components';

type StageFilterValue = 'all' | CustomerStage;

function isFollowUpDue(value?: string | Date | null) {
  if (!value) return false;
  const time = new Date(value).getTime();
  return !Number.isNaN(time) && time <= Date.now();
}

export function MerchantDashboardCustomers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<StageFilterValue>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [followUpOnly, setFollowUpOnly] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);
  const debouncedTag = useDebouncedValue(tagFilter, 300);

  const stagesQuery = useQuery({
    queryKey: ['merchant-dashboard', 'customers', 'stages'],
    queryFn: fetchCustomerStages,
  });

  const customersQuery = useQuery({
    queryKey: ['merchant-dashboard', 'customers', 'list', debouncedSearch, stageFilter, debouncedTag, followUpOnly],
    queryFn: () =>
      fetchCustomers({
        limit: 100,
        page: 1,
        search: debouncedSearch || undefined,
        stage: stageFilter === 'all' ? undefined : stageFilter,
        tag: debouncedTag.trim() || undefined,
        followUpDue: followUpOnly || undefined,
      }),
  });

  const customers = customersQuery.data?.customers ?? [];

  const stageCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of stagesQuery.data ?? []) map.set(row.stage, row.count);
    return map;
  }, [stagesQuery.data]);

  const totalCustomers = useMemo(
    () => (stagesQuery.data ?? []).reduce((sum, row) => sum + row.count, 0),
    [stagesQuery.data]
  );
  const activeBuyers = (stageCounts.get(CustomerStage.CUSTOMER) ?? 0) + (stageCounts.get(CustomerStage.RECURRING) ?? 0);
  const inFunnel = (stageCounts.get(CustomerStage.QUOTING) ?? 0) + (stageCounts.get(CustomerStage.NEGOTIATING) ?? 0);
  const dueFollowUps = customers.filter((c) => isFollowUpDue(c.followUpAt)).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes e relacionamento"
        description="Toda a base de clientes num só lugar: histórico, funil de relacionamento, notas e follow-up. Clique em um cliente para abrir a ficha."
      />

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={<Users className="h-4 w-4" />} label="Clientes na base" value={`${totalCustomers}`} tone="default" />
        <StatCard icon={<TrendingUp className="h-4 w-4" />} label="No funil" value={`${inFunnel}`} delta="Orçando ou negociando" tone="blue" />
        <StatCard icon={<UserRound className="h-4 w-4" />} label="Compradores" value={`${activeBuyers}`} delta="Cliente ou recorrente" tone="green" />
        <StatCard icon={<BellRing className="h-4 w-4" />} label="Retornos pendentes" value={`${dueFollowUps}`} tone={dueFollowUps > 0 ? 'yellow' : 'default'} />
      </section>

      {/* Funil */}
      <DashboardPanel title="Funil de relacionamento" description="Distribuição da base pelos estágios." accent="blue">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {CUSTOMER_STAGE_ORDER.map((stage) => {
            const count = stageCounts.get(stage) ?? 0;
            const isActive = stageFilter === stage;
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setStageFilter(isActive ? 'all' : stage)}
                className={`rounded-lg border px-4 py-3 text-left transition-colors ${
                  isActive ? 'border-primary/40 bg-primary/5' : 'border-border/60 bg-muted/30 hover:bg-muted/50'
                }`}
              >
                <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${getCustomerStageTone(stage)}`}>
                  {getCustomerStageLabel(stage)}
                </span>
                <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{count}</p>
              </button>
            );
          })}
        </div>
      </DashboardPanel>

      {/* Lista */}
      <DashboardPanel title="Base de clientes" accent="red">
        <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_200px_auto]">
          <DashboardSearch value={search} onChange={setSearch} placeholder="Buscar por nome, e-mail ou WhatsApp…" />
          <Input placeholder="Filtrar por etiqueta…" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} />
          <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
            <input type="checkbox" checked={followUpOnly} onChange={(e) => setFollowUpOnly(e.target.checked)} />
            Só retornos pendentes
          </label>
        </div>

        {customersQuery.isLoading ? (
          <DashboardLoading />
        ) : customersQuery.isError ? (
          <DashboardError message="Não foi possível carregar clientes." onRetry={() => void customersQuery.refetch()} retrying={customersQuery.isFetching} />
        ) : customers.length === 0 ? (
          <DashboardEmpty title="Nenhum resultado encontrado" description="Nenhum cliente encontrado com os filtros atuais." action={<Button variant="outline" size="sm" onClick={() => { setSearch(''); setStageFilter('all'); setTagFilter(''); setFollowUpOnly(false); }}>Limpar filtros</Button>} />
        ) : (
          <>
            {/* Desktop */}
            <div className="hidden overflow-hidden rounded-lg border border-border/60 xl:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="font-medium">Cliente</TableHead>
                    <TableHead className="font-medium">Estágio</TableHead>
                    <TableHead className="font-medium">Histórico</TableHead>
                    <TableHead className="text-right font-medium">Total gasto</TableHead>
                    <TableHead className="font-medium">Última atividade</TableHead>
                    <TableHead className="text-right font-medium">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <CustomerRow key={customer.id} customer={customer} onOpen={() => navigate(`${ADMIN_BASE_PATH}/clientes/${customer.id}`)} />
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile */}
            <div className="space-y-2 xl:hidden">
              {customers.map((customer) => (
                <button
                  key={customer.id}
                  type="button"
                  onClick={() => navigate(`${ADMIN_BASE_PATH}/clientes/${customer.id}`)}
                  className="w-full rounded-lg border border-border/60 bg-card p-4 text-left"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{customer.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {customer.whatsapp ? formatWhatsapp(customer.whatsapp) : customer.email || 'Sem contato'}
                      </p>
                    </div>
                    <span className={`inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getCustomerStageTone(customer.stage)}`}>
                      {getCustomerStageLabel(customer.stage)}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{customer.metrics.salesCount} venda(s) · {customer.metrics.quotesCount} orçamento(s)</span>
                    <span className="font-semibold tabular-nums text-foreground">{formatCurrency(customer.metrics.totalSpent)}</span>
                  </div>
                  {customer.tags.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {customer.tags.map((tag) => (
                        <span key={tag} className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] text-foreground">{tag}</span>
                      ))}
                    </div>
                  ) : null}
                </button>
              ))}
            </div>
          </>
        )}
      </DashboardPanel>
    </div>
  );
}

function CustomerRow({ customer, onOpen }: { customer: CustomerListItem; onOpen: () => void }) {
  return (
    <TableRow className="cursor-pointer hover:bg-muted/30" onClick={onOpen}>
      <TableCell>
        <p className="font-medium text-foreground">{customer.name}</p>
        <p className="text-xs text-muted-foreground">
          {customer.whatsapp ? formatWhatsapp(customer.whatsapp) : customer.email || 'Sem contato'}
        </p>
        {customer.tags.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-1">
            {customer.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full border border-border/60 bg-muted/50 px-2 py-0.5 text-[10px] text-foreground">{tag}</span>
            ))}
          </div>
        ) : null}
      </TableCell>
      <TableCell>
        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${getCustomerStageTone(customer.stage)}`}>
          {getCustomerStageLabel(customer.stage)}
        </span>
        {isFollowUpDue(customer.followUpAt) ? (
          <span className="mt-1 flex items-center gap-1 text-[11px] font-medium text-amber-700">
            <AlarmClock className="h-3 w-3" /> Retorno pendente
          </span>
        ) : null}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {customer.metrics.salesCount} venda(s)<br />
        {customer.metrics.quotesCount} orçamento(s) · {customer.metrics.ordersCount} pedido(s)
      </TableCell>
      <TableCell className="text-right font-semibold tabular-nums">{formatCurrency(customer.metrics.totalSpent)}</TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {customer.metrics.lastActivityAt ? formatDateTime(customer.metrics.lastActivityAt) : '—'}
      </TableCell>
      <TableCell className="text-right">
        <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          Abrir ficha
        </Button>
      </TableCell>
    </TableRow>
  );
}
