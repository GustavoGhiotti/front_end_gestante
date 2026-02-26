import { cn } from '../../lib/utils';

/** Bloco genérico de skeleton */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-lg bg-slate-200', className)}
    />
  );
}

/** Linha de skeleton para tabela */
export function TableRowSkeleton({ cols = 6 }: { cols?: number }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 rounded bg-slate-200 animate-pulse" />
        </td>
      ))}
    </tr>
  );
}

/** Grid de KPI cards skeleton */
export function KPISkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-slate-100 shadow-card p-5 flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-200 animate-pulse flex-shrink-0" />
          <div className="flex-1 flex flex-col gap-2 justify-center">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-7 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Skeleton para card de gráfico */
export function ChartSkeleton({ height = 200 }: { height?: number }) {
  return (
    <div
      aria-hidden="true"
      className="bg-white rounded-xl border border-slate-100 shadow-card p-5"
      style={{ minHeight: height + 40 }}
    >
      <Skeleton className="h-4 w-36 mb-4" />
      <div className="animate-pulse bg-slate-100 rounded-lg" style={{ height }} />
    </div>
  );
}
