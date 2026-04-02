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
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import type { MerchantNavItem } from './config';

export function MerchantSidebarHeader() {
  return (
    <>
      <SidebarHeader className="gap-4 px-4 py-4">
        <Link
          to="/"
          className="flex flex-col items-start rounded-2xl border border-slate-200/80 bg-white/95 px-4 py-4 shadow-[0_14px_34px_-34px_rgba(15,23,42,0.28)] transition-colors hover:bg-white"
        >
          <img
            src="/lovable-uploads/73f13341-b66a-4a9f-aa28-4bd40213b85f.png"
            alt="Rebequi Logo"
            className="h-10 w-auto shrink-0"
          />
          <div className="mt-3 space-y-1 group-data-[collapsible=icon]:hidden">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground">Admin</p>
            <p className="text-sm font-semibold text-foreground">Painel administrativo</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarSeparator className="mx-4" />
    </>
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
    <SidebarContent className="merchant-dashboard-scroll px-2 pb-4 pt-2">
      <SidebarGroup>
        <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          Navegacao
        </SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {items.map((item) => {
              const isActive = activePath === item.href;

              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    isActive={isActive}
                    onClick={() => {
                      if (isMobile) {
                        setOpenMobile(false);
                      }
                    }}
                    className={cn(
                      'h-auto min-h-12 rounded-2xl px-3 py-3 text-sidebar-foreground/80 hover:bg-white hover:text-foreground',
                      'data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground data-[active=true]:shadow-[0_20px_40px_-28px_rgba(255,215,0,0.75)]'
                    )}
                  >
                    <NavLink to={item.href}>
                      <item.icon className="h-4 w-4 shrink-0" />
                      <div className="flex min-w-0 flex-1 flex-col text-left group-data-[collapsible=icon]:hidden">
                        <span className="font-semibold">{item.label}</span>
                        <span className="text-xs text-current/60">{item.description}</span>
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                  {item.badge ? (
                    <SidebarMenuBadge className="rounded-full bg-primary/10 px-2 text-[10px] text-primary">
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
    <>
      <SidebarSeparator className="mx-4" />

      <SidebarFooter className="gap-3 px-4 pb-4 pt-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white/95 p-4 shadow-[0_14px_30px_-34px_rgba(15,23,42,0.28)] group-data-[collapsible=icon]:hidden">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Sessao ativa</p>
          <p className="mt-3 break-all text-sm font-semibold text-foreground">{userEmail}</p>
          <p className="mt-1 text-xs text-muted-foreground">{roleLabel}</p>
        </div>

        <Button
          className="w-full justify-start gap-2 rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90"
          onClick={() => void onLogout()}
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sair do painel</span>
        </Button>

        <Button
          asChild
          variant="outline"
          className="w-full justify-start gap-2 rounded-xl border-black/10 bg-white/80 text-foreground hover:bg-white"
        >
          <Link to="/">
            <ArrowLeft className="h-4 w-4" />
            <span className="group-data-[collapsible=icon]:hidden">Voltar para a loja</span>
          </Link>
        </Button>
      </SidebarFooter>
    </>
  );
}

export function SectionLeadCard({
  badge,
  title,
  description,
  tone,
  actions,
}: {
  badge: string;
  title: string;
  description: string;
  tone: 'yellow' | 'blue' | 'red';
  actions?: ReactNode;
}) {
  const toneClass =
    tone === 'yellow'
      ? 'border-amber-200/50 bg-amber-50/60'
      : tone === 'red'
        ? 'border-red-200/50 bg-red-50/60'
        : 'border-blue-200/40 bg-blue-50/50';

  return (
    <div className={cn('animate-fade-in-up rounded-2xl border px-4 py-4 md:px-5 md:py-5', toneClass)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{badge}</p>
          <h2 className="mt-2 text-lg font-semibold text-foreground md:text-xl">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function SummaryTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-[0_14px_32px_-36px_rgba(15,23,42,0.24)]">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-3 break-words text-lg font-bold text-foreground sm:text-xl">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function DashboardPanel({
  badge,
  badgeClassName,
  className,
  contentClassName,
  description,
  title,
  children,
}: {
  badge?: string;
  badgeClassName?: string;
  className?: string;
  contentClassName?: string;
  description: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('animate-fade-in-up rounded-2xl border border-slate-200/70 bg-white/94 p-4 shadow-[0_14px_34px_-36px_rgba(15,23,42,0.28)] md:p-5', className)}>
      <div className="mb-3 md:mb-4">
        <h3 className="text-[15px] font-semibold text-foreground md:text-base">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <div className={cn('space-y-2.5', contentClassName)}>{children}</div>
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
      ? 'border-primary/15 bg-primary/5 text-primary'
      : tone === 'green'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : tone === 'red'
          ? 'border-red-200 bg-red-50 text-red-700'
          : tone === 'yellow'
            ? 'border-amber-200 bg-amber-50 text-amber-800'
            : 'border-slate-200 bg-slate-50 text-foreground';

  return (
    <div className={cn('rounded-2xl border px-3 py-2.5', toneClass)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] opacity-80">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold leading-snug">{value}</p>
    </div>
  );
}

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
  const toneClass =
    tone === 'blue'
      ? 'bg-primary/10 text-primary'
      : tone === 'green'
        ? 'bg-emerald-100 text-emerald-700'
        : tone === 'red'
          ? 'bg-red-100 text-red-700'
          : tone === 'yellow'
            ? 'bg-amber-100 text-amber-800'
            : 'bg-slate-100 text-slate-700';

  const dotColor =
    tone === 'green'
      ? 'bg-emerald-500'
      : tone === 'red'
        ? 'bg-red-500'
        : tone === 'yellow'
          ? 'bg-amber-500'
          : tone === 'blue'
            ? 'bg-blue-500'
            : 'bg-slate-400';

  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/85 px-4 py-3.5 transition-colors duration-200 hover:bg-slate-100/80">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', dotColor, tone !== 'neutral' && 'animate-pulse-soft')} />
          <p className="font-semibold text-foreground">{title}</p>
        </div>
        <div className={cn('rounded-full px-3 py-1 text-[11px] font-semibold', toneClass)}>{status}</div>
      </div>
      <p className="mt-2 pl-[18px] text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

export function PulseLine({ title, value, toneClass }: { title: string; value: string; toneClass: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/85 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-semibold text-foreground">{title}</p>
        <div className={cn('rounded-full px-3 py-1 text-[11px] font-semibold', toneClass)}>ativo</div>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{value}</p>
    </div>
  );
}

export function StatCard({
  icon,
  label,
  value,
  delta,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  delta: string;
}) {
  return (
    <div className="animate-fade-in-up flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white px-4 py-4 transition-shadow duration-200 hover:shadow-sm">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/8">{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-lg font-bold text-foreground">{value}</p>
      </div>
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
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/85 p-4">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/85 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold text-foreground">{value}</p>
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
    <div className="rounded-2xl border border-slate-200/70 bg-slate-50/85 p-4">
      <div className={cn('inline-flex rounded-full px-3 py-1 text-[11px] font-semibold', badgeClass)}>{title}</div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
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
        <div className={cn('inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold', badgeClassName)}>
          Estado atual
        </div>
        <div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription className="mt-2 leading-6 text-muted-foreground">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item} className={cn('rounded-2xl border px-4 py-3 text-sm leading-6', itemClassName)}>
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
