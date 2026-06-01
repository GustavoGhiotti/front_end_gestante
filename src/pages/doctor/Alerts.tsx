import { useState, useEffect, useMemo, type KeyboardEvent, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { DoctorLayout } from '../../components/layout/DoctorLayout';
import { AlertBadge } from '../../components/doctor/AlertBadge';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { KPISkeleton, TableRowSkeleton } from '../../components/ui/Skeleton';
import { Badge } from '../../components/ui/Badge';
import { type Alert, type AlertsKPI, type AlertSeverity, type AlertStatus } from '../../types/alerts';
import { fetchAlerts, fetchAlertsKPI, markAlertReviewed, addAlertNote, fetchPatientDetailsBundle, type PatientDetailsBundle } from '../../services/doctorApi';
import { relativeDate, formatTime, formatDate } from '../../lib/utils';
import { enablePushNotifications, getNotificationPermission, sendPushTestNotification } from '../../services/notifications';

// ─── Helpers de badge ─────────────────────────────────────────────────────────
const SEVERITY_TO_LEVEL: Record<AlertSeverity, 'high' | 'medium' | 'low'> = {
  high: 'high', medium: 'medium', low: 'low',
};

const TYPE_ICON: Record<string, string> = {
  'PA fora do padrão':         '🩺',
  'Novo relato com sintomas':  '💬',
  'FC elevada':                '💓',
  'SpO₂ abaixo do esperado':  '🫁',
  'Sinais vitais incompletos': '📋',
  'Perda de peso':             '⚖️',
  'Edema relatado':            '🦵',
};

function StatusBadge({ status }: { status: AlertStatus }) {
  return status === 'pending'
    ? <Badge variant="warning">Pendente</Badge>
    : <Badge variant="neutral">Revisado</Badge>;
}

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, variant, onDismiss }: { message: string; variant: 'success' | 'error'; onDismiss: () => void }) {
  useEffect(() => { const t = setTimeout(onDismiss, 4000); return () => clearTimeout(t); }, [onDismiss]);
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 text-sm px-4 py-3 rounded-xl shadow-modal ${
        variant === 'success' ? 'bg-slate-900 text-white' : 'bg-red-600 text-white'
      }`}
    >
      {variant === 'success'
        ? <svg className="w-4 h-4 text-brand-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg>
        : <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
      }
      {message}
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KPICard({ label, value, sub, iconBg, icon }: { label: string; value: number | string; sub?: string; iconBg: string; icon: React.ReactNode }) {
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

// ─── Alert Detail Modal ───────────────────────────────────────────────────────
interface AlertDetailModalProps {
  alert: Alert | null;
  isOpen: boolean;
  onClose: () => void;
  onReviewed: (id: string) => void;
}

function AlertDetailModal({ alert, isOpen, onClose, onReviewed }: AlertDetailModalProps) {
  const navigate = useNavigate();
  const [showNoteModal, setNoteModal] = useState(false);
  const [noteText, setNoteText]       = useState('');
  const [savingNote, setSavingNote]   = useState(false);
  const [localNotes, setLocalNotes]   = useState(alert?.notes ?? []);
  const [context, setContext]         = useState<PatientDetailsBundle | null>(null);
  const [contextLoading, setContextLoading] = useState(false);

  useEffect(() => { setLocalNotes(alert?.notes ?? []); }, [alert]);
  useEffect(() => {
    if (!alert || !isOpen) {
      setContext(null);
      return;
    }

    setContextLoading(true);
    fetchPatientDetailsBundle(alert.patientId)
      .then(setContext)
      .finally(() => setContextLoading(false));
  }, [alert, isOpen]);

  if (!alert) return null;

  const reports = context?.reports.slice(0, 3) ?? [];
  const summary = context?.summary;

  async function handleSaveNote() {
    if (!noteText.trim()) return;
    if (!alert) return;
    setSavingNote(true);
    try {
      const note = await addAlertNote(alert.id, noteText);
      setLocalNotes(prev => [...prev, note]);
      setNoteText('');
      setNoteModal(false);
    } finally {
      setSavingNote(false);
    }
  }

  const MOOD_EMOJI: Record<string, string> = { feliz: '😊', normal: '😐', triste: '😔', ansioso: '😰' };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Contexto do alerta" maxWidth="max-w-3xl">
        {/* Mini-header do paciente */}
        <div className="bg-slate-50 rounded-xl p-4 mb-5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center flex-shrink-0">
            {alert.patientName.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{alert.patientName}</p>
            <p className="text-xs text-slate-500">{alert.patientIG ? `IG: ${alert.patientIG}` : ''} · {TYPE_ICON[alert.type]} {alert.type}</p>
          </div>
          <AlertBadge level={SEVERITY_TO_LEVEL[alert.severity]} className="ml-auto flex-shrink-0" />
        </div>

        {/* Métrica principal */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-0.5">{alert.metricLabel}</p>
          <p className="text-lg font-bold text-amber-900">{alert.metricValue}</p>
          <p className="text-xs text-amber-600 mt-0.5">{relativeDate(alert.createdAt)} às {formatTime(alert.createdAt)}</p>
        </div>

        {contextLoading && (
          <div className="flex justify-center py-6">
            <Spinner label="Carregando contexto do paciente…" />
          </div>
        )}

        {/* Últimos relatos */}
        {reports.length > 0 && !contextLoading && (
          <section aria-label="Últimos relatos do paciente" className="mb-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Últimos relatos
            </h3>
            <ol className="flex flex-col gap-2">
              {reports.map(r => (
                <li key={r.id} className="bg-white border border-slate-100 rounded-xl px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <time dateTime={r.date} className="text-xs text-slate-400">
                      {relativeDate(r.date)} às {formatTime(r.date)}
                    </time>
                    <span title={r.mood} aria-label={`Humor: ${r.mood}`}>{MOOD_EMOJI[r.mood] ?? '—'}</span>
                  </div>
                  <p className="text-xs text-slate-700 line-clamp-2">{r.description}</p>
                  {r.symptoms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {r.symptoms.map((s, i) => (
                        <span key={i} className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded ring-1 ring-amber-200">{s}</span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Resumo do assistente */}
        {summary && !contextLoading && (
          <section aria-label="Resumo do assistente" className="mb-5 bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-700 mb-2">Resumo do assistente</p>
            <p className="text-xs text-slate-600 leading-relaxed">{summary.summaryText}</p>
            <p className="text-xs text-slate-400 mt-2 border-t border-slate-200 pt-2">
              ⓘ Para revisão do médico. Não substitui avaliação clínica.
            </p>
          </section>
        )}

        {/* Notas */}
        {localNotes.length > 0 && (
          <section aria-label="Notas registradas" className="mb-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Notas</h3>
            <ol className="flex flex-col gap-2">
              {localNotes.map(note => (
                <li key={note.id} className="bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                  <p className="text-xs text-blue-800">{note.text}</p>
                  <p className="text-xs text-blue-400 mt-1">{note.authorName} · {formatDate(note.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Ações */}
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-4">
          {alert.status === 'pending' && (
            <button
              type="button"
              onClick={() => { onReviewed(alert.id); onClose(); }}
              className="w-full py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl hover:bg-brand-700 transition-colors"
            >
              Marcar como revisado
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate(`/doctor/patients/${alert.patientId}?tab=prontuario`)}
            className="w-full py-2.5 text-sm font-medium text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Abrir prontuário
          </button>
          <button
            type="button"
            onClick={() => setNoteModal(true)}
            className="w-full py-2.5 text-sm font-medium text-brand-700 bg-brand-50 rounded-xl hover:bg-brand-100 transition-colors"
          >
            Adicionar nota
          </button>
        </div>
      </Modal>

      {/* Modal de nota */}
      <Modal isOpen={showNoteModal} onClose={() => setNoteModal(false)} title="Adicionar nota">
        <label htmlFor="note-text" className="block text-sm font-medium text-slate-700 mb-1">
          Nota do médico
        </label>
        <textarea
          id="note-text"
          rows={4}
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Registre uma observação sobre este alerta…"
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white resize-none focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent mb-4"
        />
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setNoteModal(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
            Cancelar
          </button>
          <button
            type="button"
            disabled={!noteText.trim() || savingNote}
            onClick={handleSaveNote}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {savingNote ? <Spinner size="sm" /> : null}
            {savingNote ? 'Salvando…' : 'Salvar nota'}
          </button>
        </div>
      </Modal>
    </>
  );
}

// ─── Tipos de filtro ──────────────────────────────────────────────────────────
type FilterChip = 'todos' | 'pending' | 'reviewed' | AlertSeverity;
const CHIPS: { value: FilterChip; label: string }[] = [
  { value: 'todos',    label: 'Todos'             },
  { value: 'pending',  label: 'Pendentes'         },
  { value: 'reviewed', label: 'Revisados'         },
  { value: 'high',     label: 'Alta atenção'      },
  { value: 'medium',   label: 'Atenção moderada'  },
  { value: 'low',      label: 'Baixa atenção'     },
];

// ─── Página ───────────────────────────────────────────────────────────────────
export function DoctorAlerts() {
  const navigate = useNavigate();

  const [alerts,  setAlerts]  = useState<Alert[]>([]);
  const [kpi,     setKPI]     = useState<AlertsKPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [kpiLoading, setKpiLoading] = useState(true);

  const [search,  setSearch]  = useState('');
  const [chip,    setChip]    = useState<FilterChip>('todos');
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [toast,   setToast]   = useState<{ msg: string; variant: 'success' | 'error' } | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(getNotificationPermission());
  const [testingPush, setTestingPush] = useState(false);

  useEffect(() => {
    fetchAlerts()
      .then(setAlerts)
      .finally(() => setLoading(false));
    fetchAlertsKPI()
      .then(setKPI)
      .finally(() => setKpiLoading(false));
  }, []);

  // Filtro combinado
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return alerts.filter(a => {
      const matchSearch = !q || a.patientName.toLowerCase().includes(q) || a.type.toLowerCase().includes(q);
      const matchChip =
        chip === 'todos'    ? true :
        chip === 'pending'  ? a.status === 'pending'  :
        chip === 'reviewed' ? a.status === 'reviewed' :
        a.severity === chip;
      return matchSearch && matchChip;
    });
  }, [alerts, search, chip]);

  async function handleMarkReviewed(id: string) {
    try {
      await markAlertReviewed(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, status: 'reviewed' } : a));
      setToast({ msg: 'Alerta marcado como revisado.', variant: 'success' });
    } catch {
      setToast({ msg: 'Falha ao registrar revisão. Tente novamente.', variant: 'error' });
    }
  }

  async function handleEnableNotifications() {
    const granted = await enablePushNotifications();
    setNotificationPermission(getNotificationPermission());
    setToast({
      msg: granted ? 'Notificacoes habilitadas neste dispositivo.' : 'Permissao de notificacao nao concedida.',
      variant: granted ? 'success' : 'error',
    });
  }

  async function handleTestNotification() {
    setTestingPush(true);
    try {
      const result = await sendPushTestNotification();
      setToast({ msg: result.detail, variant: result.delivered ? 'success' : 'error' });
    } catch {
      setToast({ msg: 'Falha ao enviar notificacao de teste.', variant: 'error' });
    } finally {
      setTestingPush(false);
    }
  }

  function openPatient(patientId: string, tab = 'prontuario') {
    navigate(`/doctor/patients/${patientId}?tab=${tab}`);
  }

  function handleRowKeyDown(event: KeyboardEvent<HTMLElement>, alert: Alert) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelectedAlert(alert);
    }
  }

  function stopRowAction(event: MouseEvent<HTMLButtonElement>, action: () => void) {
    event.stopPropagation();
    action();
  }

  const pendingCount = alerts.filter(a => a.status === 'pending').length;

  return (
    <DoctorLayout>
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-slate-100 px-6 py-3 flex items-center gap-4">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="search" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar paciente ou tipo de alerta…"
            aria-label="Buscar alertas"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:bg-white transition-colors"
          />
        </div>
      </header>

      <div className="px-6 py-6 max-w-7xl mx-auto">
        {/* Heading */}
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Alertas</h1>
          {pendingCount > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 ring-1 ring-red-200">
              {pendingCount} pendente{pendingCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* KPI */}
        <section aria-label="Indicadores de alertas" className="mb-8">
          {kpiLoading ? (
            <KPISkeleton count={4} />
          ) : kpi ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <KPICard label="Pendentes hoje" value={kpi.pendingToday} sub="novos nas últimas 24h"
                iconBg="bg-red-50"
                icon={<svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
              <KPICard label="Pendentes total" value={kpi.pendingTotal} sub="aguardando revisão"
                iconBg="bg-amber-50"
                icon={<svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" /></svg>}
              />
              <KPICard label="Alta atenção" value={kpi.criticalTotal} sub="pendentes críticos"
                iconBg="bg-red-50"
                icon={<svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>}
              />
              <KPICard label="Tempo médio" value={`${kpi.avgHoursSinceAlert}h`} sub="desde o alerta"
                iconBg="bg-slate-100"
                icon={<svg className="w-6 h-6 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
            </div>
          ) : null}
        </section>

        <section className="mb-6 rounded-xl border border-brand-100 bg-brand-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">Notificacoes push do medico</p>
              <p className="mt-1 text-sm text-slate-500">
                Status atual: {notificationPermission === 'unsupported' ? 'nao suportado neste navegador' : notificationPermission}.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {notificationPermission !== 'granted' ? (
                <button type="button" onClick={handleEnableNotifications} className="rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700">
                  Ativar notificacoes
                </button>
              ) : null}
              {notificationPermission === 'granted' ? (
                <button type="button" onClick={handleTestNotification} disabled={testingPush} className="rounded-lg border border-brand-200 bg-white px-3 py-2 text-xs font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-60">
                  {testingPush ? 'Enviando teste...' : 'Enviar teste'}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        {/* Filtros */}
        <div
          role="tablist"
          aria-label="Filtrar alertas"
          className="flex gap-2 flex-wrap mb-4"
        >
          {CHIPS.map(c => (
            <button
              key={c.value}
              role="tab"
              type="button"
              aria-selected={chip === c.value}
              onClick={() => setChip(c.value)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-colors ${
                chip === c.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-brand-300 hover:text-brand-700'
              }`}
            >
              {c.label}
              {c.value !== 'todos' && c.value !== 'pending' && c.value !== 'reviewed' && (
                <span className="ml-1 opacity-70">
                  ({alerts.filter(a => a.severity === c.value).length})
                </span>
              )}
              {c.value === 'pending'  && <span className="ml-1 opacity-70">({alerts.filter(a => a.status === 'pending').length})</span>}
              {c.value === 'reviewed' && <span className="ml-1 opacity-70">({alerts.filter(a => a.status === 'reviewed').length})</span>}
            </button>
          ))}
        </div>

        {/* Tabela */}
        <section aria-label="Lista de alertas">
          {/* Desktop */}
          <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100 shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Paciente', 'Tipo do alerta', 'Métrica', 'Quando', 'Status', 'Ações'].map(h => (
                    <th key={h} scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {loading
                  ? Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
                  : filtered.length === 0
                  ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center text-slate-400 text-sm">
                        Nenhum alerta encontrado para os filtros selecionados.
                      </td>
                    </tr>
                  )
                  : filtered.map(alert => (
                    <tr
                      key={alert.id}
                      className={`cursor-pointer transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-500 ${alert.status === 'pending' && alert.severity === 'high' ? 'border-l-2 border-l-red-400' : ''}`}
                      onClick={() => setSelectedAlert(alert)}
                      onKeyDown={(event) => handleRowKeyDown(event, alert)}
                      tabIndex={0}
                      aria-label={`Abrir contexto do alerta de ${alert.patientName}`}
                    >
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700" aria-hidden="true">
                            {alert.patientName.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800">{alert.patientName}</p>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                              {alert.patientIG && <span>IG: {alert.patientIG}</span>}
                              <span className="text-brand-600">Abrir contexto</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span aria-hidden="true">{TYPE_ICON[alert.type] ?? '•'}</span>
                          <span className="text-xs text-slate-700">{alert.type}</span>
                        </div>
                        <AlertBadge level={SEVERITY_TO_LEVEL[alert.severity]} iconOnly className="mt-1.5" />
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-700 font-medium tabular-nums max-w-[160px]">
                        {alert.metricValue}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 whitespace-nowrap">
                        {relativeDate(alert.createdAt)}<br />
                        <span className="text-slate-400">{formatTime(alert.createdAt)}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={alert.status} />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(event) => stopRowAction(event, () => setSelectedAlert(alert))}
                            className="px-2.5 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
                            aria-label={`Ver contexto do alerta de ${alert.patientName}`}
                          >
                            Contexto
                          </button>
                          <button
                            type="button"
                            onClick={(event) => stopRowAction(event, () => openPatient(alert.patientId, 'overview'))}
                            className="px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                            aria-label={`Abrir paciente ${alert.patientName}`}
                          >
                            Paciente
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>

          {/* Mobile: cards */}
          <ul className="md:hidden flex flex-col gap-3" role="list">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <li key={i} className="bg-white rounded-xl border border-slate-100 shadow-card p-4 animate-pulse">
                    <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                  </li>
                ))
              : filtered.length === 0
              ? (
                <li className="py-12 text-center text-sm text-slate-400">
                  Nenhum alerta encontrado.
                </li>
              )
              : filtered.map(alert => (
                <li
                  key={alert.id}
                  role="listitem"
                  className="cursor-pointer bg-white rounded-xl border border-slate-100 shadow-card p-4 transition-shadow hover:shadow-card-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                  onClick={() => setSelectedAlert(alert)}
                  onKeyDown={(event) => handleRowKeyDown(event, alert)}
                  tabIndex={0}
                  aria-label={`Abrir contexto do alerta de ${alert.patientName}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{alert.patientName}</p>
                      <p className="text-xs text-slate-500">{alert.patientIG ? `IG: ${alert.patientIG}` : ''}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <AlertBadge level={SEVERITY_TO_LEVEL[alert.severity]} />
                      <StatusBadge status={alert.status} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-700 mb-2">
                    <span aria-hidden="true">{TYPE_ICON[alert.type] ?? '•'}</span>
                    <span>{alert.type}</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 mb-1">{alert.metricValue}</p>
                  <p className="text-xs text-slate-400 mb-3">{relativeDate(alert.createdAt)}</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={(event) => stopRowAction(event, () => setSelectedAlert(alert))}
                      className="flex-1 py-2 text-xs font-semibold text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors">
                      Ver contexto
                    </button>
                  </div>
                </li>
              ))
            }
          </ul>
        </section>
      </div>

      {/* Modal de contexto */}
      <AlertDetailModal
        alert={selectedAlert}
        isOpen={selectedAlert !== null}
        onClose={() => setSelectedAlert(null)}
        onReviewed={handleMarkReviewed}
      />

      {/* Toast */}
      {toast && (
        <Toast message={toast.msg} variant={toast.variant} onDismiss={() => setToast(null)} />
      )}
    </DoctorLayout>
  );
}
