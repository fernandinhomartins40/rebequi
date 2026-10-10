import { useId, type ReactNode, type ButtonHTMLAttributes } from "react";
import { Search, X, Inbox, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function DashboardSearch({ value, onChange, placeholder, className }: {
  value: string; onChange: (value: string) => void; placeholder: string; className?: string;
}) {
  const id = useId();
  return <div className={cn("dashboard-search", className)}>
    <label htmlFor={id} className="sr-only">{placeholder}</label>
    <Search aria-hidden="true" size={17} />
    <Input id={id} type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="pl-9 pr-11" />
    {value ? <button type="button" aria-label="Limpar busca" onClick={() => {
      onChange(""); document.getElementById(id)?.focus();
    }}><X size={16} aria-hidden="true" /></button> : null}
  </div>;
}

export function DashboardEmpty({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="dashboard-empty">
    <Inbox size={24} aria-hidden="true" />
    <p className="font-semibold text-foreground">{title}</p>
    {description ? <p>{description}</p> : null}
    {action ? <div className="dashboard-actions">{action}</div> : null}
  </div>;
}

export function DashboardLoading({ label = "Carregando…" }: { label?: string }) {
  return <div role="status" aria-live="polite" className="dashboard-loading">
    <span className="sr-only">{label}</span>
    {[1, 2, 3].map((key) => <div key={key} aria-hidden="true" className="h-16 animate-pulse rounded-lg bg-muted" />)}
  </div>;
}

export function DashboardError({ message, onRetry, retrying = false }: { message: string; onRetry: () => void; retrying?: boolean }) {
  return <div className="dashboard-error">
    <p role="alert"><AlertCircle size={18} aria-hidden="true" />{message}</p>
    <Button type="button" variant="outline" size="sm" onClick={onRetry} disabled={retrying}>Tentar novamente</Button>
  </div>;
}

export function DashboardInfo({ label, value, inline = false }: { label: string; value: string; inline?: boolean }) {
  return <dl className={cn("dashboard-info", inline && "dashboard-info-inline")}>
    <dt>{label}</dt><dd>{value || "—"}</dd>
  </dl>;
}

export function DashboardStatus({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn("dashboard-status", className)}>{children}</span>;
}

export function DashboardSelection({ detailId, onClick, className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { detailId: string }) {
  return <button {...props} type="button" className={cn("dashboard-selection", className)} onClick={(event) => {
    onClick?.(event);
    if (event.defaultPrevented || !window.matchMedia("(max-width: 1279px)").matches) return;
    requestAnimationFrame(() => {
      const detail = document.getElementById(detailId);
      detail?.scrollIntoView({ block: "start", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
      detail?.focus({ preventScroll: true });
    });
  }} />;
}
