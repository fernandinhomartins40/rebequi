import type { ReactNode, HTMLAttributes } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DashboardNavItem } from './types';

// ── Sidebar nav item (desktop — dark sidebar) ─────────────────────────────────

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
        'group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-all',
        active
          ? 'text-[hsl(215,20%,88%)]'
          : 'text-[rgba(215,220,230,0.6)] hover:text-[hsl(215,20%,88%)]',
      )}
      style={{ background: active ? 'rgba(255,255,255,0.10)' : undefined }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = ''; }}
    >
      {/* Ícone */}
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors"
        style={{
          background: active ? 'hsl(47,100%,50%)' : 'rgba(255,255,255,0.08)',
          color: active ? 'hsl(0,0%,9%)' : 'rgba(215,220,230,0.6)',
        }}
      >
        <Icon className="h-3.5 w-3.5" />
      </div>

      {/* Texto */}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5 text-[13px] font-medium leading-tight">
          {label}
          {badge ? (
            <span
              className="rounded-full px-1.5 py-px text-[10px] font-bold leading-none"
              style={{ background: 'hsl(47,100%,50%)', color: 'hsl(0,0%,9%)' }}
            >
              {badge}
            </span>
          ) : null}
        </span>
        <span className="mt-0.5 truncate text-[11px] opacity-50">{description}</span>
      </div>
    </button>
  );
}

// ── Bottom nav item (mobile) ──────────────────────────────────────────────────

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
        'relative flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2.5 text-[11px] font-semibold transition-all',
        active
          ? 'text-white shadow-sm'
          : 'text-muted-foreground hover:bg-slate-100 hover:text-foreground',
      )}
      style={{ background: active ? 'hsl(220,25%,10%)' : undefined }}
    >
      <span className="relative">
        <Icon className="h-[18px] w-[18px]" />
        {badge ? (
          <span
            className={cn(
              'absolute -right-2 -top-1.5 min-w-[1rem] rounded-full px-1 py-px text-[9px] font-bold leading-none',
              active ? 'bg-white text-foreground' : 'text-white',
            )}
            style={!active ? { background: 'hsl(220,25%,10%)' } : undefined}
          >
            {badge}
          </span>
        ) : null}
      </span>
      <span className="leading-none">{label}</span>
    </button>
  );
}

// ── Metric card ───────────────────────────────────────────────────────────────

type MetricTone = 'slate' | 'amber' | 'sky' | 'emerald';

const toneIcon: Record<MetricTone, string> = {
  slate: 'bg-slate-100 text-slate-500',
  amber: 'bg-amber-100 text-amber-600',
  sky: 'bg-sky-100 text-sky-600',
  emerald: 'bg-emerald-100 text-emerald-600',
};
const toneValue: Record<MetricTone, string> = {
  slate: 'text-foreground',
  amber: 'text-amber-700',
  sky: 'text-sky-700',
  emerald: 'text-emerald-700',
};

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
  tone?: MetricTone;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white p-4 shadow-sm">
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', toneIcon[tone])}>
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className={cn('mt-0.5 text-2xl font-bold leading-none', toneValue[tone])}>{value}</p>
        {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
    </div>
  );
}

// ── Data row (perfil) ─────────────────────────────────────────────────────────

export function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground sm:max-w-[60%] sm:text-right">{value}</span>
    </div>
  );
}

// ── Quick-link ────────────────────────────────────────────────────────────────

export function QuickLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-lg border border-slate-200/70 bg-white px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
    >
      <span>{label}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

// ── Section panel (card simples) ──────────────────────────────────────────────

export function SectionPanel({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={cn('rounded-xl border border-slate-200/70 bg-white shadow-sm', className)}>
      {children}
    </div>
  );
}

// ── Content panel com header (equivalente ao DashboardPanel do admin) ─────────

export function ContentPanel({
  title,
  description,
  action,
  contentClassName,
  className,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  contentClassName?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn('rounded-xl border border-slate-200/70 bg-white shadow-sm', className)}>
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-foreground">{title}</h3>
          {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className={cn('p-5', contentClassName)}>{children}</div>
    </div>
  );
}
