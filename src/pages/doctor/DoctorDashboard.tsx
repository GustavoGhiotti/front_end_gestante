import { useState, useEffect, useMemo } from 'react';
import { DoctorLayout } from '../../components/layout/DoctorLayout';
import { PatientList } from '../../components/doctor/PatientList';
import { AssociatePatientModal } from '../../components/doctor/AssociatePatientModal';
import { PageSpinner } from '../../components/ui/Spinner';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { type Patient, type KPIData, type AlertLevel } from '../../types/doctor';
import { fetchPatients, fetchKPI } from '../../mocks/doctorData';
import { useAuth } from '../../contexts/AuthContext';

// ─── KPI Card ────────────────────────────────────────────────────────────────
interface KPICardProps {
  label: string;
  value: number | string;
  description?: string;
  variant?: 'default' | 'warning' | 'brand';
  icon: React.ReactNode;
}
function KPICard({ label, value, description, variant = 'default', icon }: KPICardProps) {
  const variantMap = {
    default: { bg: 'bg-white', icon: 'bg-slate-100 text-slate-600', val: 'text-slate-900' },
    warning: { bg: 'bg-white', icon: 'bg-red-50   text-red-600',    val: 'text-red-700'   },
    brand:   { bg: 'bg-white', icon: 'bg-brand-50 text-brand-700',  val: 'text-brand-700' },
  };
  const c = variantMap[variant];

  return (
    <div className={`${c.bg} rounded-xl border border-slate-100 shadow-card p-5 flex items-start gap-4`}>
      <div className={`${c.icon} rounded-xl p-3 flex-shrink-0`} aria-hidden="true">
        {icon}
      </div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className={`text-3xl font-bold mt-0.5 tabular-nums ${c.val}`}>{value}</p>
        {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
      </div>
    </div>
  );
}

// ─── Filtros de alerta ────────────────────────────────────────────────────────
type FilterOption = 'todos' | AlertLevel;

const FILTER_LABELS: Record<FilterOption, string> = {
  todos:  'Todos',
  high:   'Alta atenção',
  medium: 'Atenção moderada',
  low:    'Baixa atenção',
  none:   'Sem alertas',
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
export function DoctorDashboard() {
  const { user } = useAuth();

  const [patients, setPatients] = useState<Patient[]>([]);
  const [kpi, setKPI]           = useState<KPIData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  const [search, setSearch]     = useState('');
  const [filter, setFilter]     = useState<FilterOption>('todos');
  const [isModalOpen, setModalOpen] = useState(false);

  // Carga inicial
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchPatients(), fetchKPI()])
      .then(([pts, k]) => { setPatients(pts); setKPI(k); })
      .catch(() => setError('Não foi possível carregar os dados. Tente novamente.'))
      .finally(() => setLoading(false));
  }, []);

  // Filtro combinado: busca + nível de alerta
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return patients.filter(p => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.cpf.includes(q);
      const matchFilter =
        filter === 'todos' || p.alertLevel === filter;
      return matchSearch && matchFilter;
    });
  }, [patients, search, filter]);

  // Saudação
  const firstName = user?.nomeCompleto?.split(' ')[0] ?? 'Médico';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <DoctorLayout>
      {/* ─── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-100 px-6 py-3 flex items-center gap-4">
        <div className="flex-1 relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar paciente por nome ou CPF…"
            aria-label="Buscar pacientes"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent focus:bg-white transition-colors"
          />
        </div>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 bg-brand-600 text-white text-xs px-3 py-1.5 rounded-lg z-50">
          Pular para conteúdo
        </a>
      </header>

      {/* ─── Conteúdo principal ───────────────────────────────────────────────── */}
      <div className="px-6 py-6 max-w-7xl mx-auto">

        {/* Saudação */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            {greeting}, Dr. {firstName}
          </h1>
          <p className="text-sm text-slate-400 mt-0.5 capitalize">{todayLabel}</p>
        </div>

        {/* KPIs */}
        {loading ? (
          <PageSpinner label="Carregando dashboard…" />
        ) : error ? (
          <div role="alert" className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-5 py-4">
            {error}
          </div>
        ) : (
          <>
            <section aria-label="Resumo do dia" className="mb-8">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <KPICard
                  label="Novos relatos hoje"
                  value={kpi?.newReportsToday ?? 0}
                  description="Registros das últimas 24h"
                  variant="brand"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                    </svg>
                  }
                />
                <KPICard
                  label="Alertas pendentes"
                  value={kpi?.pendingAlerts ?? 0}
                  description="Flags aguardando revisão"
                  variant="warning"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                  }
                />
                <KPICard
                  label="Acompanhamentos ativos"
                  value={kpi?.activePatients ?? 0}
                  description="Pacientes em acompanhamento"
                  variant="default"
                  icon={
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                    </svg>
                  }
                />
              </div>
            </section>

            {/* Lista de pacientes */}
            <section aria-label="Lista de pacientes">
              {/* Cabeçalho da seção */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-800">Pacientes</h2>

                {/* CTA Associar — obrigatório e visível */}
                <button
                  type="button"
                  onClick={() => setModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 active:scale-95 transition-all shadow-sm"
                  aria-label="Associar novo paciente ao seu acompanhamento"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                  </svg>
                  Associar novo paciente
                </button>
              </div>

              {/* Filtros de alerta */}
              <div
                role="tablist"
                aria-label="Filtrar por nível de atenção"
                className="flex gap-2 flex-wrap mb-4"
              >
                {(Object.keys(FILTER_LABELS) as FilterOption[]).map(opt => (
                  <button
                    key={opt}
                    role="tab"
                    type="button"
                    aria-selected={filter === opt}
                    onClick={() => setFilter(opt)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      filter === opt
                        ? 'bg-brand-600 text-white'
                        : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-300 hover:text-brand-700'
                    }`}
                  >
                    {FILTER_LABELS[opt]}
                    {opt !== 'todos' && (
                      <span className="ml-1 opacity-70">
                        ({patients.filter(p => p.alertLevel === opt).length})
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Lista */}
              {filtered.length === 0 && !loading ? (
                <Card>
                  <CardBody className="py-16 text-center text-slate-400">
                    <p className="text-sm">Nenhum paciente corresponde aos filtros selecionados.</p>
                  </CardBody>
                </Card>
              ) : (
                <PatientList patients={filtered} />
              )}
            </section>
          </>
        )}
      </div>

      {/* Modal */}
      <AssociatePatientModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
      />
    </DoctorLayout>
  );
}
