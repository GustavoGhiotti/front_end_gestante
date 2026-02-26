/** Concatena classes condicionalmente sem dependência externa */
export function cn(...classes: (string | undefined | null | false | 0)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Formata data ISO para pt-BR (ex: "25 de fev. de 2026") */
export function formatDate(iso: string, opts?: Intl.DateTimeFormatOptions): string {
  const date = new Date(iso);
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opts,
  });
}

/** Formata data ISO para hora pt-BR (ex: "09:30") */
export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/** Retorna "hoje", "ontem", ou "X dias atrás" */
export function relativeDate(iso: string): string {
  const date = new Date(iso);
  const now  = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7)  return `${diffDays} dias atrás`;
  return formatDate(iso);
}

/** Calcula variação percentual entre dois valores */
export function pctChange(from: number, to: number): number {
  if (from === 0) return 0;
  return ((to - from) / Math.abs(from)) * 100;
}

/** Formata variação percentual (ex: "+12,3%") */
export function formatPct(pct: number): string {
  const sign = pct > 0 ? '+' : '';
  return `${sign}${pct.toFixed(1).replace('.', ',')}%`;
}
