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
import { Link } from 'react-router-dom';
import { KeyRound, RefreshCcw, Search, ShieldCheck, UserCog, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ADMIN_BASE_PATH } from './config';
import { DashboardPanel, MetricChip, SectionLeadCard, StatCard } from './components';
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
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

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
  const activeUsers = snapshotUsers.filter((managedUser) => managedUser.isActive).length;
  const pendingPasswordUsers = snapshotUsers.filter((managedUser) => managedUser.mustChangePassword).length;
  const adminUsers = snapshotUsers.filter((managedUser) => managedUser.role === 'ADMIN').length;

  const roleTotals = useMemo(() => {
    return INTERNAL_USER_ROLES.map((role) => ({
      role,
      total: snapshotUsers.filter((managedUser) => managedUser.role === role).length,
    }));
  }, [snapshotUsers]);

  const handleSaved = () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ['managed-users'] }),
      queryClient.invalidateQueries({ queryKey: ['merchant-dashboard'] }),
      queryClient.invalidateQueries({ queryKey: ['auth'] }),
    ]);
  };

  const openCreateDialog = () => {
    setSelectedUser(null);
    setEditorOpen(true);
  };

  const openEditDialog = (managedUser: User) => {
    setSelectedUser(managedUser);
    setEditorOpen(true);
  };

  const isLoading = usersQuery.isLoading || snapshotQuery.isLoading;
  const hasUsers = users.length > 0;

  return (
    <div className="space-y-6">
      <SectionLeadCard
        badge="Acesso"
        title="Usuarios internos e niveis de acesso"
        description="Crie contas para funcionarios, defina o role de cada colaborador e controle quais areas do painel o time pode operar."
        tone="blue"
        actions={
          <>
            <Button onClick={openCreateDialog} className="gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90">
              <UserCog className="h-4 w-4" />
              Novo usuario
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                void Promise.all([
                  snapshotQuery.refetch(),
                  usersQuery.refetch(),
                ]);
              }}
              className="gap-2 border-black/10 bg-white/80 text-foreground hover:bg-white"
            >
              <RefreshCcw className={`h-4 w-4 ${usersQuery.isFetching || snapshotQuery.isFetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button asChild variant="outline" className="border-black/10 bg-white/80 text-foreground hover:bg-white">
              <Link to={`${ADMIN_BASE_PATH}/visao-geral`}>Visao geral</Link>
            </Button>
          </>
        }
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Users className="h-5 w-5 text-primary" />}
          label="Usuarios internos"
          value={`${totalUsers}`}
          delta="Equipe cadastrada no painel"
        />
        <StatCard
          icon={<ShieldCheck className="h-5 w-5 text-primary" />}
          label="Usuarios ativos"
          value={`${activeUsers}`}
          delta={`${Math.max(totalUsers - activeUsers, 0)} inativos`}
        />
        <StatCard
          icon={<KeyRound className="h-5 w-5 text-primary" />}
          label="Troca de senha"
          value={`${pendingPasswordUsers}`}
          delta="Exigem redefinicao no primeiro acesso"
        />
        <StatCard
          icon={<UserCog className="h-5 w-5 text-primary" />}
          label="Administradores"
          value={`${adminUsers}`}
          delta="Perfis com controle total"
        />
      </section>

      <section className="grid gap-5 2xl:grid-cols-[1.2fr_0.8fr]">
        <DashboardPanel
          badge="Sessao"
          badgeClassName="bg-primary/10 text-primary"
          description="Contexto da conta autenticada e atalhos para revisao dos roles da equipe."
          title="Operacao de acesso"
        >
          <div className="flex flex-wrap gap-2">
            <MetricChip label="Usuario atual" tone="blue" value={user?.email || user?.identifier || '-'} />
            <MetricChip label="Seu role" tone="yellow" value={getMerchantRoleLabel(user?.role)} />
          </div>

          <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-4">
            <p className="font-semibold text-foreground">Como esta area funciona</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Apenas administradores acessam esta tela. Os demais colaboradores entram no mesmo painel, mas so enxergam as rotas e APIs liberadas para o role definido aqui.
            </p>
          </div>
        </DashboardPanel>

        <Card className="border-[#eadfba] bg-white/92 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
          <CardHeader className="space-y-2">
            <CardTitle className="text-xl">Distribuicao por role</CardTitle>
            <CardDescription>Leitura rapida da composicao atual da equipe.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {roleTotals.map(({ role, total }) => (
              <div key={role} className="flex items-center justify-between rounded-2xl border border-black/5 bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-semibold text-foreground">{getMerchantRoleLabel(role)}</p>
                  <p className="text-xs text-muted-foreground">{getMerchantRoleDescription(role)}</p>
                </div>
                <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-foreground">{total}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      <DashboardPanel
        badge="Roles"
        badgeClassName="bg-secondary text-secondary-foreground"
        description="Cada role libera um conjunto fixo de funcoes do painel. O admin escolhe o perfil mais adequado para cada funcionario."
        title="Perfis disponiveis"
      >
        <div className="grid gap-4 2xl:grid-cols-2">
          {INTERNAL_USER_ROLES.map((role) => (
            <article
              key={role}
              className="rounded-3xl border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-5 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.22)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-foreground">{getMerchantRoleLabel(role)}</h3>
                  <p className="text-sm leading-6 text-muted-foreground">{getMerchantRoleDescription(role)}</p>
                </div>
                <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                  {roleTotals.find((item) => item.role === role)?.total ?? 0} usuario(s)
                </span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {MERCHANT_ROLE_PROFILES[role].permissions.map((permission) => (
                  <span
                    key={permission}
                    className="inline-flex rounded-full border border-black/5 bg-white px-3 py-1 text-xs font-semibold text-foreground"
                  >
                    {getMerchantPermissionLabel(permission)}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </DashboardPanel>

      <DashboardPanel
        badge="Equipe"
        badgeClassName="bg-primary/10 text-primary"
        description="Cadastre e mantenha os acessos internos da loja. O filtro ajuda a localizar pessoas e roles rapidamente."
        title="Usuarios cadastrados"
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por nome, e-mail ou WhatsApp"
              className="pl-9"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value as RoleFilter)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">Todos os roles</option>
            {INTERNAL_USER_ROLES.map((role) => (
              <option key={role} value={role}>
                {getMerchantRoleLabel(role)}
              </option>
            ))}
          </select>

          <label className="flex w-full items-center justify-between gap-2 rounded-md border border-black/10 bg-white px-3 py-2 text-sm xl:w-auto xl:justify-start">
            <input
              checked={includeInactive}
              onChange={(event) => setIncludeInactive(event.target.checked)}
              type="checkbox"
            />
            Mostrar inativos
          </label>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 rounded-3xl border border-black/5 bg-slate-50 px-5 py-16 text-sm text-muted-foreground">
            <RefreshCcw className="h-4 w-4 animate-spin" />
            Carregando usuarios internos...
          </div>
        ) : null}

        {!isLoading && !hasUsers ? (
          <div className="rounded-3xl border border-dashed border-black/10 bg-slate-50 px-5 py-16 text-center text-sm text-muted-foreground">
            Nenhum usuario encontrado para este filtro.
          </div>
        ) : null}

        {!isLoading && hasUsers ? (
          <>
            <div className="hidden overflow-hidden rounded-2xl border border-black/5 bg-white xl:block">
              <div className="max-h-[34rem] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur supports-[backdrop-filter]:bg-slate-50/80">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[32%]">Usuario</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Permissoes</TableHead>
                      <TableHead className="w-44 text-center">Status</TableHead>
                      <TableHead className="w-40 text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((managedUser) => {
                      const isCurrentUser = user?.id === managedUser.id;
                      return (
                        <TableRow key={managedUser.id} className="bg-white/90">
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-foreground">{managedUser.name}</p>
                                {isCurrentUser ? (
                                  <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary">
                                    Sua sessao
                                  </span>
                                ) : null}
                              </div>
                              <p className="text-sm text-muted-foreground">{managedUser.email || managedUser.identifier}</p>
                              <p className="text-xs text-muted-foreground">
                                {managedUser.whatsapp || 'Sem WhatsApp'} | atualizado em {formatDateTime(managedUser.updatedAt)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">{getMerchantRoleLabel(managedUser.role)}</p>
                              <p className="text-xs text-muted-foreground">{getMerchantRoleDescription(managedUser.role)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              {MERCHANT_ROLE_PROFILES[managedUser.role as ManagedUserRole].permissions.map((permission) => (
                                <span
                                  key={`${managedUser.id}-${permission}`}
                                  className="inline-flex rounded-full border border-black/5 bg-slate-50 px-3 py-1 text-xs font-semibold text-foreground"
                                >
                                  {getMerchantPermissionLabel(permission)}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="space-y-2">
                              <span
                                className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${
                                  managedUser.isActive
                                    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                    : 'border-slate-200 bg-slate-100 text-slate-700'
                                }`}
                              >
                                {managedUser.isActive ? 'Ativo' : 'Inativo'}
                              </span>
                              <div>
                                <span
                                  className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${
                                    managedUser.mustChangePassword
                                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                                      : 'border-primary/15 bg-primary/5 text-primary'
                                  }`}
                                >
                                  {managedUser.mustChangePassword ? 'Troca pendente' : 'Senha regular'}
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end">
                              <Button size="sm" onClick={() => openEditDialog(managedUser)} className="gap-2">
                                <UserCog className="h-4 w-4" />
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

            <div className="space-y-3 xl:hidden">
              {users.map((managedUser) => {
                const isCurrentUser = user?.id === managedUser.id;

                return (
                  <article
                    key={managedUser.id}
                    className="rounded-2xl border border-black/5 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-4 shadow-[0_18px_45px_-42px_rgba(15,23,42,0.22)]"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">{managedUser.name}</h3>
                        <span
                          className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${
                            managedUser.isActive
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-slate-100 text-slate-700'
                          }`}
                        >
                          {managedUser.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                        {isCurrentUser ? (
                          <span className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary">
                            Sua sessao
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-muted-foreground">{managedUser.email || managedUser.identifier}</p>
                      <p className="text-xs text-muted-foreground">{managedUser.whatsapp || 'Sem WhatsApp'}</p>
                    </div>

                    <div className="mt-3 rounded-2xl border border-black/5 bg-slate-50 px-3 py-3">
                      <p className="font-semibold text-foreground">{getMerchantRoleLabel(managedUser.role)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{getMerchantRoleDescription(managedUser.role)}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {MERCHANT_ROLE_PROFILES[managedUser.role as ManagedUserRole].permissions.map((permission) => (
                          <span
                            key={`${managedUser.id}-${permission}`}
                            className="inline-flex rounded-full border border-black/5 bg-white px-3 py-1 text-xs font-semibold text-foreground"
                          >
                            {getMerchantPermissionLabel(permission)}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span
                        className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-semibold ${
                          managedUser.mustChangePassword
                            ? 'border-amber-200 bg-amber-50 text-amber-800'
                            : 'border-primary/15 bg-primary/5 text-primary'
                        }`}
                      >
                        {managedUser.mustChangePassword ? 'Troca pendente' : 'Senha regular'}
                      </span>
                      <span className="inline-flex rounded-full border border-black/5 bg-white px-3 py-1 text-[11px] font-semibold text-foreground">
                        Atualizado em {formatDateTime(managedUser.updatedAt)}
                      </span>
                    </div>

                    <div className="mt-4">
                      <Button size="sm" onClick={() => openEditDialog(managedUser)} className="w-full gap-2 sm:w-auto">
                        <UserCog className="h-4 w-4" />
                        Editar
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : null}
      </DashboardPanel>

      <UserEditorDialog
        open={editorOpen}
        user={selectedUser}
        onOpenChange={(nextOpen) => {
          setEditorOpen(nextOpen);
          if (!nextOpen) {
            setSelectedUser(null);
          }
        }}
        onSaved={handleSaved}
      />
    </div>
  );
}
