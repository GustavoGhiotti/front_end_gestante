import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DoctorLayout } from '../../components/layout/DoctorLayout';
import { PatientHeader } from '../../components/doctor/PatientHeader';
import { VitalsTrendCard } from '../../components/doctor/VitalsTrendCard';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { PageSpinner, Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import {
  type Patient, type DailyReport, type Medication,
  type MedicalRecord, type AssistantSummary, type TimelineEvent,
} from '../../types/doctor';
import {
  fetchPatient, fetchReports, fetchMedications, fetchMedicalRecords,
  fetchSummary, fetchTimeline, addMedication, addMedicalRecord, addVitalSign,
} from '../../mocks/doctorData';
import { formatDate, formatTime, relativeDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

// ─── Mapa de ícones de tipo de evento ─────────────────────────────────────────
function TimelineIcon({ type, hasFlag }: { type: TimelineEvent['type']; hasFlag: boolean }) {
  const base = 'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-white';
  const bg =
    hasFlag ? 'bg-amber-100 text-amber-600' :
    type === 'appointment' ? 'bg-brand-100 text-brand-700' :
    type === 'medication'  ? 'bg-purple-100 text-purple-700' :
    'bg-slate-100 text-slate-500';

  return (
    <span className={`${base} ${bg}`} aria-hidden="true">
      {type === 'report' && (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      )}
      {type === 'vitals' && (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
      )}
      {type === 'appointment' && (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
        </svg>
      )}
      {type === 'medication' && (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
        </svg>
      )}
    </span>
  );
}

// ─── Toast simples ────────────────────────────────────────────────────────────
function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl shadow-modal animate-fade-in"
    >
      <svg className="w-4 h-4 text-brand-400 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
      </svg>
      {message}
    </div>
  );
}

