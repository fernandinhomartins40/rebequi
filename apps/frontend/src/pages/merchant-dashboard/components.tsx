import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { getMerchantRoleLabel, isMerchantUserRole } from '@rebequi/shared/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { MerchantNavItem } from './config';

// ─── Tons de estado compartilhados ───────────────────────────────────────────

type StatusTone = 'blue' | 'green' | 'neutral' | 'red' | 'yellow';

const statusPillClass: Record<StatusTone, string> = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  green: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  neutral: 'border-border/60 bg-muted text-muted-foreground',
  red: 'border-red-200 bg-red-50 text-red-700',
  yellow: 'border-amber-200 bg-amber-50 text-amber-700',
};

const statusDotClass: Record<StatusTone, string> = {
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  neutral: 'bg-muted-foreground/50',
  red: 'bg-red-500',
  yellow: 'bg-amber-500',
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export function MerchantSidebarHeader() {
  return (
    <SidebarHeader className="px-3 pb-2 pt-3">
      <Link
        to="/"
        className="group flex items-center gap-2.5 rounded-md px-2 py-2 transition-colors hover:bg-sidebar-accent"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-yellow text-sm font-bold text-foreground">
          R
        </div>
        <div className="min-w-0 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">Rebequi</p>
          <p className="truncate text-xs text-sidebar-foreground/70">Painel do lojista</p>
        </div>
      </Link>
    </SidebarHeader>
  );
}

export function AdminSidebarNavigation({
  activePath,
  items,
}: {
  activePath: string;
  items: MerchantNavItem[];
}) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <SidebarContent className="merchant-dashboard-scroll px-2 py-2">
      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="px-2 text-xs font-medium text-sidebar-foreground/60">
          Gestão da loja
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-0.5">
            {items.map((item) => {
              const isActive = activePath === item.href;

              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    isActive={isActive}
                    onClick={() => {
                      if (isMobile) setOpenMobile(false);
                    }}
                    className={cn(
                      'h-9 rounded-md px-2 text-[13px] transition-colors',
                      isActive
                        ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <NavLink to={item.href}>
                      <item.icon
                        className={cn(
                          'h-4 w-4 shrink-0',
                          isActive ? 'text-sidebar-accent-foreground' : 'text-sidebar-foreground/60'
                        )}
                      />
                      <span className="truncate group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </NavLink>
                  </SidebarMenuButton>
                  {item.badge ? (
                    <SidebarMenuBadge className="rounded-full bg-brand-blue/10 px-1.5 text-[10px] font-semibold text-brand-blue">
                      {item.badge}
                    </SidebarMenuBadge>
                  ) : null}
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>
  );
}

export function MerchantSidebarFooter({
  userEmail,
  userRole,
  onLogout,
}: {
  userEmail: string;
  userRole: string;
  onLogout: () => Promise<void>;
}) {
  const roleLabel = isMerchantUserRole(userRole) ? getMerchantRoleLabel(userRole) : userRole;

  return (
    <SidebarFooter className="px-2 pb-3 pt-1">
      <div className="mb-1 h-px bg-sidebar-border" />

      {/* User info — hidden when collapsed to icon */}
      <div className="flex items-center gap-2.5 rounded-md px-2 py-2 group-data-[collapsible=icon]:hidden">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-sidebar-border bg-background text-xs font-semibold text-foreground">
          {userEmail.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-sidebar-accent-foreground">{userEmail}</p>
          <p className="truncate text-[11px] text-sidebar-foreground/70">{roleLabel}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-0.5">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-full justify-start gap-2 rounded-md px-2 text-[13px] font-normal text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          asChild
        >
          <Link to="/">
            <ArrowLeft className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
            <span className="group-data-[collapsible=icon]:hidden">Ver loja</span>
          </Link>
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-full justify-start gap-2 rounded-md px-2 text-[13px] font-normal text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          onClick={() => void onLogout()}
        >
          <LogOut className="h-4 w-4 shrink-0 text-sidebar-foreground/60" />
          <span className="group-data-[collapsible=icon]:hidden">Sair</span>
        </Button>
      </div>
    </SidebarFooter>
  );
}

// ─── Editor page helpers ─────────────────────────────────────────────────────

export function EditorBackLink({ to, label = 'Voltar' }: { to: string; label?: string }) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className="-ml-2 w-fit gap-1.5 text-muted-foreground hover:text-foreground"
    >
      <Link to={to}>
        <ArrowLeft className="h-4 w-4" />
        {label}
      </Link>
    </Button>
  );
}

export function EditorFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-border/70 bg-card p-4">
      {children}
    </div>
  );
}

export function EditorLoading() {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
      Carregando…
    </div>
  );
}

