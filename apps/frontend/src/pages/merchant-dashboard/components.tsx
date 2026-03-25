import type { ReactNode } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { ArrowLeft, LogOut } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
          className="flex flex-col items-start rounded-3xl border border-[#eadfba] bg-white/92 px-4 py-4 shadow-[0_16px_40px_-34px_rgba(37,99,235,0.32)] transition-colors hover:bg-white"
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
  onLogout,
}: {
  userEmail: string;
  onLogout: () => Promise<void>;
}) {
  return (
    <>
      <SidebarSeparator className="mx-4" />

      <SidebarFooter className="gap-3 px-4 pb-4 pt-2">
        <div className="rounded-3xl border border-[#eadfba] bg-white/90 p-4 shadow-[0_16px_38px_-34px_rgba(37,99,235,0.25)] group-data-[collapsible=icon]:hidden">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Sessao ativa</p>
          <p className="mt-3 break-all text-sm font-semibold text-foreground">{userEmail}</p>
          <p className="mt-1 text-xs text-muted-foreground">Role ADMIN validada pelo backend.</p>
        </div>

        <Button
          className="w-full justify-start gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/90"
          onClick={() => void onLogout()}
        >
          <LogOut className="h-4 w-4" />
          <span className="group-data-[collapsible=icon]:hidden">Sair do painel</span>
        </Button>

        <Button
          asChild
          variant="outline"
          className="w-full justify-start gap-2 border-black/10 bg-white/75 text-foreground hover:bg-white"
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
      ? 'border-[#e9dfbb] bg-[linear-gradient(160deg,rgba(255,250,224,0.9),rgba(255,255,255,0.97))] shadow-[0_28px_72px_-48px_rgba(255,215,0,0.3)]'
      : tone === 'red'
        ? 'border-[#f0d7d7] bg-[linear-gradient(160deg,rgba(255,244,244,0.92),rgba(255,255,255,0.97))] shadow-[0_28px_72px_-48px_rgba(220,38,38,0.2)]'
        : 'border-[#dfe6f7] bg-[linear-gradient(160deg,rgba(239,246,255,0.94),rgba(255,255,255,0.97))] shadow-[0_28px_72px_-48px_rgba(37,99,235,0.22)]';

  return (
    <Card className={toneClass}>
      <CardHeader className="space-y-3">
        <Badge className="w-fit border-none bg-secondary text-secondary-foreground">{badge}</Badge>
        <div className="space-y-2">
          <CardTitle className="text-3xl leading-tight">{title}</CardTitle>
          <CardDescription className="max-w-3xl text-sm leading-6 text-muted-foreground">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      {actions ? <CardContent className="flex flex-wrap gap-3">{actions}</CardContent> : null}
    </Card>
  );
}

export function SummaryTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white/76 p-4 shadow-[0_18px_42px_-38px_rgba(15,23,42,0.25)]">
      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className="mt-3 break-all text-xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

export function PulseLine({ title, value, toneClass }: { title: string; value: string; toneClass: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
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
    <Card className="border-black/5 bg-white/88 shadow-[0_20px_55px_-40px_rgba(15,23,42,0.22)]">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <div className="rounded-full bg-primary/10 p-2">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="break-all text-2xl font-bold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground">{delta}</p>
      </CardContent>
    </Card>
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
    <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 font-semibold text-foreground">{label}</p>
      <p className="mt-1 text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-slate-50 px-4 py-3">
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
    <div className="rounded-2xl border border-black/5 bg-slate-50 p-4">
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
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="mt-2 leading-6 text-muted-foreground">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
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
