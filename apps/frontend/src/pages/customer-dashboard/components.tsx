import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardNavItem } from './types';

// ── Sidebar nav item (desktop) ────────────────────────────────────────────

export function NavItem({
  item,
  active,
  onClick,
}: {
  item: DashboardNavItem;
  active: boolean;
  onClick: () => void;
}) {
  const { icon: Icon, label, description, badge } = item;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition-all',
        active
          ? 'border-primary/20 bg-primary/5 text-foreground shadow-sm'
          : 'border-transparent bg-transparent text-foreground/70 hover:border-slate-200 hover:bg-white hover:text-foreground'
      )}
    >
      <span
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors',
          active
            ? 'bg-primary text-white shadow-sm shadow-primary/20'
            : 'bg-slate-100 text-slate-500 group-hover:bg-primary/10 group-hover:text-primary'
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1 pt-0.5">
        <span className="flex items-center gap-2">
          <span className="block text-[13px] font-semibold leading-tight">{label}</span>
          {badge ? (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 block text-[11px] text-muted-foreground">{description}</span>
      </span>
      <ArrowRight
        className={cn(
          'mt-1 h-3.5 w-3.5 shrink-0 transition-all',
          active
            ? 'text-primary opacity-100'
            : 'translate-x-[-4px] text-muted-foreground opacity-0 group-hover:translate-x-0 group-hover:opacity-60'
        )}
      />
    </button>
  );
}

// ── Bottom nav item (mobile) ──────────────────────────────────────────────

export function BottomNavItem({
  item,
  active,
  onClick,
}: {
  item: DashboardNavItem;
  active: boolean;
  onClick: () => void;
}) {
  const { icon: Icon, label, badge } = item;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-[11px] font-semibold transition-all',
        active
          ? 'bg-primary text-white shadow-sm'
          : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground'
      )}
    >
      <span className="relative">
        <Icon className="h-5 w-5" />
        {badge ? (
          <span
            className={cn(
              'absolute -right-2 -top-2 min-w-4 rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none',
              active ? 'bg-white text-primary' : 'bg-primary text-white'
            )}
          >
            {badge}
          </span>
        ) : null}
      </span>
      <span className="leading-none">{label}</span>
    </button>
  );
}

// ── Metric card ────────────────────────────────────────────────────────────

export function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = 'slate',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: 'slate' | 'amber' | 'sky' | 'emerald';
}) {
  const iconClass = {
    slate: 'bg-slate-100 text-slate-500',
    amber: 'bg-amber-100 text-amber-600',
    sky: 'bg-sky-100 text-sky-600',
    emerald: 'bg-emerald-100 text-emerald-600',
  }[tone];

  const valueClass = {
    slate: 'text-foreground',
    amber: 'text-amber-700',
    sky: 'text-sky-700',
    emerald: 'text-emerald-700',
  }[tone];

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', iconClass)}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className={cn('mt-0.5 text-xl font-bold leading-none', valueClass)}>{value}</p>
        {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

// ── Generic data row (profile) ────────────────────────────────────────────

export function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground sm:max-w-[60%] sm:text-right">{value}</span>
    </div>
  );
}

// ── Quick-link button ─────────────────────────────────────────────────────

export function QuickLink({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-between rounded-lg border border-slate-200/70 bg-white px-3 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
    >
      <span>{label}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

// ── Section panel ─────────────────────────────────────────────────────────

export function SectionPanel({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('rounded-xl border border-slate-200/70 bg-white shadow-sm', className)}>
      {children}
    </div>
  );
}
