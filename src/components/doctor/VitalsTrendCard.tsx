import { cn, pctChange, formatPct } from '../../lib/utils';

// ─── Sparkline SVG ────────────────────────────────────────────────────────────
interface SparklineProps {
  values: number[];
  color: string;
}

function Sparkline({ values, color }: SparklineProps) {
  const valid = values.filter(v => v != null && !Number.isNaN(v));
  if (valid.length < 2) {
    return (
      <svg width={80} height={32} aria-hidden="true">
        <line x1="4" y1="16" x2="76" y2="16" stroke={color} strokeWidth="1.5" strokeDasharray="4 3" />
      </svg>
    );
  }

  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const range = max - min || 1;
  const W = 80, H = 32, P = 4;

  const points = valid
    .map((v, i) => {
      const x = P + (i / (valid.length - 1)) * (W - P * 2);
      const y = H - P - ((v - min) / range) * (H - P * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const lastX = parseFloat(points.split(' ').at(-1)!.split(',')[0]);
  const lastY = parseFloat(points.split(' ').at(-1)!.split(',')[1]);

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastX} cy={lastY} r="2.5" fill={color} />
    </svg>
  );
}

// ─── Trend indicator ─────────────────────────────────────────────────────────
/**
 * Cores baseadas em % de variação matemática — sem diagnóstico clínico.
 * Apenas indicam mudança significativa para revisão humana.
 */
function trendColor(pct: number, inverse = false): { line: string; text: string; bg: string } {
  const abs = Math.abs(pct);
  const isUp = pct > 0;
  const isConcerning = inverse ? !isUp : isUp;

  if (abs < 3) return { line: '#0d9488', text: 'text-slate-500', bg: '' };
  if (abs < 10) {
    return isConcerning
      ? { line: '#d97706', text: 'text-amber-700', bg: 'bg-amber-50' }
      : { line: '#0d9488', text: 'text-emerald-700', bg: 'bg-emerald-50' };
  }
  return isConcerning
    ? { line: '#dc2626', text: 'text-red-700', bg: 'bg-red-50' }
    : { line: '#0d9488', text: 'text-emerald-700', bg: 'bg-emerald-50' };
}

// ─── VitalsTrendCard ─────────────────────────────────────────────────────────
interface VitalsTrendCardProps {
  label: string;
  unit: string;
  currentValue: number | string;
  values: number[];
  /** Se true, queda é concernente (ex.: oxigenação) */
  inverseScale?: boolean;
  className?: string;
}

export function VitalsTrendCard({
  label,
  unit,
  currentValue,
  values,
  inverseScale = false,
  className,
}: VitalsTrendCardProps) {
  const valid = values.filter(v => v != null && !Number.isNaN(v));
  const first = valid[0] ?? 0;
  const last  = valid[valid.length - 1] ?? 0;
  const pct = typeof currentValue === 'number' ? pctChange(first, last) : 0;
  const colors = trendColor(pct, inverseScale);

  const arrow = pct > 0 ? '↑' : pct < 0 ? '↓' : '→';
  const isStable = Math.abs(pct) < 3;

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-slate-100 shadow-card p-4 flex flex-col gap-2',
        className,
      )}
    >
      <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>

      <div className="flex items-end justify-between gap-2">
        <div>
          <span className="text-2xl font-semibold text-slate-900 tabular-nums leading-none">
            {currentValue}
          </span>
          <span className="text-xs text-slate-400 ml-1">{unit}</span>
        </div>

        <Sparkline values={valid} color={colors.line} />
      </div>

      {/* Indicador de variação */}
      <div className="flex items-center gap-1.5">
        {isStable ? (
          <span className="text-xs text-slate-400">Estável (7 dias)</span>
        ) : (
          <span
            className={cn(
              'inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded',
              colors.text,
              colors.bg,
            )}
            aria-label={`Variação de ${formatPct(pct)} em 7 dias`}
          >
            <span aria-hidden="true">{arrow}</span>
            {formatPct(pct)} em 7 dias
          </span>
        )}
      </div>
    </div>
  );
}
