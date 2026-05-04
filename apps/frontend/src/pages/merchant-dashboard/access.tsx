import { useDeferredValue, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  INTERNAL_USER_ROLES,
  MERCHANT_ROLE_PROFILES,
  getMerchantPermissionLabel,
  getMerchantRoleDescription,
  getMerchantRoleLabel,
} from '@rebequi/shared/constants';
import type { ManagedUserRole, User } from '@rebequi/shared/types';
import { KeyRound, RefreshCcw, Search, ShieldCheck, UserCog, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, MetricChip, PageHeader, StatCard } from './components';
import { UserEditorDialog } from './user-editor-dialog';
import { fetchManagedUsers } from '@/services/api/users';

type RoleFilter = ManagedUserRole | 'all';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

function formatDateTime(value?: string | Date | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return dateFormatter.format(date);
}

export function MerchantDashboardAccess() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [includeInactive, setIncludeInactive] = useState(true);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const deferredSearch = useDeferredValue(search);

  const snapshotQuery = useQuery({
    queryKey: ['managed-users', 'snapshot'],
    queryFn: () => fetchManagedUsers({ includeInactive: true, page: 1, limit: 100 }),
  });

  const usersQuery = useQuery({
    queryKey: ['managed-users', 'list', deferredSearch, roleFilter, includeInactive],
    queryFn: () =>
      fetchManagedUsers({
        includeInactive,
        limit: 100,
        page: 1,
        role: roleFilter,
        search: deferredSearch.trim() || undefined,
      }),
  });

  const snapshotUsers = snapshotQuery.data?.users ?? [];
  const users = usersQuery.data?.users ?? [];

  const totalUsers = snapshotUsers.length;
  const activeUsers = snapshotUsers.filter((u) => u.isActive).length;
  const pendingPasswordUsers = snapshotUsers.filter((u) => u.mustChangePassword).length;
  const adminUsers = snapshotUsers.filter((u) => u.role === 'ADMIN').length;

  const roleTotals = useMemo(
    () =>
      INTERNAL_USER_ROLES.map((role) => ({
        role,
        total: snapshotUsers.filter((u) => u.role === role).length,
      })),
    [snapshotUsers],
  );

  const handleSaved = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['managed-users'] }),
      queryClient.invalidateQueries({ queryKey: ['merchant-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['auth'] }),
    ]);
  };

  const openCreateDialog = () => { setSelectedUser(null); setEditorOpen(true); };
  const openEditDialog = (u: User) => { setSelectedUser(u); setEditorOpen(true); };

  const isLoading = usersQuery.isLoading || snapshotQuery.isLoading;
  const hasUsers = users.length > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Usuários e níveis de acesso"
        description="Crie contas para colaboradores, defina o perfil de cada um e controle quais áreas do painel o time pode operar."
        actions={
          <>
            <Button onClick={openCreateDialog} size="sm" className="gap-1.5">
              <UserCog className="h-3.5 w-3.5" />
              Novo usuário
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => { void Promise.all([snapshotQuery.refetch(), usersQuery.refetch()]); }}
            >
              <RefreshCcw className={`h-3.5 w-3.5 ${usersQuery.isFetching || snapshotQuery.isFetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </>
        }
      />

      {/* KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Users className="h-4 w-4" />}
          label="Colaboradores cadastrados"
          value={`${totalUsers}`}
          delta="Total no painel"
        />
        <StatCard
          icon={<ShieldCheck className="h-4 w-4" />}
          label="Contas ativas"
          value={`${activeUsers}`}
          delta={`${Math.max(totalUsers - activeUsers, 0)} inativas`}
          tone="green"
        />
        <StatCard
          icon={<KeyRound className="h-4 w-4" />}
          label="Troca de senha pendente"
          value={`${pendingPasswordUsers}`}
          delta="Redefinição no primeiro acesso"
          tone={pendingPasswordUsers > 0 ? 'yellow' : 'default'}
        />
        <StatCard
          icon={<UserCog className="h-4 w-4" />}
          label="Administradores"
          value={`${adminUsers}`}
          delta="Controle total do painel"
        />
      </section>

      {/* Session info + role distribution */}
      <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardPanel
          title="Sessão atual"
          description="Informações da conta autenticada e visão geral dos perfis disponíveis."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <MetricChip label="Usuário logado" tone="blue" value={user?.email || user?.identifier || '-'} />
              <MetricChip label="Seu perfil" tone="yellow" value={getMerchantRoleLabel(user?.role)} />
            </div>
            <div className="rounded-lg border border-border/40 bg-muted/30 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Como o controle de acesso funciona</p>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                Somente administradores acessam esta tela. Os demais colaboradores entram no mesmo painel, mas visualizam apenas as seções liberadas para o perfil definido aqui.
              </p>
            </div>
          </div>
        </DashboardPanel>

        <DashboardPanel title="Distribuição por perfil" description="Composição atual da equipe.">
          <div className="space-y-2">
            {roleTotals.map(({ role, total }) => (
              <div key={role} className="flex items-center justify-between rounded-lg border border-border/40 bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{getMerchantRoleLabel(role)}</p>
                  <p className="text-xs text-muted-foreground">{getMerchantRoleDescription(role)}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-foreground ring-1 ring-slate-200">
                  {total}
                </span>
              </div>
            ))}
          </div>
        </DashboardPanel>
      </section>

      {/* Role profiles */}
      <DashboardPanel
        title="Perfis disponíveis"
        description="Cada perfil libera um conjunto fixo de funções no painel. Escolha o mais adequado para cada colaborador."
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {INTERNAL_USER_ROLES.map((role) => (
            <article
              key={role}
              className="rounded-xl border border-border/50 bg-muted/30 p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{getMerchantRoleLabel(role)}</h3>
                  <p className="mt-1 text-sm leading-5 text-muted-foreground">{getMerchantRoleDescription(role)}</p>
                </div>
                <span className="shrink-0 rounded-full border border-brand-blue/20 bg-brand-blue/5 px-2.5 py-0.5 text-xs font-semibold text-brand-blue">
                  {roleTotals.find((item) => item.role === role)?.total ?? 0} usuário(s)
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {MERCHANT_ROLE_PROFILES[role].permissions.map((permission) => (
                  <span
                    key={permission}
                    className="inline-flex rounded-full border border-border/40 bg-white px-2.5 py-0.5 text-xs font-medium text-foreground"
                  >
                    {getMerchantPermissionLabel(permission)}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </DashboardPanel>

      {/* Users list */}
      <DashboardPanel
        title="Colaboradores cadastrados"
        description="Gerencie os acessos internos da loja. Use os filtros para localizar usuários por nome ou perfil."
        action={
          <Button onClick={openCreateDialog} size="sm" className="gap-1.5">
            <UserCog className="h-3.5 w-3.5" />
            Novo usuário
          </Button>
        }
      >
        {/* Filters */}
        <div className="mb-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_200px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail ou WhatsApp…"
              className="pl-9 rounded-xl"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Todos os perfis</option>
            {INTERNAL_USER_ROLES.map((role) => (
              <option key={role} value={role}>{getMerchantRoleLabel(role)}</option>
            ))}
          </select>
          <label className="flex h-10 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm">
            <input
              checked={includeInactive}
              onChange={(e) => setIncludeInactive(e.target.checked)}
              type="checkbox"
            />
            Incluir inativos
          </label>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : !hasUsers ? (
          <div className="rounded-lg border border-dashed border-border/40 py-10 text-center text-sm text-muted-foreground">
            Nenhum colaborador encontrado para este filtro.
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-lg border border-border/50 xl:block">
              <div className="max-h-[34rem] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-muted/50/95 backdrop-blur">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[30%] font-semibold">Colaborador</TableHead>
                      <TableHead className="font-semibold">Perfil</TableHead>
                      <TableHead className="font-semibold">Acessos liberados</TableHead>
                      <TableHead className="w-44 text-center font-semibold">Situação</TableHead>
                      <TableHead className="w-36 text-right font-semibold">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => {
                      const isCurrentUser = user?.id === u.id;
                      return (
                        <TableRow key={u.id} className="hover:bg-muted/30">
                          <TableCell>
                            <div className="space-y-0.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-foreground">{u.name}</p>
                                {isCurrentUser ? (
                                  <span className="rounded-full border border-brand-blue/20 bg-brand-blue/5 px-2.5 py-0.5 text-[11px] font-semibold text-brand-blue">
                                    Você
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-xs text-muted-foreground">{u.email || u.identifier}</p>
                              <p className="text-xs text-muted-foreground">
                                {u.whatsapp || 'Sem WhatsApp'} · atualizado em {formatDateTime(u.updatedAt)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm font-semibold text-foreground">{getMerchantRoleLabel(u.role)}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{getMerchantRoleDescription(u.role)}</p>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1.5">
                              {MERCHANT_ROLE_PROFILES[u.role as ManagedUserRole].permissions.map((permission) => (
                                <span
                                  key={`${u.id}-${permission}`}
                                  className="inline-flex rounded-full border border-border/40 bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground"
                                >
                                  {getMerchantPermissionLabel(permission)}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1.5">
                              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${u.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-border/40 bg-muted text-muted-foreground'}`}>
                                {u.isActive ? 'Ativo' : 'Inativo'}
                              </span>
                              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${u.mustChangePassword ? 'border-brand-yellow/30 bg-brand-yellow/10 text-foreground' : 'border-brand-blue/20 bg-brand-blue/5 text-brand-blue'}`}>
                                {u.mustChangePassword ? 'Troca pendente' : 'Senha regular'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <Button size="sm" variant="outline" onClick={() => openEditDialog(u)} className="gap-1.5">
                                <UserCog className="h-3.5 w-3.5" />
                                Editar
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 xl:hidden">
              {users.map((u) => {
                const isCurrentUser = user?.id === u.id;
                return (
                  <article key={u.id} className="rounded-xl border border-border/50 bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-sm font-semibold text-foreground">{u.name}</h3>
                          <span className={`inline-flex rounded-full border px-2 py-px text-[10px] font-semibold ${u.isActive ? 'border-emerald-200 bg-emerald-50 text-emerald-600' : 'border-border/40 bg-muted text-muted-foreground'}`}>
                            {u.isActive ? 'Ativo' : 'Inativo'}
                          </span>
                          {isCurrentUser ? (
                            <span className="rounded-full border border-brand-blue/20 bg-brand-blue/5 px-2 py-px text-[10px] font-semibold text-brand-blue">
                              Você
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">{u.email || u.identifier}</p>
                        <p className="text-xs text-muted-foreground">{u.whatsapp || 'Sem WhatsApp'}</p>
                      </div>
                    </div>

                    <div className="mt-3 rounded-lg border border-border/40 bg-muted/30 px-3 py-3">
                      <p className="text-sm font-semibold text-foreground">{getMerchantRoleLabel(u.role)}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{getMerchantRoleDescription(u.role)}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {MERCHANT_ROLE_PROFILES[u.role as ManagedUserRole].permissions.map((perm) => (
                          <span key={`${u.id}-${perm}`} className="inline-flex rounded-full border border-border/40 bg-white px-2.5 py-0.5 text-xs font-medium text-foreground">
                            {getMerchantPermissionLabel(perm)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${u.mustChangePassword ? 'border-brand-yellow/30 bg-brand-yellow/10 text-foreground' : 'border-brand-blue/20 bg-brand-blue/5 text-brand-blue'}`}>
                        {u.mustChangePassword ? 'Troca de senha pendente' : 'Senha em dia'}
                      </span>
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(u)} className="gap-1.5">
                        <UserCog className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </DashboardPanel>

      <UserEditorDialog
        open={editorOpen}
        user={selectedUser}
        onOpenChange={(nextOpen) => {
          setEditorOpen(nextOpen);
          if (!nextOpen) setSelectedUser(null);
        }}
        onSaved={handleSaved}
      />
    </div>
  );
}