// ─── Aba: Análise ─────────────────────────────────────────────────────────────
function AnalysisTab({
  patient,
  summary,
  timeline,
  summaryLoading,
}: {
  patient: Patient;
  summary?: AssistantSummary;
  timeline: TimelineEvent[];
  summaryLoading: boolean;
}) {
  const vh = patient.vitalsHistory;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Coluna esquerda (resumo + timeline) */}
      <div className="lg:col-span-2 flex flex-col gap-6">

        {/* Resumo do assistente */}
        <section aria-label="Resumo do assistente de dados" className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
              </span>
              <h3 className="text-sm font-semibold text-slate-800">Resumo do assistente</h3>
            </div>
            {summary && (
              <span className="text-xs text-slate-400">
                {formatDate(summary.generatedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          {summaryLoading ? (
            <div className="flex justify-center py-6"><Spinner /></div>
          ) : summary ? (
            <>
              <p className="text-sm text-slate-700 leading-relaxed mb-4">{summary.summaryText}</p>

              {summary.changesDetected.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                    Variações detectadas
                  </p>
                  <ul className="flex flex-col gap-1.5">
                    {summary.changesDetected.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2 ring-1 ring-amber-200">
                        <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer obrigatório */}
              <p className="text-xs text-slate-400 border-t border-slate-200 mt-4 pt-3">
                ⓘ Este resumo é gerado automaticamente com base nos dados registrados. <strong>Não substitui avaliação clínica nem emite diagnóstico.</strong>
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400">Nenhum resumo disponível para este paciente.</p>
          )}
        </section>

        {/* Timeline de eventos */}
        <section aria-label="Timeline de eventos">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Timeline de eventos</h3>
          {timeline.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum evento registrado.</p>
          ) : (
            <ol className="relative flex flex-col gap-0">
              {timeline.map((event, idx) => (
                <li key={event.id} className="flex gap-4 pb-6 relative">
                  {/* Linha vertical */}
                  {idx < timeline.length - 1 && (
                    <span className="absolute left-4 top-8 bottom-0 w-px bg-slate-200" aria-hidden="true" />
                  )}
                  <TimelineIcon type={event.type} hasFlag={event.hasFlag} />
                  <div className="flex-1 pt-1 min-w-0">
                    <p className="text-sm text-slate-700 font-medium">{event.description}</p>
                    <time
                      dateTime={event.date}
                      className="text-xs text-slate-400 mt-0.5 block"
                    >
                      {relativeDate(event.date)} às {formatTime(event.date)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>

      {/* Coluna direita (sinais vitais — mini gráficos) */}
      <aside aria-label="Tendências de sinais vitais (últimos 7 dias)">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
          Sinais vitais · últimos 7 dias
        </h3>
        <div className="flex flex-col gap-3">
          <VitalsTrendCard
            label="Pressão sistólica"
            unit="mmHg"
            currentValue={patient.lastVitals?.bloodPressureSystolic ?? '—'}
            values={vh.systolic}
          />
          <VitalsTrendCard
            label="Pressão diastólica"
            unit="mmHg"
            currentValue={patient.lastVitals?.bloodPressureDiastolic ?? '—'}
            values={vh.diastolic}
          />
          <VitalsTrendCard
            label="Frequência cardíaca"
            unit="bpm"
            currentValue={patient.lastVitals?.heartRate ?? '—'}
            values={vh.heartRate}
          />
          <VitalsTrendCard
            label="Oxigenação"
            unit="%"
            currentValue={patient.lastVitals?.oxygenSaturation ?? '—'}
            values={vh.oxygenSaturation}
            inverseScale
          />
          <VitalsTrendCard
            label="Peso"
            unit="kg"
            currentValue={patient.lastVitals?.weight?.toFixed(1) ?? '—'}
            values={vh.weight}
          />
        </div>
      </aside>
    </div>
  );
}

// ─── Aba: Relatos ─────────────────────────────────────────────────────────────
const MOOD_MAP: Record<string, { label: string; emoji: string }> = {
  feliz:   { label: 'Feliz',    emoji: '😊' },
  normal:  { label: 'Normal',   emoji: '😐' },
  triste:  { label: 'Triste',   emoji: '😔' },
  ansioso: { label: 'Ansioso',  emoji: '😰' },
};

function ReportsTab({ reports }: { reports: DailyReport[] }) {
  const [symptomFilter, setSymptomFilter] = useState('');

  const filtered = symptomFilter
    ? reports.filter(r =>
        r.symptoms.some(s => s.toLowerCase().includes(symptomFilter.toLowerCase())) ||
        r.description.toLowerCase().includes(symptomFilter.toLowerCase())
      )
    : reports;

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <input
          type="search"
          value={symptomFilter}
          onChange={e => setSymptomFilter(e.target.value)}
          placeholder="Filtrar por sintoma ou palavra-chave…"
          aria-label="Filtrar relatos"
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
        />
        <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">
          {filtered.length} de {reports.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-12">Nenhum relato encontrado.</p>
      ) : (
        <ol className="flex flex-col gap-3" aria-label="Lista de relatos">
          {filtered.map(r => {
            const m = MOOD_MAP[r.mood] ?? { label: r.mood, emoji: '—' };
            return (
              <li key={r.id} className="bg-white rounded-xl border border-slate-100 shadow-card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <time dateTime={r.date} className="text-xs font-medium text-slate-500">
                    {formatDate(r.date, { day: 'numeric', month: 'long', year: 'numeric' })} · {formatTime(r.date)}
                  </time>
                  <span
                    aria-label={`Humor: ${m.label}`}
                    className="text-lg leading-none"
                    title={m.label}
                  >
                    {m.emoji}
                  </span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed mb-3">{r.description}</p>
                {r.symptoms.length > 0 && (
                  <div className="flex flex-wrap gap-1.5" role="list" aria-label="Sintomas">
                    {r.symptoms.map((s, i) => (
                      <Badge key={i} variant="warning">{s}</Badge>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

// ─── Aba: Sinais Vitais ───────────────────────────────────────────────────────
interface VitalsTabProps {
  patientId: string;
  onSuccess: (msg: string) => void;
}
function VitalsTab({ patientId, onSuccess }: VitalsTabProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    oxygenSaturation: '',
    weight: '',
    temperature: '',
  });

  function setField(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await addVitalSign({
        patientId,
        date: new Date().toISOString(),
        bloodPressureSystolic:  Number(form.bloodPressureSystolic),
        bloodPressureDiastolic: Number(form.bloodPressureDiastolic),
        heartRate:              Number(form.heartRate),
        oxygenSaturation:       Number(form.oxygenSaturation),
        weight:      form.weight      ? Number(form.weight)      : undefined,
        temperature: form.temperature ? Number(form.temperature) : undefined,
        recordedBy: user?.nomeCompleto,
      });
      setForm({ bloodPressureSystolic: '', bloodPressureDiastolic: '', heartRate: '', oxygenSaturation: '', weight: '', temperature: '' });
      onSuccess('Sinais vitais registrados com sucesso.');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent';
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1';

  return (
    <div className="max-w-2xl">
      {/* Formulário */}
      <section aria-label="Registrar novos sinais vitais" className="bg-white rounded-xl border border-slate-100 shadow-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Registrar sinais vitais</h3>
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="vs-sys" className={labelCls}>PA sistólica (mmHg) *</label>
              <input id="vs-sys" type="number" min={50} max={250} required value={form.bloodPressureSystolic} onChange={e => setField('bloodPressureSystolic', e.target.value)} className={inputCls} placeholder="ex: 120" />
            </div>
            <div>
              <label htmlFor="vs-dia" className={labelCls}>PA diastólica (mmHg) *</label>
              <input id="vs-dia" type="number" min={30} max={150} required value={form.bloodPressureDiastolic} onChange={e => setField('bloodPressureDiastolic', e.target.value)} className={inputCls} placeholder="ex: 80" />
            </div>
            <div>
              <label htmlFor="vs-hr" className={labelCls}>Frequência cardíaca (bpm) *</label>
              <input id="vs-hr" type="number" min={30} max={220} required value={form.heartRate} onChange={e => setField('heartRate', e.target.value)} className={inputCls} placeholder="ex: 80" />
            </div>
            <div>
              <label htmlFor="vs-o2" className={labelCls}>Oxigenação (%) *</label>
              <input id="vs-o2" type="number" min={70} max={100} required value={form.oxygenSaturation} onChange={e => setField('oxygenSaturation', e.target.value)} className={inputCls} placeholder="ex: 98" />
            </div>
            <div>
              <label htmlFor="vs-wt" className={labelCls}>Peso (kg)</label>
              <input id="vs-wt" type="number" min={30} max={200} step="0.1" value={form.weight} onChange={e => setField('weight', e.target.value)} className={inputCls} placeholder="ex: 68.5" />
            </div>
            <div>
              <label htmlFor="vs-temp" className={labelCls}>Temperatura (°C)</label>
              <input id="vs-temp" type="number" min={35} max={42} step="0.1" value={form.temperature} onChange={e => setField('temperature', e.target.value)} className={inputCls} placeholder="ex: 36.5" />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {saving ? <Spinner size="sm" /> : null}
            {saving ? 'Salvando…' : 'Registrar'}
          </button>
        </form>
      </section>

      {/* Histórico — usa dados mockados do paciente */}
      <section aria-label="Histórico de sinais vitais">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Histórico (últimos 7 dias)</h3>
        <p className="text-xs text-slate-400 mb-3">Dados do gráfico de tendências na aba Análise.</p>
        <div className="bg-white rounded-xl border border-slate-100 shadow-card overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th scope="col" className="px-4 py-2.5 text-left font-semibold text-slate-500">Data</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold text-slate-500">PA</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold text-slate-500">FC</th>
                <th scope="col" className="px-4 py-2.5 text-right font-semibold text-slate-500">O₂</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {Array.from({ length: 7 }).map((_, i) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - i));
                return (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 text-slate-600">
                      {d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-700 font-medium">
                      — / —
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">—</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-slate-600">—</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// ─── Aba: Prontuário ──────────────────────────────────────────────────────────
interface ProntuarioTabProps {
  patientId: string;
  records: MedicalRecord[];
  onSuccess: (msg: string) => void;
}
function ProntuarioTab({ patientId, records, onSuccess }: ProntuarioTabProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [localRecords, setLocalRecords] = useState(records);
  const [form, setForm] = useState({
    summary: '',
    actions: '',
    nextAppointment: '',
  });

  useEffect(() => { setLocalRecords(records); }, [records]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.summary.trim()) return;
    setSaving(true);
    try {
      const rec = await addMedicalRecord({
        patientId,
        date: new Date().toISOString(),
        summary: form.summary,
        actions: form.actions.split('\n').map(s => s.trim()).filter(Boolean),
        nextAppointment: form.nextAppointment || undefined,
        doctorId: user?.id ?? 'doc1',
        doctorName: user?.nomeCompleto ?? 'Dr. Médico',
      });
      setLocalRecords(prev => [rec, ...prev]);
      setForm({ summary: '', actions: '', nextAppointment: '' });
      onSuccess('Registro adicionado ao prontuário.');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent';
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1';

  return (
    <div className="max-w-2xl">
      {/* Form */}
      <section aria-label="Adicionar registro ao prontuário" className="bg-white rounded-xl border border-slate-100 shadow-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Novo registro de atendimento</h3>
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-4 mb-4">
            <div>
              <label htmlFor="pr-summary" className={labelCls}>Resumo do atendimento *</label>
              <textarea
                id="pr-summary"
                required
                rows={4}
                value={form.summary}
                onChange={e => setForm(p => ({ ...p, summary: e.target.value }))}
                placeholder="Descreva o que ocorreu no atendimento…"
                className={`${inputCls} resize-none`}
              />
            </div>
            <div>
              <label htmlFor="pr-actions" className={labelCls}>Ações realizadas (uma por linha)</label>
              <textarea
                id="pr-actions"
                rows={3}
                value={form.actions}
                onChange={e => setForm(p => ({ ...p, actions: e.target.value }))}
                placeholder={'Solicitado exame X\nOrientado sobre Y\nPrescrito Z'}
                className={`${inputCls} resize-none`}
              />
            </div>
            <div>
              <label htmlFor="pr-next" className={labelCls}>Próxima consulta</label>
              <input
                id="pr-next"
                type="date"
                value={form.nextAppointment}
                onChange={e => setForm(p => ({ ...p, nextAppointment: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !form.summary.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {saving ? <Spinner size="sm" /> : null}
            {saving ? 'Salvando…' : 'Salvar registro'}
          </button>
        </form>
      </section>

      {/* Histórico */}
      <section aria-label="Histórico de atendimentos">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Histórico de atendimentos</h3>
        {localRecords.length === 0 ? (
          <p className="text-sm text-slate-400 py-8 text-center">Nenhum atendimento registrado.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {localRecords.map(rec => (
              <li key={rec.id} className="bg-white rounded-xl border border-slate-100 shadow-card p-4">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <time dateTime={rec.date} className="text-xs font-medium text-slate-500">
                    {formatDate(rec.date, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </time>
                  <span className="text-xs text-slate-400">{rec.doctorName}</span>
                </div>
                <p className="text-sm text-slate-700 mb-3">{rec.summary}</p>
                {rec.actions.length > 0 && (
                  <ul className="flex flex-col gap-1 mb-3" aria-label="Ações realizadas">
                    {rec.actions.map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <span className="text-brand-500 mt-0.5 flex-shrink-0">✓</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
                {rec.nextAppointment && (
                  <p className="text-xs text-brand-700 bg-brand-50 px-2.5 py-1.5 rounded-lg inline-block">
                    Próxima consulta: {formatDate(rec.nextAppointment, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

// ─── Aba: Medicamentos ────────────────────────────────────────────────────────
interface MedicamentosTabProps {
  patientId: string;
  medications: Medication[];
  onSuccess: (msg: string) => void;
}
function MedicamentosTab({ patientId, medications, onSuccess }: MedicamentosTabProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [localMeds, setLocalMeds] = useState(medications);
  const [form, setForm] = useState({
    name: '', dose: '', frequency: '', duration: '', notes: '',
  });

  useEffect(() => { setLocalMeds(medications); }, [medications]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      const med = await addMedication({
        patientId,
        name: form.name,
        dose: form.dose,
        frequency: form.frequency,
        duration: form.duration,
        notes: form.notes || undefined,
        startDate: new Date().toISOString().split('T')[0],
        isActive: true,
        prescribedBy: user?.nomeCompleto ?? 'Dr. Médico',
      });
      setLocalMeds(prev => [med, ...prev]);
      setForm({ name: '', dose: '', frequency: '', duration: '', notes: '' });
      onSuccess('Medicamento cadastrado. O paciente será notificado. (Simulação)');
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent';
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1';

  const active   = localMeds.filter(m => m.isActive);
  const inactive = localMeds.filter(m => !m.isActive);

  return (
    <div className="max-w-2xl">
      {/* Form */}
      <section aria-label="Prescrever novo medicamento" className="bg-white rounded-xl border border-slate-100 shadow-card p-5 mb-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-4">Prescrever medicamento</h3>
        <form onSubmit={handleSubmit} noValidate>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label htmlFor="med-name" className={labelCls}>Nome do medicamento *</label>
              <input id="med-name" type="text" required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} placeholder="ex: Metildopa" />
            </div>
            <div>
              <label htmlFor="med-dose" className={labelCls}>Dosagem *</label>
              <input id="med-dose" type="text" required value={form.dose} onChange={e => setForm(p => ({ ...p, dose: e.target.value }))} className={inputCls} placeholder="ex: 250mg" />
            </div>
            <div>
              <label htmlFor="med-freq" className={labelCls}>Frequência *</label>
              <input id="med-freq" type="text" required value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))} className={inputCls} placeholder="ex: 3x ao dia" />
            </div>
            <div>
              <label htmlFor="med-dur" className={labelCls}>Duração *</label>
              <input id="med-dur" type="text" required value={form.duration} onChange={e => setForm(p => ({ ...p, duration: e.target.value }))} className={inputCls} placeholder="ex: 30 dias" />
            </div>
            <div>
              <label htmlFor="med-notes" className={labelCls}>Observações</label>
              <input id="med-notes" type="text" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} className={inputCls} placeholder="instruções especiais…" />
            </div>
          </div>
          <button
            type="submit"
            disabled={saving || !form.name.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {saving ? <Spinner size="sm" /> : null}
            {saving ? 'Salvando…' : 'Prescrever'}
          </button>
        </form>
      </section>

      {/* Lista — ativos */}
      <section aria-label="Medicamentos ativos">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Em uso ({active.length})</h3>
        {active.length === 0 ? (
          <p className="text-sm text-slate-400 mb-6">Nenhum medicamento ativo.</p>
        ) : (
          <ul className="flex flex-col gap-2 mb-6">
            {active.map(m => (
              <li key={m.id} className="bg-white rounded-xl border border-slate-100 shadow-card px-4 py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">{m.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{m.dose} · {m.frequency} · {m.duration}</p>
                  {m.notes && <p className="text-xs text-brand-700 mt-1">{m.notes}</p>}
                  <p className="text-xs text-slate-400 mt-1">Prescrito por {m.prescribedBy}</p>
                </div>
                <Badge variant="success">Ativo</Badge>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Lista — inativos */}
      {inactive.length > 0 && (
        <section aria-label="Medicamentos inativos">
          <h3 className="text-sm font-semibold text-slate-500 mb-3">Histórico — suspensos ({inactive.length})</h3>
          <ul className="flex flex-col gap-2">
            {inactive.map(m => (
              <li key={m.id} className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-500">{m.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{m.dose} · {m.frequency} · {m.duration}</p>
                </div>
                <Badge variant="neutral">Suspenso</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [patient,   setPatient]   = useState<Patient | null>(null);
  const [reports,   setReports]   = useState<DailyReport[]>([]);
  const [meds,      setMeds]      = useState<Medication[]>([]);
  const [records,   setRecords]   = useState<MedicalRecord[]>([]);
  const [summary,   setSummary]   = useState<AssistantSummary | undefined>();
  const [timeline,  setTimeline]  = useState<TimelineEvent[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [toast,     setToast]     = useState<string | null>(null);

  const activeTab = searchParams.get('tab') ?? 'analise';
  function setTab(v: string) {
    setSearchParams(prev => { prev.set('tab', v); return prev; }, { replace: true });
  }

  useEffect(() => {
    if (!id) return;
    setLoading(true);

    Promise.all([
      fetchPatient(id),
      fetchReports(id),
      fetchMedications(id),
      fetchMedicalRecords(id),
      fetchTimeline(id),
    ])
      .then(([p, r, m, rec, tl]) => {
        if (!p) { setError('Paciente não encontrado.'); return; }
        setPatient(p);
        setReports(r);
        setMeds(m);
        setRecords(rec);
        setTimeline(tl);
      })
      .catch(() => setError('Erro ao carregar dados do paciente.'))
      .finally(() => setLoading(false));

    // Carrega resumo da IA separadamente (pode demorar mais)
    setSummaryLoading(true);
    fetchSummary(id)
      .then(setSummary)
      .finally(() => setSummaryLoading(false));
  }, [id]);

  if (loading) {
    return (
      <DoctorLayout>
        <PageSpinner label="Carregando dados do paciente…" />
      </DoctorLayout>
    );
  }

  if (error || !patient) {
    return (
      <DoctorLayout>
        <div className="px-6 py-8 max-w-xl mx-auto" role="alert">
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm px-5 py-4">
            {error ?? 'Paciente não encontrado.'}
          </div>
        </div>
      </DoctorLayout>
    );
  }

  return (
    <DoctorLayout>
      {/* Header fixo do paciente */}
      <PatientHeader patient={patient} />

      {/* Tabs + conteúdo */}
      <div className="px-6 pb-8">
        <Tabs value={activeTab} onValueChange={setTab}>
          <TabsList aria-label="Seções do paciente" className="mb-0">
            <TabsTrigger value="analise">Análise</TabsTrigger>
            <TabsTrigger value="relatos">Relatos</TabsTrigger>
            <TabsTrigger value="sinais-vitais">Sinais Vitais</TabsTrigger>
            <TabsTrigger value="prontuario">Prontuário</TabsTrigger>
            <TabsTrigger value="medicamentos">Medicamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="analise">
            <AnalysisTab
              patient={patient}
              summary={summary}
              timeline={timeline}
              summaryLoading={summaryLoading}
            />
          </TabsContent>

          <TabsContent value="relatos">
            <ReportsTab reports={reports} />
          </TabsContent>

          <TabsContent value="sinais-vitais">
            <VitalsTab patientId={patient.id} onSuccess={setToast} />
          </TabsContent>

          <TabsContent value="prontuario">
            <ProntuarioTab
              patientId={patient.id}
              records={records}
              onSuccess={setToast}
            />
          </TabsContent>

          <TabsContent value="medicamentos">
            <MedicamentosTab
              patientId={patient.id}
              medications={meds}
              onSuccess={setToast}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </DoctorLayout>
  );
}