export function EditorError({ message, backTo }: { message: string; backTo: string }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
      <EditorBackLink to={backTo} />
    </div>
  );
}

// ─── Page-level header strip ─────────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">{title}</h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

// ─── Section divider with optional action ────────────────────────────────────

export function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

// ─── Metric cards ────────────────────────────────────────────────────────────

type MetricTone = 'default' | 'blue' | 'green' | 'yellow' | 'red';

const metricValueClass: Record<MetricTone, string> = {
  default: 'text-foreground',
  blue: 'text-foreground',
  green: 'text-foreground',
  yellow: 'text-foreground',
  red: 'text-red-600',
};

const metricDotClass: Record<MetricTone, string> = {
  default: '',
  blue: 'bg-blue-500',
  green: 'bg-emerald-500',
  yellow: 'bg-amber-500',
  red: 'bg-red-500',
};

export function StatCard({
  icon,
  label,
  value,
  delta,
  tone = 'default',
}: {
  icon: ReactNode;
  label: string;
  value: string;
  delta?: string;
  tone?: MetricTone;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          {tone !== 'default' ? (
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', metricDotClass[tone])} />
          ) : null}
          <span className="truncate text-[13px] font-medium text-muted-foreground">{label}</span>
        </div>
        <span className="shrink-0 text-muted-foreground/60">{icon}</span>
      </div>

      <p className={cn('mt-3 text-2xl font-semibold tabular-nums tracking-tight', metricValueClass[tone])}>
        {value}
      </p>
      {delta ? <p className="mt-1 text-xs text-muted-foreground">{delta}</p> : null}
    </div>
  );
}

// ─── Content panels ──────────────────────────────────────────────────────────

export function DashboardPanel({
  className,
  contentClassName,
  description,
  title,
  action,
  badge,
  accent: _accent = 'blue',
  children,
}: {
  className?: string;
  contentClassName?: string;
  description?: string;
  title: string;
  action?: ReactNode;
  badge?: ReactNode;
  accent?: 'blue' | 'red' | 'yellow';
  children: ReactNode;
}) {
  return (
    <div className={cn('rounded-xl border border-border/70 bg-card', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="min-w-0">
          {badge ? (
            <p className="mb-1 text-xs font-medium text-muted-foreground">{badge}</p>
          ) : null}
          <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn('px-5 py-4', contentClassName)}>{children}</div>
    </div>
  );
}

// ─── Retained legacy exports (used elsewhere) ────────────────────────────────

/** @deprecated Use PageHeader instead */
export function SectionLeadCard({
  badge: _badge,
  title,
  description,
  tone: _tone,
  actions,
}: {
  badge: string;
  title: string;
  description: string;
  tone: 'yellow' | 'blue' | 'red';
  actions?: ReactNode;
}) {
  return (
    <PageHeader title={title} description={description} actions={actions} />
  );
}

export function SummaryTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border/70 bg-card p-5">
      <p className="text-[13px] font-medium text-muted-foreground">{label}</p>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function MetricChip({
  label,
  tone: _tone = 'neutral',
  value,
}: {
  label: string;
  tone?: StatusTone;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/40 px-4 py-2.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

// ─── Signal/status rows ──────────────────────────────────────────────────────

export function SignalRow({
  description,
  status,
  tone = 'neutral',
  title,
}: {
  description: string;
  status: string;
  tone?: StatusTone;
  title: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-border/60 px-4 py-3">
      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', statusDotClass[tone])} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <span className={cn('shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium', statusPillClass[tone])}>
            {status}
          </span>
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function PulseLine({ title, value, toneClass }: { title: string; value: string; toneClass: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <div className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-medium', toneClass)}>ativo</div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{value}</p>
    </div>
  );
}

export function SummarySurface({
  value,
  label,
  description,
}: {
  value: string;
  label: string;
  description: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-5">
      <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">{value}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-all text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}

export function GuaranteeCard({
  title,
  description,
  badgeClass,
}: {
  title: string;
  description: string;
  badgeClass: string;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/30 p-5">
      <div className={cn('inline-flex rounded-full px-3 py-1 text-[11px] font-medium', badgeClass)}>{title}</div>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

export function StateCard({
  badgeClassName,
  className,
  description,
  itemClassName,
  items,
  title,
}: {
  badgeClassName: string;
  className: string;
  description: string;
  itemClassName: string;
  items: string[];
  title: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="space-y-3">
        <div className={cn('inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-medium', badgeClassName)}>
          Estado atual
        </div>
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="mt-1 text-muted-foreground">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item} className={cn('rounded-lg border px-4 py-3 text-sm', itemClassName)}>
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
