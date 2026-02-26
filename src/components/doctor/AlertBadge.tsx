import { type AlertLevel } from '../../types/doctor';
import { cn } from '../../lib/utils';

interface AlertBadgeProps {
  level: AlertLevel;
  /** Mostra apenas o ícone (sem texto) — útil em tabelas compactas */
  iconOnly?: boolean;
  className?: string;
}

const config: Record<
  AlertLevel,
  { label: string; dot: string; bg: string; text: string; ring: string }
> = {
  high:   { label: 'Alta atenção',     dot: 'bg-red-500',     bg: 'bg-red-50',     text: 'text-red-700',     ring: 'ring-red-200'     },
  medium: { label: 'Atenção moderada', dot: 'bg-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700',   ring: 'ring-amber-200'   },
  low:    { label: 'Baixa atenção',    dot: 'bg-blue-500',    bg: 'bg-blue-50',    text: 'text-blue-700',    ring: 'ring-blue-200'    },
  none:   { label: 'Sem alertas',      dot: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200' },
};

export function AlertBadge({ level, iconOnly, className }: AlertBadgeProps) {
  const { label, dot, bg, text, ring } = config[level];

  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ring-1',
        bg, text, ring,
        className,
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dot)} aria-hidden="true" />
      {!iconOnly && label}
    </span>
  );
}
