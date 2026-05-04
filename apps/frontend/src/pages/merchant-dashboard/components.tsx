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

export function MerchantSidebarHeader() {
  return (
    <SidebarHeader className="px-4 pb-0 pt-4">
      <Link
        to="/"
        className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/8"
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/10 ring-1 ring-white/15">
          <img
            src="/lovable-uploads/73f13341-b66a-4a9f-aa28-4bd40213b85f.png"
            alt="Rebequi Logo"
            className="h-6 w-auto object-contain"
          />
        </div>
        <div className="min-w-0 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-[13px] font-bold text-sidebar-foreground">Rebequi</p>
          <p className="truncate text-[11px] text-sidebar-foreground/50">Painel administrativo</p>
        </div>
      </Link>
      <div className="mt-3 h-px bg-sidebar-border" />
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
    <SidebarContent className="merchant-dashboard-scroll px-3 py-3">
      <SidebarGroup className="p-0">
        <SidebarGroupLabel className="mb-1.5 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-sidebar-foreground/35">
          Navegação
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu className="gap-1">
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
                      'h-auto min-h-[2.625rem] rounded-xl px-2.5 py-2 transition-all duration-200',
                      isActive
                        ? 'bg-white/12 text-sidebar-foreground shadow-none'
                        : 'text-sidebar-foreground/60 hover:bg-white/8 hover:text-sidebar-foreground'
                    )}
                  >
                    <NavLink to={item.href}>
                      <div
                        className={cn(
                          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                          isActive
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                            : 'bg-white/8 text-sidebar-foreground/60'
                        )}
                      >
                        <item.icon className="h-3.5 w-3.5" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col text-left group-data-[collapsible=icon]:hidden">
                        <span className="text-[13px] font-semibold leading-tight">{item.label}</span>
                        <span className="truncate text-[11px] opacity-50">{item.description}</span>
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                  {item.badge ? (
                    <SidebarMenuBadge className="rounded-full bg-sidebar-accent/20 px-2 text-[10px] font-bold text-sidebar-accent">
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
    <SidebarFooter className="px-3 pb-4 pt-2">
      <div className="mb-2 h-px bg-sidebar-border" />

      {/* User info — hidden when collapsed to icon */}
      <div className="mb-2 flex items-center gap-2.5 rounded-xl px-2 py-2 group-data-[collapsible=icon]:hidden">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-[12px] font-bold text-sidebar-accent-foreground">
          {userEmail.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-semibold text-sidebar-foreground">{userEmail}</p>
          <p className="text-[11px] text-sidebar-foreground/50">{roleLabel}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-9 w-full justify-start gap-2 rounded-xl text-sidebar-foreground/60 transition-colors hover:bg-white/8 hover:text-sidebar-foreground"
          asChild
        >
          <Link to="/">
            <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
            <span className="group-data-[collapsible=icon]:hidden">Ver loja</span>
          </Link>
        </Button>

        <Button
          size="sm"
          variant="ghost"
          className="h-9 w-full justify-start gap-2 rounded-xl text-sidebar-foreground/60 transition-colors hover:bg-white/8 hover:text-sidebar-foreground"
          onClick={() => void onLogout()}
        >
          <LogOut className="h-3.5 w-3.5 shrink-0" />
          <span className="group-data-[collapsible=icon]:hidden">Sair</span>
        </Button>
      </div>
    </SidebarFooter>
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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-extrabold tracking-tight text-foreground sm:text-2xl lg:text-3xl">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
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
        <h3 className="text-base font-bold text-foreground">{title}</h3>
        {description ? (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

// ─── Metric cards ────────────────────────────────────────────────────────────

/*
 * Tones usando a paleta da marca Rebequi:
 * - blue = brand-blue (#2563EB)
 * - red = brand-red (#cc2227 / #DC2626)
 * - yellow = brand-yellow (#f9ef38 / #FFD700)
 * - green = variant of brand-blue (teal-ish)
 */
type MetricTone = 'default' | 'blue' | 'green' | 'yellow' | 'red';

const metricToneStyles: Record<MetricTone, { icon: string; value: string; bg: string }> = {
  default: { icon: 'bg-muted text-muted-foreground', value: 'text-foreground', bg: '' },
  blue: { icon: 'bg-brand-blue/10 text-brand-blue', value: 'text-brand-blue', bg: '' },
  green: { icon: 'bg-emerald-50 text-emerald-600', value: 'text-emerald-600', bg: '' },
  yellow: { icon: 'bg-brand-yellow/20 text-foreground', value: 'text-foreground', bg: '' },
  red: { icon: 'bg-brand-red/10 text-brand-red', value: 'text-brand-red', bg: '' },
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
  const styles = metricToneStyles[tone];

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-border/50 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className={cn('mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', styles.icon)}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn('mt-0.5 text-2xl font-extrabold leading-none tracking-tight', styles.value)}>{value}</p>
        {delta ? <p className="mt-1 text-[11px] text-muted-foreground">{delta}</p> : null}
      </div>
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
  children,
}: {
  className?: string;
  contentClassName?: string;
  description?: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={cn('rounded-2xl border border-border/50 bg-white shadow-sm transition-all duration-200', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-border/30 px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold text-foreground">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn('p-5', contentClassName)}>{children}</div>
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
    <div className="rounded-2xl border border-border/50 bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-extrabold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function MetricChip({
  label,
  tone = 'neutral',
  value,
}: {
  label: string;
  tone?: 'blue' | 'green' | 'neutral' | 'red' | 'yellow';
  value: string;
}) {
  const toneClass =
    tone === 'blue'
      ? 'border-brand-blue/20 bg-brand-blue/5 text-brand-blue'
      : tone === 'green'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-600'
        : tone === 'red'
          ? 'border-brand-red/20 bg-brand-red/5 text-brand-red'
          : tone === 'yellow'
            ? 'border-brand-yellow/30 bg-brand-yellow/10 text-foreground'
            : 'border-border/60 bg-muted text-foreground';

  return (
    <div className={cn('rounded-xl border px-3 py-2', toneClass)}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-0.5 text-sm font-bold">{value}</p>
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
  tone?: 'blue' | 'green' | 'neutral' | 'red' | 'yellow';
  title: string;
}) {
  const badgeClass =
    tone === 'green'
      ? 'bg-emerald-50 text-emerald-600 ring-emerald-200'
      : tone === 'red'
        ? 'bg-brand-red/8 text-brand-red ring-brand-red/20'
        : tone === 'yellow'
          ? 'bg-brand-yellow/15 text-foreground ring-brand-yellow/30'
          : tone === 'blue'
            ? 'bg-brand-blue/8 text-brand-blue ring-brand-blue/20'
            : 'bg-muted text-muted-foreground ring-border';

  const dotColor =
    tone === 'green'
      ? 'bg-emerald-500'
      : tone === 'red'
        ? 'bg-brand-red'
        : tone === 'yellow'
          ? 'bg-brand-yellow'
          : tone === 'blue'
            ? 'bg-brand-blue'
            : 'bg-muted-foreground';

  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/40 bg-muted/30 px-4 py-3 transition-colors duration-200 hover:bg-muted/50">
      <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', dotColor, tone !== 'neutral' && 'shadow-[0_0_6px_0px_currentColor]')} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-foreground">{title}</p>
          <span className={cn('shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-inset', badgeClass)}>
            {status}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export function PulseLine({ title, value, toneClass }: { title: string; value: string; toneClass: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/30 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-foreground">{title}</p>
        <div className={cn('rounded-full px-2.5 py-0.5 text-[11px] font-bold', toneClass)}>ativo</div>
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
    <div className="rounded-xl border border-border/40 bg-muted/30 p-4">
      <p className="text-2xl font-extrabold tracking-tight text-foreground">{value}</p>
      <p className="mt-0.5 font-bold text-foreground">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/40 bg-muted/30 px-4 py-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-all text-sm font-bold text-foreground">{value}</p>
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
    <div className="rounded-xl border border-border/40 bg-muted/30 p-4">
      <div className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold', badgeClass)}>{title}</div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
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
        <div className={cn('inline-flex w-fit rounded-full px-2.5 py-0.5 text-xs font-bold', badgeClassName)}>
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
            <li key={item} className={cn('rounded-xl border px-4 py-3 text-sm', itemClassName)}>
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
