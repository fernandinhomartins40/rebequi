import {
  DashboardNavAction,
  DashboardMetric,
  DashboardSurface,
  DashboardSection,
} from "@/components/dashboard/DashboardElements";
import type { ReactNode, HTMLAttributes } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DashboardNavItem } from "./types";

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
  const Icon = item.icon;
  return (
    <DashboardNavAction
      label={item.label}
      badge={item.badge}
      icon={<Icon />}
      active={active}
      onClick={onClick}
    />
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
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2.5 text-[11px] font-semibold transition-all",
        active
          ? "text-white shadow-sm"
          : "text-muted-foreground hover:bg-slate-100 hover:text-foreground",
      )}
      style={{ background: active ? "#0668ff" : undefined }}
    >
      <span className="relative">
        <Icon className="h-[18px] w-[18px]" />
        {badge ? (
          <span
            className={cn(
              "absolute -right-2 -top-1.5 min-w-[1rem] rounded-full px-1 py-px text-[9px] font-bold leading-none",
              active ? "bg-white text-foreground" : "text-white",
            )}
            style={!active ? { background: "hsl(220,25%,10%)" } : undefined}
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

type MetricTone = "slate" | "amber" | "sky" | "emerald";

export function MetricCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "slate",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: MetricTone;
}) {
  return (
    <DashboardMetric
      label={label}
      value={value}
      hint={hint}
      tone={tone}
      icon={<Icon className="h-4 w-4" />}
    />
  );
}

// ── Data row (perfil) ─────────────────────────────────────────────────────────

export function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium text-foreground sm:max-w-[60%] sm:text-right">
        {value}
      </span>
    </div>
  );
}

// ── Quick-link ────────────────────────────────────────────────────────────────

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
      className="flex w-full items-center justify-between rounded-lg border border-slate-200/70 bg-white px-4 py-3 text-left text-sm font-medium text-foreground transition-colors hover:bg-slate-50"
    >
      <span>{label}</span>
      <ArrowRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

// ── Section panel (card simples) ──────────────────────────────────────────────

export function SectionPanel({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <DashboardSurface {...props} className={className}>
      {children}
    </DashboardSurface>
  );
}

// ── Content panel com header (equivalente ao DashboardPanel do admin) ─────────

export const ContentPanel = DashboardSection;
