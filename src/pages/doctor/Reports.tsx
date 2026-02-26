import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoctorLayout } from '../../components/layout/DoctorLayout';
import { AlertBadge } from '../../components/doctor/AlertBadge';
import { LineChart } from '../../components/charts/LineChart';
import { HorizontalBarChart } from '../../components/charts/HorizontalBarChart';
import { KPISkeleton, ChartSkeleton, Skeleton } from '../../components/ui/Skeleton';
import { type ReportData, type ReportPeriod } from '../../types/alerts';
import { fetchReportData } from '../../mocks/alertsData';
import { exportToCsv } from '../../lib/exportCsv';
import { relativeDate, formatDate } from '../../lib/utils';

// ─── KPI Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, iconBg, icon }: {
  label: string; value: number | string; sub?: string; iconBg: string; icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5 flex items-start gap-4">
      <div className={`${iconBg} rounded-xl p-3 flex-shrink-0`} aria-hidden="true">{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-3xl font-bold tabular-nums mt-0.5 text-slate-900">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Period selector ─────────────────────────────────────────────────────────
const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: '7d',  label: 'Últimos 7 dias'  },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
];

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => { const t = setTimeout(onDismiss, 3000); return () => clearTimeout(t); }, [onDismiss]);
  return (
    <div role="status" aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-modal">
      <svg className="w-4 h-4 text-brand-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
      </svg>
      {message}
    </div>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export function DoctorReports() {
  const navigate = useNavigate();

  const [period,  setPeriod]  = useState<ReportPeriod>('30d');
  const [data,    setData]    = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast,   setToast]   = useState<string | null>(null);
  const [copied,  setCopied]  = useState(false);

  const loadData = useCallback((p: ReportPeriod) => {
    setLoading(true);
    fetchReportData(p)
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadData(period); }, [period, loadData]);

  // CSV export
  function handleExportCSV() {
    if (!data) return;
    const rows = data.patientSummary.map(p => ({
      'Paciente':          p.name,
      'IG':               p.ig ?? '—',
      'Relatos':          p.reportCount,
      'Alertas':          p.alertCount,
      'Nível de atenção': p.alertLevel,
      'Último registro':  p.lastRecord ? relativeDate(p.lastRecord) : '—',
    }));
    exportToCsv(`gestacao-relatorios-${period}`, rows);
    setToast('Arquivo CSV exportado com sucesso.');
  }

  // Resumo texto
  function buildSummaryText(): string {
    if (!data) return '';
    const label = PERIODS.find(p => p.value === period)?.label ?? period;
    return [
      `Período: ${label}`,
      `Pacientes ativos: ${data.kpi.activePatients}`,
      `Total de relatos: ${data.kpi.totalReports}`,
      `Total de alertas: ${data.kpi.totalAlerts}`,
      `Alertas revisados: ${data.kpi.reviewedPct}%`,
      `Gerado em: ${new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
    ].join(' | ');
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildSummaryText());
      setCopied(true);
      setToast('Texto copiado para a área de transferência.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setToast('Não foi possível copiar. Tente manualmente.');
    }
  }

  // Dados para os gráficos
  const chartLabels   = data?.reportsPerDay.map(d => d.date) ?? [];
  const reportsValues = data?.reportsPerDay.map(d => d.value) ?? [];
  const highValues    = data?.alertsHighPerDay.map(d => d.value) ?? [];
  const medValues     = data?.alertsMediumPerDay.map(d => d.value) ?? [];
  const lowValues     = data?.alertsLowPerDay.map(d => d.value) ?? [];

  const barData = (data?.alertTypeDist ?? []).map(t => ({
    label: t.type,
    value: t.count,
  }));

  const LEVEL_MAP: Record<string, 'none' | 'low' | 'medium' | 'high'> = {
    none: 'none', low: 'low', medium: 'medium', high: 'high',
  };

  return (
    <DoctorLayout>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-100 px-6 py-4 flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold text-slate-900">Relatórios</h1>

        <div className="flex items-center gap-3">
          {/* Seletor de período */}
          <fieldset>
            <legend className="sr-only">Período do relatório</legend>
            <div
              role="group"
              className="flex gap-1 bg-slate-100 rounded-xl p-1"
            >
              {PERIODS.map(p => (
                <button
                  key={p.value}
                  type="button"
                  aria-pressed={period === p.value}
                  onClick={() => setPeriod(p.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    period === p.value
                      ? 'bg-white text-slate-900 shadow-card'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </fieldset>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={loading || !data}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-brand-300 hover:text-brand-700 disabled:opacity-50 transition-colors"
            aria-label="Exportar dados em CSV"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="px-6 py-6 max-w-7xl mx-auto flex flex-col gap-8">

        {/* ─── 1. KPIs ───────────────────────────────────────────────────────── */}
        <section aria-label="Indicadores do período">
          {loading ? (
            <KPISkeleton count={4} />
          ) : data ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard
                label="Acompanhamentos ativos" value={data.kpi.activePatients}
                iconBg="bg-brand-50"
                icon={<svg className="w-6 h-6 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>}
              />
              <StatCard
                label="Total de relatos" value={data.kpi.totalReports} sub={`no período (${period})`}
                iconBg="bg-blue-50"
                icon={<svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" /></svg>}
              />
              <StatCard
                label="Total de alertas" value={data.kpi.totalAlerts} sub={`no período (${period})`}
                iconBg="bg-amber-50"
                icon={<svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
              />
              <StatCard
                label="Alertas revisados" value={`${data.kpi.reviewedPct}%`} sub="do total no período"
                iconBg="bg-emerald-50"
                icon={<svg className="w-6 h-6 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
            </div>
          ) : null}
        </section>

        {/* ─── 2. Gráficos ───────────────────────────────────────────────────── */}
        <section aria-label="Tendências do período">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Tendências</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Relatos por dia */}
            {loading ? (
              <ChartSkeleton height={200} />
            ) : data ? (
              <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
                <LineChart
                  title="Relatos por dia"
                  labels={chartLabels}
                  datasets={[{ label: 'Relatos', color: '#0d9488', values: reportsValues }]}
                  ariaLabel={`Relatos diários no período ${period}. Máx: ${Math.max(...reportsValues)}.`}
                />
              </div>
            ) : null}

            {/* Alertas por severidade */}
            {loading ? (
              <ChartSkeleton height={200} />
            ) : data ? (
              <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
                <LineChart
                  title="Alertas por severidade"
                  labels={chartLabels}
                  datasets={[
                    { label: 'Alta atenção',     color: '#dc2626', values: highValues },
                    { label: 'Atenção moderada', color: '#d97706', values: medValues  },
                    { label: 'Baixa atenção',    color: '#2563eb', values: lowValues  },
                  ]}
                  ariaLabel="Alertas diários separados por nível de atenção."
                />
              </div>
            ) : null}

            {/* Tipos de alerta (barra horizontal) */}
            {loading ? (
              <ChartSkeleton height={220} />
            ) : data ? (
              <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5 lg:col-span-2">
                <HorizontalBarChart
                  title="Principais tipos de alerta no período"
                  data={barData}
                  ariaLabel="Distribuição de alertas por tipo."
                />
              </div>
            ) : null}
          </div>
        </section>

        {/* ─── 3. Tabela por paciente ─────────────────────────────────────────── */}
        <section aria-label="Resumo por paciente">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Por paciente</h2>

          {loading ? (
            <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-hidden">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-100">
                <Skeleton className="h-3 w-full max-w-lg" />
              </div>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-4 py-3 border-b border-slate-50 flex gap-4">
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </div>
          ) : data ? (
            <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-card">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    {['Paciente', 'IG', 'Relatos', 'Alertas', 'Último registro', 'Status', ''].map(h => (
                      <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {data.patientSummary.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 font-semibold text-xs flex items-center justify-center flex-shrink-0">
                            {p.name.charAt(0)}
                          </div>
                          <span className="text-sm font-medium text-slate-800 truncate max-w-[160px]">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600 tabular-nums">{p.ig ?? '—'}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-700 tabular-nums">{p.reportCount}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-slate-700 tabular-nums">{p.alertCount}</td>
                      <td className="px-4 py-3 text-xs text-slate-500">{p.lastRecord ? relativeDate(p.lastRecord) : '—'}</td>
                      <td className="px-4 py-3">
                        <AlertBadge level={LEVEL_MAP[p.alertLevel] ?? 'none'} />
                      </td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => navigate(`/doctor/patients/${p.id}`)}
                          className="px-2.5 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
                          aria-label={`Abrir detalhes de ${p.name}`}
                        >
                          Abrir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        {/* ─── 4. Resumo para envio ──────────────────────────────────────────── */}
        <section aria-label="Resumo para envio">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Resumo para envio</h2>
          <div className="bg-white rounded-xl border border-slate-100 shadow-card p-5">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : data ? (
              <>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Texto gerado automaticamente
                </p>
                <div
                  className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed mb-4 font-mono break-all"
                  aria-label="Resumo gerado para envio"
                >
                  {buildSummaryText()}
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  ⓘ Este resumo contém apenas dados quantitativos do período. Não inclui informações clínicas ou interpretativas.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCopy}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                    aria-label="Copiar texto do resumo"
                  >
                    {copied ? (
                      <svg className="w-4 h-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                      </svg>
                    )}
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                  <button
                    type="button"
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors"
                    aria-label="Baixar relatório em CSV"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                    </svg>
                    Baixar CSV
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </section>

      </div>

      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </DoctorLayout>
  );
}

// Helper (usado na tabela)
const LEVEL_MAP: Record<string, 'none' | 'low' | 'medium' | 'high'> = {
  none: 'none', low: 'low', medium: 'medium', high: 'high',
};
