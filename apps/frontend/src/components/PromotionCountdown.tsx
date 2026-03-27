import { useEffect, useState } from 'react';
import { Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCountdownParts } from '@/lib/countdown';

function CountdownUnit({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-[46px] text-center">
      <div className="text-base font-bold leading-none">{String(value).padStart(2, '0')}</div>
      <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80">{label}</div>
    </div>
  );
}

export function PromotionCountdown({
  compact = false,
  expiresAt,
  className,
  label = 'Termina em',
}: {
  compact?: boolean;
  expiresAt?: string | Date | null;
  className?: string;
  label?: string;
}) {
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (!expiresAt) {
      return;
    }

    const interval = window.setInterval(() => {
      setTick(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [expiresAt]);

  void tick;

  const parts = getCountdownParts(expiresAt);

  if (!parts) {
    return null;
  }

  if (parts.isExpired) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700',
          className,
        )}
      >
        <Clock3 className="h-4 w-4" />
        Encerrada
      </div>
    );
  }

  if (compact) {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-2xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary',
          className,
        )}
      >
        <Clock3 className="h-4 w-4" />
        <span className="uppercase tracking-[0.18em]">{label}</span>
        <span>
          {String(parts.days).padStart(2, '0')}d {String(parts.hours).padStart(2, '0')}h {String(parts.minutes).padStart(2, '0')}m {String(parts.seconds).padStart(2, '0')}s
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary',
        className,
      )}
    >
      <Clock3 className="h-4 w-4 flex-shrink-0" />
      <div className="space-y-2">
        <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary/80">{label}</div>
        <div className="flex items-center gap-3 font-semibold">
          <CountdownUnit label="Dias" value={parts.days} />
          <CountdownUnit label="Horas" value={parts.hours} />
          <CountdownUnit label="Min" value={parts.minutes} />
          <CountdownUnit label="Seg" value={parts.seconds} />
        </div>
      </div>
    </div>
  );
}
