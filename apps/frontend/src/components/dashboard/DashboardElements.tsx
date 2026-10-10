import type { HTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import "./dashboard.css";

export function DashboardHelp({ children }: { children?: ReactNode }) {
  return children ? (
    <details className="dashboard-help">
      <summary>Como funciona</summary>
      <div>{children}</div>
    </details>
  ) : null;
}

export function DashboardHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="dashboard-heading">
      <div>
        <h2>{title}</h2>
        <DashboardHelp>{description}</DashboardHelp>
      </div>
      {actions ? <div className="dashboard-actions">{actions}</div> : null}
    </div>
  );
}

export function DashboardSurface({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      data-dashboard="surface"
      className={cn("dashboard-surface", className)}
      {...props}
    />
  );
}

/** A record has a clear boundary; only interactive records receive hover feedback. */
export function DashboardRecord(props: HTMLAttributes<HTMLDivElement>) {
  return <DashboardSurface {...props} className={cn("dashboard-record", props.className)} />;
}

export function DashboardSection({
  title,
  description,
  action,
  badge,
  className,
  contentClassName,
  children,
  id,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  badge?: ReactNode;
  className?: string;
  contentClassName?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <DashboardSurface
      id={id}
      tabIndex={id ? -1 : undefined}
      className={cn(id && "dashboard-editor-step", className)}
    >
      <div className="dashboard-section-heading">
        <div>
          {badge ? <span className="dashboard-eyebrow">{badge}</span> : null}
          <h3>{title}</h3>
          <DashboardHelp>{description}</DashboardHelp>
        </div>
        {action ? <div className="dashboard-actions">{action}</div> : null}
      </div>
      <div className={cn("dashboard-section-content", contentClassName)}>
        {children}
      </div>
    </DashboardSurface>
  );
}

export function DashboardBrand({ label }: { label: string }) {
  return (
    <Link to="/" className="dashboard-brand">
      <img
        src="/lovable-uploads/73f13341-b66a-4a9f-aa28-4bd40213b85f.png"
        alt="Rebequi"
      />
      <span>{label}</span>
    </Link>
  );
}

export function DashboardToolbar({
  title,
  leading,
  actions,
}: {
  title: string;
  leading?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="dashboard-toolbar sticky top-0 z-20">
      <div>
        {leading}
        <h1>{title}</h1>
        <div className="dashboard-toolbar-actions">{actions}</div>
      </div>
    </header>
  );
}

export function DashboardMetric({
  label,
  value,
  icon,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  icon: ReactNode;
  hint?: string;
  tone?: string;
}) {
  return (
    <DashboardSurface className={`dashboard-metric metric-${tone}`}>
      <span className="dashboard-metric-icon">{icon}</span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        {hint ? <small>{hint}</small> : null}
      </div>
    </DashboardSurface>
  );
}

export function DashboardNavAction({
  icon,
  label,
  badge,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  badge?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="dashboard-nav-action"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
    >
      <DashboardNavLabel icon={icon} label={label} />
      {badge ? <b>{badge}</b> : null}
    </button>
  );
}

export function DashboardNavLabel({
  icon,
  label,
}: {
  icon: ReactNode;
  label: string;
}) {
  return (
    <>
      <span className="dashboard-nav-icon">{icon}</span>
      <span className="dashboard-nav-label">{label}</span>
    </>
  );
}

export type DashboardStep = {
  title: string;
  href?: string;
  onClick?: () => void;
  targetId?: string;
};
export function DashboardSteps({
  steps,
  activeStep,
  label = "Em 3 passos",
}: {
  steps: [DashboardStep, DashboardStep, DashboardStep];
  activeStep?: number;
  label?: string;
}) {
  const contents = (step: DashboardStep, index: number) => (
    <>
      <b>{index + 1}</b>
      <span>{step.title}</span>
      <ArrowRight size={14} />
    </>
  );
  return (
    <nav className="dashboard-steps" aria-label={label}>
      {steps.map((step, index) => {
        const shared = {
          className: "dashboard-step",
          "aria-current": activeStep === index ? ("step" as const) : undefined,
        };
        return step.href ? (
          <Link key={step.title} {...shared} to={step.href}>
            {contents(step, index)}
          </Link>
        ) : step.onClick || step.targetId ? (
          <button
            type="button"
            key={step.title}
            {...shared}
            onClick={
              step.onClick ??
              (() => {
                const target = document.getElementById(step.targetId!);
                target?.scrollIntoView({
                  behavior: window.matchMedia(
                    "(prefers-reduced-motion: reduce)",
                  ).matches
                    ? "instant"
                    : "smooth",
                  block: "start",
                });
                target?.focus({ preventScroll: true });
              })
            }
          >
            {contents(step, index)}
          </button>
        ) : (
          <span key={step.title} {...shared}>
            {contents(step, index)}
          </span>
        );
      })}
    </nav>
  );
}
