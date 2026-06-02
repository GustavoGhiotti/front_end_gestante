import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DoctorLayout } from '../../components/layout/DoctorLayout';
import { PatientHeader } from '../../components/doctor/PatientHeader';
import { Card, CardBody, CardHeader } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/Tabs';
import { PageSpinner, Spinner } from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import {
  type Patient, type DailyReport, type Medication, type PrenatalProfile, type MedicalExam,
  type MedicalRecord, type AssistantSummary, type TimelineEvent,
} from '../../types/doctor';
import {
  addOrientation,
  addMedication,
  addMedicalRecord,
  approvePatientSummary,
  deletePatientSummary,
  deleteMedicalRecord,
  deleteMedication,
  fetchPatientDetailsBundle,
  fetchPatientExams,
  fetchPatientSummaries,
  generatePatientSummary,
  updateDailyReport,
  updateMedicalRecord,
  updateMedication,
  updatePrenatalProfile,
  type ReviewedSummary,
} from '../../services/doctorApi';
import { formatDate, formatTime, relativeDate } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';
import { formatExamSize, getExamDownloadUrl } from '../../services/examsService';

// Mapa de ícones de tipo de evento
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

// Toast simples
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

function SemaforoBadgeInline({ status }: { status: 'verde' | 'amarelo' | 'vermelho' }) {
  const cls =
    status === 'vermelho'
      ? 'bg-red-50 text-red-700 border-red-200'
      : status === 'amarelo'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200';
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

type ReviewTextParts = {
  body: string;
  referencesLabel: string;
  referencesText: string;
  referenceItems: string[];
};

function parseReviewTextParts(text: string, fallbackLabel = 'Referências'): ReviewTextParts {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return {
      body: '',
      referencesLabel: fallbackLabel,
      referencesText: '',
      referenceItems: [],
    };
  }

  const match = /\b(Base consultada|Refer[eê]ncias?)\s*:\s*([\s\S]+)$/i.exec(trimmedText);
  if (!match || typeof match.index !== 'number') {
    return {
      body: trimmedText,
      referencesLabel: fallbackLabel,
      referencesText: '',
      referenceItems: [],
    };
  }

  const body = trimmedText.slice(0, match.index).trim();
  const referencesLabel = match[1];
  const referencesText = match[2].trim().replace(/\s+$/, '');
  const normalizedReferences = referencesText.replace(/\.\s*$/, '');
  const referenceItems = normalizedReferences
    .split(/\s*;\s*/)
    .map((item) => item.trim())
    .filter(Boolean);

  return {
    body,
    referencesLabel,
    referencesText,
    referenceItems,
  };
}

function composeReviewTextParts(parts: ReviewTextParts): string {
  const body = parts.body.trim();
  const referencesText = parts.referencesText.trim();
  if (!referencesText) return body;

  const normalizedBody = body && !/[.!?]$/.test(body) ? `${body}.` : body;
  return `${normalizedBody} ${parts.referencesLabel}: ${referencesText}`.trim();
}

function ReferencesPanel({
  label,
  referencesText,
  referenceItems,
}: {
  label: string;
  referencesText: string;
  referenceItems: string[];
}) {
  if (!referencesText.trim()) return null;

  return (
    <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-slate-600" aria-hidden="true">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </span>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</h4>
      </div>

      {referenceItems.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {referenceItems.map((item, index) => (
            <li key={`${item}-${index}`} className="rounded-lg bg-white px-3 py-2 text-sm leading-relaxed text-slate-600 ring-1 ring-slate-200">
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-slate-600">{referencesText}</p>
      )}
    </div>
  );
}

function DoctorSummaryDetailModal({
  summary,
  reviewSummary,
  reviewRecommendations,
  onSummaryChange,
  onRecommendationsChange,
  onApprove,
  approving,
  onDelete,
  deleting,
  onClose,
}: {
  summary: ReviewedSummary;
  reviewSummary: ReviewTextParts;
  reviewRecommendations: ReviewTextParts;
  onSummaryChange: (value: string) => void;
  onRecommendationsChange: (value: string) => void;
  onApprove: () => void;
  approving: boolean;
  onDelete: () => void;
  deleting: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Resumo ${summary.type === 'diario' ? 'diário' : 'semanal'} - ${formatDate(summary.date)}`}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-5">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          <strong>Resumo para revisão médica.</strong>{' '}
          A gestante só verá este conteúdo depois da aprovação do médico.
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={summary.status === 'approved' ? 'success' : 'warning'}>
            {summary.status === 'approved' ? 'Aprovado para paciente' : 'Pendente de aprovação'}
          </Badge>
          <SemaforoBadgeInline status={summary.semaphore} />
        </div>

        <section aria-labelledby="doctor-ai-analysis">
          <h3 id="doctor-ai-analysis" className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Análise gerada pela IA
          </h3>
          <p className="text-sm leading-relaxed text-slate-700">{summary.summary}</p>
        </section>

        {summary.symptoms.length > 0 && (
          <section aria-labelledby="doctor-ai-symptoms">
            <h3 id="doctor-ai-symptoms" className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Sintomas identificados
            </h3>
            <div className="flex flex-wrap gap-2">
              {summary.symptoms.map((symptom) => (
                <Badge key={symptom} variant="neutral">
                  {symptom}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {summary.alerts.length > 0 && (
          <section aria-labelledby="doctor-ai-alerts">
            <h3 id="doctor-ai-alerts" className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pontos de atenção
            </h3>
            <ul className="space-y-1.5">
              {summary.alerts.map((alert, index) => (
                <li key={`${alert}-${index}`} className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-100">
                  {alert}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="doctor-ai-approved-text">
          <h3 id="doctor-ai-approved-text" className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Texto que será exibido para a paciente
          </h3>
          <textarea
            rows={6}
            value={reviewSummary.body}
            onChange={(e) => onSummaryChange(e.target.value)}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
          <ReferencesPanel
            label={reviewSummary.referencesLabel}
            referencesText={reviewSummary.referencesText}
            referenceItems={reviewSummary.referenceItems}
          />
        </section>

        <section aria-labelledby="doctor-ai-approved-recommendations">
          <h3 id="doctor-ai-approved-recommendations" className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            Recomendações para a paciente
          </h3>
          <textarea
            rows={4}
            value={reviewRecommendations.body}
            onChange={(e) => onRecommendationsChange(e.target.value)}
            className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-600"
          />
          <ReferencesPanel
            label={reviewRecommendations.referencesLabel}
            referencesText={reviewRecommendations.referencesText}
            referenceItems={reviewRecommendations.referenceItems}
          />
        </section>

        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400">
            {summary.status === 'approved'
              ? `Aprovado em ${summary.approvedAt ? formatDate(summary.approvedAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'data indisponível'}.`
              : 'Este resumo ainda não está visível para a gestante.'}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDelete}
              disabled={approving || deleting}
              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
            >
              {deleting ? 'Apagando...' : 'Apagar'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={approving || deleting}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60"
            >
              Fechar
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={approving || deleting || !reviewSummary.body.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {approving ? <Spinner size="sm" /> : null}
              {summary.status === 'approved' ? 'Atualizar aprovação' : 'Aprovar para paciente'}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

// Aba: Análise
function AnalysisTab({
  summary,
  timeline,
  reports,
  summaryLoading,
}: {
  summary?: AssistantSummary;
  timeline: TimelineEvent[];
  reports: DailyReport[];
  summaryLoading: boolean;
}) {
  const symptomCount = new Map<string, number>();
  const moodCount = new Map<string, number>();

  reports.forEach((report) => {
    moodCount.set(report.mood, (moodCount.get(report.mood) ?? 0) + 1);
    report.symptoms.forEach((symptom) => {
      symptomCount.set(symptom, (symptomCount.get(symptom) ?? 0) + 1);
    });
  });

  const recurringSymptoms = [...symptomCount.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1]);
  const priorityReports = reports
    .filter((report) => report.highlightForConsultation || REPORT_PRIORITY_META[report.clinicalPriority].order >= 3)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const topMood = [...moodCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const reportLookup = new Map(reports.map((report) => [report.id, report] as const));
  const reportWindowLabel = reports.length > 0
    ? `${formatDate(reports[reports.length - 1].date, { day: 'numeric', month: 'short' })} a ${formatDate(reports[0].date, { day: 'numeric', month: 'short' })}`
    : 'Sem periodo consolidado';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 flex flex-col gap-6">
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

              <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Relatos no periodo</p>
                  <p className="mt-1 text-lg font-semibold text-slate-800">{reports.length}</p>
                  <p className="text-xs text-slate-500">{reportWindowLabel}</p>
                </div>
                <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sintomas recorrentes</p>
                  <p className="mt-1 text-lg font-semibold text-slate-800">{recurringSymptoms.length}</p>
                  <p className="text-xs text-slate-500">Aparecem em 2 ou mais relatos</p>
                </div>
                <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Eventos priorizados</p>
                  <p className="mt-1 text-lg font-semibold text-slate-800">{priorityReports.length}</p>
                  <p className="text-xs text-slate-500">Destaques para revisao clinica</p>
                </div>
                <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Humor mais frequente</p>
                  <p className="mt-1 text-lg font-semibold text-slate-800">{topMood ? (MOOD_MAP[topMood[0]]?.label ?? topMood[0]) : 'Sem dado'}</p>
                  <p className="text-xs text-slate-500">{topMood ? `${topMood[1]} registro(s)` : 'Nenhum relato ainda'}</p>
                </div>
              </div>

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

              {recurringSymptoms.length > 0 && (
                <section className="mt-4">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Padrões recorrentes
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {recurringSymptoms.slice(0, 6).map(([symptom, count]) => (
                      <div key={symptom} className="rounded-lg bg-white px-3 py-3 ring-1 ring-slate-200">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-sm font-medium text-slate-700">{symptom}</span>
                          <Badge variant={count >= 3 ? 'warning' : 'neutral'}>{count}x</Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">Apareceu em {count} relato(s) recentes.</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {priorityReports[0] && (
                <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Ponto principal para a consulta</p>
                  <p className="mt-1 text-sm font-medium text-amber-900">
                    {priorityReports[0].priorityReason || priorityReports[0].description || 'Relato priorizado mais recente.'}
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    {formatDate(priorityReports[0].date, { day: 'numeric', month: 'long' })} · prioridade {REPORT_PRIORITY_META[priorityReports[0].clinicalPriority].label.toLowerCase()}
                  </p>
                </section>
              )}

              <p className="text-xs text-slate-400 border-t border-slate-200 mt-4 pt-3">
                Este resumo é gerado automaticamente com base nos dados registrados. <strong>Não substitui avaliação clínica nem emite diagnóstico.</strong>
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-400">Nenhum resumo disponível para este paciente.</p>
          )}

        </section>

        <section aria-label="Timeline de eventos">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Timeline de eventos</h3>
          {timeline.length === 0 ? (
            <p className="text-sm text-slate-400">Nenhum evento registrado.</p>
          ) : (
            <ol className="relative flex flex-col gap-0">
              {timeline.map((event, idx) => (
                <li key={event.id} className="flex gap-4 pb-6 relative">
                  {idx < timeline.length - 1 && (
                    <span className="absolute left-4 top-8 bottom-0 w-px bg-slate-200" aria-hidden="true" />
                  )}
                  <TimelineIcon type={event.type} hasFlag={event.hasFlag} />
                  <div className="flex-1 pt-1 min-w-0">
                    <p className="text-sm text-slate-700 font-medium">{event.description}</p>
                    {event.type === 'report' ? (() => {
                      const report = reportLookup.get(event.id.replace('t-', ''));
                      if (!report) return null;
                      return (
                        <p className="mt-1 text-xs text-slate-500">
                          {report.symptoms.length > 0 ? `${report.symptoms.length} sintoma(s) associado(s)` : 'Sem sintomas adicionais'} · prioridade {REPORT_PRIORITY_META[report.clinicalPriority].label.toLowerCase()}
                        </p>
                      );
                    })() : null}
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

      <div className="flex flex-col gap-6">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card" aria-label="Recorrencia de sintomas">
          <h3 className="text-sm font-semibold text-slate-800">Recorrências do período</h3>
          <p className="mt-1 text-sm text-slate-500">Contagem rápida para leitura geral das variações mais repetidas.</p>
          {recurringSymptoms.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Ainda não há recorrências claras nos relatos recentes.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {recurringSymptoms.map(([symptom, count]) => (
                <li key={symptom} className="rounded-lg bg-slate-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-slate-700">{symptom}</span>
                    <span className="text-xs font-semibold text-slate-500">{count} ocorrência(s)</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-slate-200">
                    <div
                      className="h-2 rounded-full bg-brand-500"
                      style={{ width: `${Math.min(100, (count / Math.max(reports.length, 1)) * 100)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-card" aria-label="Eventos clinicos relevantes">
          <h3 className="text-sm font-semibold text-slate-800">Eventos para revisão</h3>
          <p className="mt-1 text-sm text-slate-500">Relatos já marcados com maior relevância clínica.</p>
          {priorityReports.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">Nenhum evento priorizado até o momento.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {priorityReports.slice(0, 4).map((report) => (
                <li key={report.id} className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                      {REPORT_PRIORITY_META[report.clinicalPriority].label}
                    </span>
                    <span className="text-xs text-amber-700">{formatDate(report.date, { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <p className="mt-2 text-sm text-amber-900">
                    {report.priorityReason || report.description || 'Relato priorizado sem detalhe adicional.'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

    </div>
  );
}

const CHRONIC_CONDITION_OPTIONS = [
  'Hipertensao cronica',
  'Diabetes pre-gestacional',
  'Diabetes gestacional',
  'Doenca tireoidiana',
  'Doenca renal',
  'Cardiopatia',
  'Asma ou doenca respiratoria',
  'Epilepsia',
  'Trombofilia',
  'Doenca autoimune',
  'Obesidade',
  'Infeccoes de relevancia clinica',
] as const;

const PREVIOUS_COMPLICATION_OPTIONS = [
  'Pre-eclampsia ou eclampsia previa',
  'Parto prematuro previo',
  'Abortamento de repeticao',
  'Hemorragia obstetrica',
  'Restricao de crescimento fetal',
  'Natimorto ou obito neonatal',
  'Cesarea previa',
  'Gestacao multipla previa',
] as const;

const FAMILY_HISTORY_OPTIONS = [
  'Hipertensao arterial',
  'Diabetes mellitus',
  'Gemelaridade',
  'Trombose ou trombofilia',
  'Malformacoes congenitas',
  'Doenca cardiovascular precoce',
] as const;

const DEFAULT_PRENATAL_PROFILE: PrenatalProfile = {
  riskClassification: 'habitual',
  chronicConditions: [],
  previousPregnancyComplications: [],
  familyHistory: [],
  allergies: '',
  continuousMedications: '',
  surgeries: '',
  obstetricHistory: '',
  mentalHealthNotes: '',
  socialContext: '',
  additionalNotes: '',
};

type ConsultationStructuredFields = {
  freeActions: string;
  mainComplaints: string;
  bloodPressure: string;
  weight: string;
  uterineHeight: string;
  fetalHeartRate: string;
  fetalMovement: string;
  edema: string;
  examsReviewed: string;
  guidance: string;
  referrals: string;
  warningSigns: string;
  additionalObservations: string;
};

const CONSULTATION_ACTION_LABELS: Array<{ key: Exclude<keyof ConsultationStructuredFields, 'freeActions'>; label: string }> = [
  { key: 'mainComplaints', label: 'Queixas principais' },
  { key: 'bloodPressure', label: 'PA' },
  { key: 'weight', label: 'Peso' },
  { key: 'uterineHeight', label: 'Altura uterina' },
  { key: 'fetalHeartRate', label: 'BCF' },
  { key: 'fetalMovement', label: 'Movimentação fetal' },
  { key: 'edema', label: 'Edema' },
  { key: 'examsReviewed', label: 'Exames revisados' },
  { key: 'guidance', label: 'Orientações' },
  { key: 'referrals', label: 'Encaminhamentos' },
  { key: 'warningSigns', label: 'Sinais de alerta' },
  { key: 'additionalObservations', label: 'Observações adicionais' },
];

function emptyConsultationStructuredFields(): ConsultationStructuredFields {
  return {
    freeActions: '',
    mainComplaints: '',
    bloodPressure: '',
    weight: '',
    uterineHeight: '',
    fetalHeartRate: '',
    fetalMovement: '',
    edema: '',
    examsReviewed: '',
    guidance: '',
    referrals: '',
    warningSigns: '',
    additionalObservations: '',
  };
}

function parseConsultationActions(actions: string[]): ConsultationStructuredFields {
  const parsed = emptyConsultationStructuredFields();
  const freeLines: string[] = [];

  actions.forEach((action) => {
    const matched = CONSULTATION_ACTION_LABELS.find(({ label }) => action.startsWith(`${label}: `));
    if (matched) {
      parsed[matched.key] = action.slice(matched.label.length + 2);
    } else if (action.trim()) {
      freeLines.push(action);
    }
  });

  parsed.freeActions = freeLines.join('\n');
  return parsed;
}

function buildConsultationActions(fields: ConsultationStructuredFields): string[] {
  const actions = fields.freeActions
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  CONSULTATION_ACTION_LABELS.forEach(({ key, label }) => {
    const value = fields[key].trim();
    if (value) actions.push(`${label}: ${value}`);
  });

  return actions;
}

type DoctorSummaryFilter = 'todos' | 'diario' | 'semanal';

const DOCTOR_SUMMARY_FILTERS: { value: DoctorSummaryFilter; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'diario', label: 'Diários' },
  { value: 'semanal', label: 'Semanais' },
];

function DoctorAISummariesTab({ patientId, onSuccess }: { patientId: string; onSuccess: (msg: string) => void }) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DoctorSummaryFilter>('todos');
  const [summaries, setSummaries] = useState<ReviewedSummary[]>([]);
  const [selectedSummaryId, setSelectedSummaryId] = useState<string | null>(null);
  const [reviewSummary, setReviewSummary] = useState<ReviewTextParts>(() => parseReviewTextParts('', 'Base consultada'));
  const [reviewRecommendations, setReviewRecommendations] = useState<ReviewTextParts>(() => parseReviewTextParts('', 'Referências'));
  const [detailOpen, setDetailOpen] = useState(false);

  function syncSelectedSummary(item: ReviewedSummary | null) {
    setSelectedSummaryId(item?.id ?? null);
    setReviewSummary(parseReviewTextParts(item?.summary ?? '', 'Base consultada'));
    setReviewRecommendations(parseReviewTextParts(item?.recommendations ?? '', 'Referências'));
  }

  function loadSummaries() {
    setLoading(true);
    setError(null);
    fetchPatientSummaries(patientId)
      .then((items) => {
        setSummaries(items);
        syncSelectedSummary(items[0] ?? null);
      })
      .catch(() => setError('Não foi possível carregar os resumos de IA.'))
      .finally(() => setLoading(false));
  }

  useEffect(loadSummaries, [patientId]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedSummary = summaries.find((item) => item.id === selectedSummaryId) ?? null;
  const filtered = filter === 'todos' ? summaries : summaries.filter((item) => item.type === filter);

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    const hoje = new Date();
    const inicio = new Date();
    inicio.setDate(hoje.getDate() - 30);
    try {
      const result = await generatePatientSummary(
        patientId,
        inicio.toISOString().split('T')[0],
        hoje.toISOString().split('T')[0],
      );
      setSummaries((prev) => [result, ...prev]);
      syncSelectedSummary(result);
      setDetailOpen(true);
      onSuccess('Resumo de IA gerado para revisão médica.');
    } catch {
      setError('Não foi possível gerar o resumo. Tente novamente.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleApprove() {
    if (!selectedSummary) return;
    setApproving(true);
    setError(null);
    try {
      const approved = await approvePatientSummary(selectedSummary.id, {
        summary: composeReviewTextParts(reviewSummary),
        recommendations: composeReviewTextParts(reviewRecommendations),
      });
      setSummaries((prev) => prev.map((item) => (item.id === approved.id ? approved : item)));
      syncSelectedSummary(approved);
      onSuccess(approved.status === 'approved' ? 'Resumo aprovado para a paciente.' : 'Resumo atualizado.');
      setDetailOpen(false);
    } catch {
      setError('Não foi possível aprovar o resumo para a paciente.');
    } finally {
      setApproving(false);
    }
  }

  async function handleDeleteSummary() {
    if (!selectedSummary) return;
    const confirmed = window.confirm('Apagar este resumo de IA? Essa ação não pode ser desfeita.');
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      await deletePatientSummary(selectedSummary.id);
      const remaining = summaries.filter((item) => item.id !== selectedSummary.id);
      setSummaries(remaining);
      syncSelectedSummary(remaining[0] ?? null);
      setDetailOpen(false);
      onSuccess('Resumo de IA apagado.');
    } catch {
      setError('Não foi possível apagar o resumo. Tente novamente.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-2xl font-bold text-slate-900">Resumos de IA</h3>
          <p className="mt-1 text-sm text-slate-400">
            Revise o texto gerado pela IA, ajuste o conteúdo e aprove antes de liberar para a paciente.
          </p>
        </div>
        <button
          type="button"
          disabled={generating}
          onClick={handleGenerate}
          className="inline-flex items-center gap-2 self-start rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          {generating ? <Spinner size="sm" /> : null}
          {generating ? 'Gerando...' : 'Gerar resumo (IA)'}
        </button>
      </div>

      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
        <strong>Uso médico.</strong> O conteúdo abaixo é apenas para revisão clínica e só aparece para a paciente após aprovação.
      </div>

      <div role="tablist" aria-label="Filtrar por tipo de resumo" className="mb-6 flex flex-wrap gap-2">
        {DOCTOR_SUMMARY_FILTERS.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={filter === item.value}
            onClick={() => setFilter(item.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors ${
              filter === item.value
                ? 'bg-brand-600 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:border-brand-300 hover:text-brand-700'
            }`}
          >
            {item.label}
            {item.value !== 'todos' && <span className="ml-1 opacity-70">({summaries.filter((summary) => summary.type === item.value).length})</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <PageSpinner label="Carregando resumos de IA..." />
      ) : error ? (
        <div role="alert" className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          <span>{error}</span>
          <button type="button" onClick={loadSummaries} className="ml-4 text-xs font-semibold underline">
            Tentar novamente
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardBody className="py-16 text-center">
            <svg className="mx-auto mb-3 h-10 w-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
            <p className="text-sm text-slate-400">Nenhum resumo de IA foi gerado para esta paciente ainda.</p>
            <p className="mt-2 text-xs text-slate-400">Use o botão acima para gerar um resumo e iniciar a revisão médica.</p>
          </CardBody>
        </Card>
      ) : (
        <>
          <div className="hidden sm:block">
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Data</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tipo</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Análise</th>
                      <th className="sr-only px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.map((item) => (
                      <tr
                        key={item.id}
                        className="cursor-pointer transition-colors hover:bg-slate-50/60"
                        onClick={() => {
                          syncSelectedSummary(item);
                          setDetailOpen(true);
                        }}
                      >
                        <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-800">{formatDate(item.date)}</td>
                        <td className="px-5 py-3.5">
                          <Badge variant="info">{item.type === 'diario' ? 'Diário' : 'Semanal'}</Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <Badge variant={item.status === 'approved' ? 'success' : 'warning'}>
                              {item.status === 'approved' ? 'Aprovado' : 'Pendente'}
                            </Badge>
                            <SemaforoBadgeInline status={item.semaphore} />
                          </div>
                        </td>
                        <td className="max-w-sm px-5 py-3.5 text-slate-500">
                          <p className="truncate">{item.summary}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="text-xs font-medium text-brand-600">Ver detalhes →</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          <div className="space-y-3 sm:hidden">
            {filtered.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  syncSelectedSummary(item);
                  setDetailOpen(true);
                }}
                className="w-full text-left"
                aria-label={`Ver detalhes do resumo de ${formatDate(item.date)}`}
              >
                <Card hoverable>
                  <CardHeader>
                    <span className="text-sm font-semibold text-slate-800">{formatDate(item.date)}</span>
                    <div className="flex items-center gap-2">
                      <Badge variant="info">{item.type === 'diario' ? 'Diário' : 'Semanal'}</Badge>
                      <SemaforoBadgeInline status={item.semaphore} />
                    </div>
                  </CardHeader>
                  <CardBody className="pt-0">
                    <div className="mb-2">
                      <Badge variant={item.status === 'approved' ? 'success' : 'warning'}>
                        {item.status === 'approved' ? 'Aprovado' : 'Pendente'}
                      </Badge>
                    </div>
                    <p className="line-clamp-2 text-sm text-slate-500">{item.summary}</p>
                    <p className="mt-2 text-xs font-medium text-brand-600">Ver detalhes →</p>
                  </CardBody>
                </Card>
              </button>
            ))}
          </div>
        </>
      )}

      {selectedSummary && detailOpen && (
        <DoctorSummaryDetailModal
          summary={selectedSummary}
          reviewSummary={reviewSummary}
          reviewRecommendations={reviewRecommendations}
          onSummaryChange={(value) => setReviewSummary((prev) => ({ ...prev, body: value }))}
          onRecommendationsChange={(value) => setReviewRecommendations((prev) => ({ ...prev, body: value }))}
          onApprove={handleApprove}
          approving={approving}
          onDelete={handleDeleteSummary}
          deleting={deleting}
          onClose={() => setDetailOpen(false)}
        />
      )}
    </div>
  );
}

// Aba: Relatos
const MOOD_MAP: Record<string, { label: string; emoji: string }> = {
  feliz:   { label: 'Feliz',    emoji: 'ðŸ˜Š' },
  normal:  { label: 'Normal',   emoji: 'ðŸ˜' },
  triste:  { label: 'Triste',   emoji: 'ðŸ˜”' },
  ansioso: { label: 'Ansioso',  emoji: 'ðŸ˜°' },
};

const REPORT_PRIORITY_META: Record<DailyReport['clinicalPriority'], { label: string; card: string; badge: 'danger' | 'warning' | 'success' | 'neutral'; order: number }> = {
  critica: { label: 'Critica', card: 'border-red-200 bg-red-50/50', badge: 'danger', order: 4 },
  alta: { label: 'Alta', card: 'border-amber-200 bg-amber-50/50', badge: 'warning', order: 3 },
  normal: { label: 'Normal', card: 'border-slate-100 bg-white', badge: 'neutral', order: 2 },
  baixa: { label: 'Baixa', card: 'border-emerald-200 bg-emerald-50/40', badge: 'success', order: 1 },
};

function ReportsTab({
  reports,
  onSuccess,
  onReportsChange,
}: {
  reports: DailyReport[];
  onSuccess: (msg: string) => void;
  onReportsChange: (reports: DailyReport[]) => void;
}) {
  const [symptomFilter, setSymptomFilter] = useState('');
  const [localReports, setLocalReports] = useState(reports);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [isEditingReport, setIsEditingReport] = useState(false);
  const [savingReport, setSavingReport] = useState(false);
  const [reportForm, setReportForm] = useState({
    clinicalPriority: 'normal' as DailyReport['clinicalPriority'],
    highlightForConsultation: false,
    priorityReason: '',
    doctorNote: '',
  });

  useEffect(() => {
    setLocalReports(reports);
  }, [reports]);

  function sortReports(items: DailyReport[]) {
    return [...items].sort((a, b) => {
      const priorityDelta = REPORT_PRIORITY_META[b.clinicalPriority].order - REPORT_PRIORITY_META[a.clinicalPriority].order;
      if (priorityDelta !== 0) return priorityDelta;
      if (a.highlightForConsultation !== b.highlightForConsultation) return a.highlightForConsultation ? -1 : 1;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });
  }

  function openReportModal(report: DailyReport, editMode = false) {
    setSelectedReport(report);
    setIsEditingReport(editMode);
    setReportForm({
      clinicalPriority: report.clinicalPriority,
      highlightForConsultation: report.highlightForConsultation,
      priorityReason: report.priorityReason ?? '',
      doctorNote: report.doctorNote ?? '',
    });
  }

  function closeReportModal() {
    setSelectedReport(null);
    setIsEditingReport(false);
    setReportForm({
      clinicalPriority: 'normal',
      highlightForConsultation: false,
      priorityReason: '',
      doctorNote: '',
    });
  }

  async function handleSaveReportReview(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedReport) return;
    setSavingReport(true);
    try {
      const updated = await updateDailyReport(selectedReport.id, reportForm);
      const nextReports = sortReports(localReports.map((report) => (report.id === selectedReport.id ? updated : report)));
      setLocalReports(nextReports);
      onReportsChange(nextReports);
      setSelectedReport(updated);
      setIsEditingReport(false);
      onSuccess('Relato classificado para acompanhamento clinico.');
    } finally {
      setSavingReport(false);
    }
  }

  const filtered = symptomFilter
    ? sortReports(localReports).filter(r =>
        r.symptoms.some(s => s.toLowerCase().includes(symptomFilter.toLowerCase())) ||
        r.description.toLowerCase().includes(symptomFilter.toLowerCase())
      )
    : sortReports(localReports);

  const highlightedReports = filtered.filter((report) => report.highlightForConsultation || REPORT_PRIORITY_META[report.clinicalPriority].order >= 3);
  const timelineReports = filtered.filter((report) => !highlightedReports.some((item) => item.id === report.id));

  function renderReportCard(report: DailyReport) {
    const mood = MOOD_MAP[report.mood] ?? { label: report.mood, emoji: '—' };
    const priority = REPORT_PRIORITY_META[report.clinicalPriority];

    return (
      <li key={report.id}>
        <button
          type="button"
          onClick={() => openReportModal(report)}
          className={`w-full rounded-xl border px-4 py-4 text-left shadow-card transition-shadow hover:shadow-card-md ${priority.card}`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <time dateTime={report.date} className="text-xs font-medium text-slate-500">
                  {formatDate(report.date, { day: 'numeric', month: 'long', year: 'numeric' })}
                </time>
                <Badge variant={priority.badge}>{priority.label}</Badge>
                {report.highlightForConsultation ? <Badge variant="warning">Destaque da consulta</Badge> : null}
              </div>
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-700">
                {report.description || 'Relato sem descricao detalhada.'}
              </p>
              {report.complementaryNote ? (
                <p className="mt-2 line-clamp-2 text-xs text-brand-700">
                  Nota complementar: {report.complementaryNote}
                </p>
              ) : null}
              {report.priorityReason ? (
                <p className="mt-2 line-clamp-1 text-xs text-slate-500">
                  <strong>Motivo do destaque:</strong> {report.priorityReason}
                </p>
              ) : null}
              {report.symptoms.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5" role="list" aria-label="Sintomas">
                  {report.symptoms.slice(0, 4).map((symptom, index) => (
                    <Badge key={`${report.id}-symptom-${index}`} variant="warning">{symptom}</Badge>
                  ))}
                  {report.symptoms.length > 4 ? <Badge variant="neutral">+{report.symptoms.length - 4}</Badge> : null}
                </div>
              ) : null}
            </div>
            <span aria-label={`Humor: ${mood.label}`} className="text-lg leading-none" title={mood.label}>
              {mood.emoji}
            </span>
          </div>
        </button>
      </li>
    );
  }

  return (
    <div className="space-y-6">
      <section aria-label="Guia para leitura dos relatos" className="rounded-xl border border-slate-100 bg-slate-50 p-5 shadow-card">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Triagem clinica dos relatos da gestante</h3>
            <p className="mt-1 text-sm text-slate-600">
              Use prioridade, motivo e nota medica para destacar acontecimentos importantes antes da consulta e construir um historico mais util para futuros relatórios assistidos por IA.
            </p>
          </div>
          <div className="grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
            <span className="rounded-lg bg-white px-3 py-2">Critica/Alta: aparecem primeiro na revisao.</span>
            <span className="rounded-lg bg-white px-3 py-2">Destaque da consulta: fixa o relato entre os principais.</span>
          </div>
        </div>
      </section>

      <div className="flex items-center gap-3 mb-5">
        <input
          type="search"
          value={symptomFilter}
          onChange={e => setSymptomFilter(e.target.value)}
          placeholder="Filtrar por sintoma ou palavra-chave..."
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
        <div className="space-y-6">
          {highlightedReports.length > 0 ? (
            <section aria-label="Relatos priorizados para consulta">
              <div className="mb-3">
                <h3 className="text-sm font-semibold text-slate-700">Em destaque para consulta</h3>
                <p className="text-sm text-slate-500">Relatos priorizados manualmente ou classificados com maior urgencia clínica.</p>
              </div>
              <ol className="grid gap-3 xl:grid-cols-2" aria-label="Relatos em destaque">
                {highlightedReports.map(renderReportCard)}
              </ol>
            </section>
          ) : null}

          <section aria-label="Timeline de relatos">
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-700">Linha do tempo dos relatos</h3>
              <p className="text-sm text-slate-500">Ordem ajustada por prioridade clínica e data do acontecimento.</p>
            </div>
            <ol className="flex flex-col gap-3" aria-label="Lista de relatos">
              {(timelineReports.length > 0 ? timelineReports : highlightedReports).map(renderReportCard)}
            </ol>
          </section>
        </div>
      )}

      <Modal
        isOpen={Boolean(selectedReport)}
        onClose={closeReportModal}
        title={isEditingReport ? 'Editar avaliacao do relato' : 'Detalhes do relato'}
        maxWidth="max-w-3xl"
      >
        {selectedReport ? (
          isEditingReport ? (
            <form onSubmit={handleSaveReportReview} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="report-priority" className="mb-1 block text-xs font-medium text-slate-600">Prioridade clinica</label>
                  <select
                    id="report-priority"
                    value={reportForm.clinicalPriority}
                    onChange={(e) => setReportForm((prev) => ({ ...prev, clinicalPriority: e.target.value as DailyReport['clinicalPriority'] }))}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-600"
                  >
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Critica</option>
                  </select>
                </div>
                <label className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={reportForm.highlightForConsultation}
                    onChange={(e) => setReportForm((prev) => ({ ...prev, highlightForConsultation: e.target.checked }))}
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-600"
                  />
                  Destacar este relato para a consulta
                </label>
                <div className="sm:col-span-2">
                  <label htmlFor="report-priority-reason" className="mb-1 block text-xs font-medium text-slate-600">Motivo clinico da prioridade</label>
                  <textarea
                    id="report-priority-reason"
                    rows={3}
                    value={reportForm.priorityReason}
                    onChange={(e) => setReportForm((prev) => ({ ...prev, priorityReason: e.target.value }))}
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-600"
                    placeholder="Ex.: cefaleia associada a edema e pico pressorico recente."
                  />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor="report-doctor-note" className="mb-1 block text-xs font-medium text-slate-600">Nota medica para acompanhamento e IA</label>
                  <textarea
                    id="report-doctor-note"
                    rows={5}
                    value={reportForm.doctorNote}
                    onChange={(e) => setReportForm((prev) => ({ ...prev, doctorNote: e.target.value }))}
                    className="w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-brand-600"
                    placeholder="Sintese clinica, perguntas para a consulta, correlacao com condutas ou pontos que valem entrar em relatórios futuros."
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                <button type="submit" disabled={savingReport} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                  {savingReport ? 'Salvando...' : 'Salvar avaliacao'}
                </button>
                <button type="button" onClick={() => openReportModal(selectedReport, false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {formatDate(selectedReport.date, { day: 'numeric', month: 'long', year: 'numeric' })} às {formatTime(selectedReport.date)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Humor informado pela paciente: {MOOD_MAP[selectedReport.mood]?.label ?? selectedReport.mood}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant={REPORT_PRIORITY_META[selectedReport.clinicalPriority].badge}>
                    {REPORT_PRIORITY_META[selectedReport.clinicalPriority].label}
                  </Badge>
                  {selectedReport.highlightForConsultation ? <Badge variant="warning">Destaque da consulta</Badge> : null}
                </div>
              </div>

              <section>
                <h4 className="mb-2 text-sm font-semibold text-slate-800">Relato registrado</h4>
                <p className="text-sm leading-relaxed text-slate-700">
                  {selectedReport.description || 'A paciente nao adicionou uma descricao livre neste relato.'}
                </p>
              </section>

              {selectedReport.complementaryNote ? (
                <section>
                  <h4 className="mb-2 text-sm font-semibold text-slate-800">Nota complementar da paciente</h4>
                  <p className="text-sm leading-relaxed text-slate-700">{selectedReport.complementaryNote}</p>
                </section>
              ) : null}

              {selectedReport.symptoms.length > 0 ? (
                <section>
                  <h4 className="mb-2 text-sm font-semibold text-slate-800">Sintomas associados</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedReport.symptoms.map((symptom, index) => (
                      <Badge key={`${selectedReport.id}-modal-symptom-${index}`} variant="warning">{symptom}</Badge>
                    ))}
                  </div>
                </section>
              ) : null}

              {(selectedReport.priorityReason || selectedReport.doctorNote) ? (
                <section className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Motivo da prioridade</p>
                    <p className="mt-1 text-sm text-slate-700">{selectedReport.priorityReason || 'Nao informado.'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Nota medica</p>
                    <p className="mt-1 text-sm text-slate-700">{selectedReport.doctorNote || 'Nao informada.'}</p>
                  </div>
                </section>
              ) : null}

              <div className="rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3 text-xs text-brand-800">
                Esta avaliacao fica vinculada ao relato para organizar a consulta e tambem pode servir como contexto estruturado para futuras analises e relatórios com IA.
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => openReportModal(selectedReport, true)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Editar avaliacao
                </button>
              </div>
            </div>
          )
        ) : null}
      </Modal>
    </div>
  );
}

// Aba: Prontuário
interface ProntuarioTabProps {
  patientId: string;
  records: MedicalRecord[];
  onSuccess: (msg: string) => void;
}
function ProntuarioTab({ patientId, records, onSuccess }: ProntuarioTabProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [busyRecordId, setBusyRecordId] = useState<string | null>(null);
  const [localRecords, setLocalRecords] = useState(records);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecord | null>(null);
  const [isCreateRecordModalOpen, setIsCreateRecordModalOpen] = useState(false);
  const [isRecordModalEditing, setIsRecordModalEditing] = useState(false);
  const [createRecordForm, setCreateRecordForm] = useState({
    summary: '',
    nextAppointment: '',
  });
  const [createRecordStructuredForm, setCreateRecordStructuredForm] = useState<ConsultationStructuredFields>(emptyConsultationStructuredFields());
  const [recordModalForm, setRecordModalForm] = useState({
    summary: '',
    nextAppointment: '',
  });
  const [recordModalStructuredForm, setRecordModalStructuredForm] = useState<ConsultationStructuredFields>(emptyConsultationStructuredFields());

  useEffect(() => { setLocalRecords(records); }, [records]);

  function closeRecordModal() {
    setSelectedRecord(null);
    setIsRecordModalEditing(false);
    setRecordModalForm({ summary: '', nextAppointment: '' });
    setRecordModalStructuredForm(emptyConsultationStructuredFields());
  }

  function closeCreateRecordModal() {
    setIsCreateRecordModalOpen(false);
    setCreateRecordForm({ summary: '', nextAppointment: '' });
    setCreateRecordStructuredForm(emptyConsultationStructuredFields());
  }

  async function handleCreateRecord(e: React.FormEvent) {
    e.preventDefault();
    if (!createRecordForm.summary.trim()) return;
    setSaving(true);
    try {
      const rec = await addMedicalRecord({
        patientId,
        date: new Date().toISOString(),
        summary: createRecordForm.summary,
        actions: buildConsultationActions(createRecordStructuredForm),
        nextAppointment: createRecordForm.nextAppointment || undefined,
        doctorId: user?.id ?? 'doc1',
        doctorName: user?.nomeCompleto ?? 'Dr. Médico',
      });
      if (createRecordStructuredForm.guidance.trim()) {
        await addOrientation({
          patientId,
          date: new Date().toISOString(),
          text: createRecordStructuredForm.guidance.trim(),
          doctorId: user?.id,
        });
      }
      setLocalRecords(prev => [rec, ...prev]);
      closeCreateRecordModal();
      onSuccess('Registro adicionado ao prontuário.');
    } finally {
      setSaving(false);
    }
  }

  function openRecordModal(record: MedicalRecord, editMode = false) {
    setSelectedRecord(record);
    setIsRecordModalEditing(editMode);
    const structured = parseConsultationActions(record.actions);
    setRecordModalForm({
      summary: record.summary,
      nextAppointment: record.nextAppointment?.slice(0, 10) ?? '',
    });
    setRecordModalStructuredForm(structured);
  }

  async function handleSaveRecordEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRecord || !recordModalForm.summary.trim()) return;
    setBusyRecordId(selectedRecord.id);
    try {
      const updated = await updateMedicalRecord(selectedRecord.id, {
        date: selectedRecord.date,
        summary: recordModalForm.summary,
        actions: buildConsultationActions(recordModalStructuredForm),
        doctorId: selectedRecord.doctorId || (user?.id ?? 'doc1'),
      });
      const previousGuidance = parseConsultationActions(selectedRecord.actions).guidance.trim();
      const nextGuidance = recordModalStructuredForm.guidance.trim();
      if (nextGuidance && nextGuidance !== previousGuidance) {
        await addOrientation({
          patientId,
          date: selectedRecord.date,
          text: nextGuidance,
          doctorId: selectedRecord.doctorId || user?.id,
        });
      }

      const merged = { ...selectedRecord, ...updated, nextAppointment: recordModalForm.nextAppointment || undefined };
      setLocalRecords((prev) => prev.map((record) => (record.id === selectedRecord.id ? merged : record)));
      setSelectedRecord(merged);
      setIsRecordModalEditing(false);
      onSuccess('Registro do prontuário atualizado.');
    } finally {
      setBusyRecordId(null);
    }
  }

  async function handleDeleteRecord(record: MedicalRecord) {
    if (!window.confirm('Deseja remover este registro de atendimento?')) return;
    setBusyRecordId(record.id);
    try {
      await deleteMedicalRecord(record.id);
      setLocalRecords(prev => prev.filter((item) => item.id !== record.id));
      if (selectedRecord?.id === record.id) closeRecordModal();
      onSuccess('Registro removido do prontuário.');
    } finally {
      setBusyRecordId(null);
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent';
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1';
  const textareaCls = `${inputCls} resize-none`;

  return (
    <div className="space-y-6">
      <section aria-label="Orientações para registro da consulta" className="rounded-xl border border-slate-100 bg-slate-50 p-5 shadow-card">
        <h3 className="text-sm font-semibold text-slate-800">O que vale registrar em cada consulta pré-natal</h3>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="rounded-lg bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Avaliação clínica</p>
            <p className="mt-1 text-sm text-slate-600">Queixas atuais, bem-estar materno, sinais de alerta, sintomas novos, exames revisados e reclassificação de risco.</p>
          </div>
          <div className="rounded-lg bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Condições e condutas</p>
            <p className="mt-1 text-sm text-slate-600">PA/IMC quando relevante, medicações em uso, orientações passadas, encaminhamentos, exames solicitados e plano para o retorno.</p>
          </div>
        </div>
      </section>

      <section aria-label="Histórico de atendimentos" className="min-w-0">
        <div className="mb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-700">Histórico de atendimentos</h3>
              <p className="text-sm text-slate-500">
                {localRecords.length === 0 ? 'Nenhum registro disponível.' : `${localRecords.length} registro(s) clínico(s) neste prontuário.`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateRecordModalOpen(true)}
              className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Novo registro
            </button>
          </div>
        </div>
        {localRecords.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-400 shadow-card">
            Nenhum atendimento registrado.
          </div>
        ) : (
          <ol className="grid grid-cols-1 gap-3 2xl:grid-cols-2">
            {localRecords.map(rec => (
              <li key={rec.id}>
                <button
                  type="button"
                  onClick={() => openRecordModal(rec)}
                  className="w-full rounded-xl border border-slate-100 bg-white p-4 text-left shadow-card transition-shadow hover:shadow-card-md"
                >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <time dateTime={rec.date} className="text-xs font-medium text-slate-500">
                    {formatDate(rec.date, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </time>
                  <span className="text-xs text-slate-400">{rec.doctorName}</span>
                </div>
                <p className="mb-3 text-sm leading-relaxed text-slate-700">{rec.summary}</p>
                {rec.actions.length > 0 && (
                  <ul className="mb-3 flex flex-col gap-1" aria-label="Ações realizadas">
                    {rec.actions.map((a, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs text-slate-600">
                        <span className="mt-0.5 flex-shrink-0 text-brand-500">✓</span>
                        {a}
                      </li>
                    ))}
                  </ul>
                )}
                {rec.nextAppointment && (
                  <p className="inline-block rounded-lg bg-brand-50 px-2.5 py-1.5 text-xs text-brand-700">
                    Próxima consulta: {formatDate(rec.nextAppointment, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <Modal
        isOpen={Boolean(selectedRecord)}
        onClose={closeRecordModal}
        title={isRecordModalEditing ? 'Editar registro de atendimento' : 'Detalhes do atendimento'}
        maxWidth="max-w-3xl"
      >
        {selectedRecord && (
          isRecordModalEditing ? (
            <form onSubmit={handleSaveRecordEdit} className="space-y-4">
              <div>
                <label htmlFor="record-modal-summary" className={labelCls}>Resumo do atendimento *</label>
                <textarea id="record-modal-summary" rows={6} value={recordModalForm.summary} onChange={(e) => setRecordModalForm((prev) => ({ ...prev, summary: e.target.value }))} className={textareaCls} />
              </div>
              <div className="grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-2">
                <div>
                  <label htmlFor="record-modal-complaints" className={labelCls}>Queixas principais</label>
                  <textarea id="record-modal-complaints" rows={3} value={recordModalStructuredForm.mainComplaints} onChange={(e) => setRecordModalStructuredForm((prev) => ({ ...prev, mainComplaints: e.target.value }))} className={textareaCls} />
                </div>
                <div>
                  <label htmlFor="record-modal-exams" className={labelCls}>Exames revisados</label>
                  <textarea id="record-modal-exams" rows={3} value={recordModalStructuredForm.examsReviewed} onChange={(e) => setRecordModalStructuredForm((prev) => ({ ...prev, examsReviewed: e.target.value }))} className={textareaCls} />
                </div>
                <div>
                  <label htmlFor="record-modal-guidance" className={labelCls}>Orientações</label>
                  <textarea id="record-modal-guidance" rows={3} value={recordModalStructuredForm.guidance} onChange={(e) => setRecordModalStructuredForm((prev) => ({ ...prev, guidance: e.target.value }))} className={textareaCls} />
                </div>
                <div>
                  <label htmlFor="record-modal-referrals" className={labelCls}>Encaminhamentos</label>
                  <textarea id="record-modal-referrals" rows={3} value={recordModalStructuredForm.referrals} onChange={(e) => setRecordModalStructuredForm((prev) => ({ ...prev, referrals: e.target.value }))} className={textareaCls} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label htmlFor="record-modal-pa" className={labelCls}>PA</label>
                  <input id="record-modal-pa" type="text" value={recordModalStructuredForm.bloodPressure} onChange={(e) => setRecordModalStructuredForm((prev) => ({ ...prev, bloodPressure: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="record-modal-weight" className={labelCls}>Peso</label>
                  <input id="record-modal-weight" type="text" value={recordModalStructuredForm.weight} onChange={(e) => setRecordModalStructuredForm((prev) => ({ ...prev, weight: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="record-modal-uterine-height" className={labelCls}>Altura uterina</label>
                  <input id="record-modal-uterine-height" type="text" value={recordModalStructuredForm.uterineHeight} onChange={(e) => setRecordModalStructuredForm((prev) => ({ ...prev, uterineHeight: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="record-modal-bcf" className={labelCls}>BCF</label>
                  <input id="record-modal-bcf" type="text" value={recordModalStructuredForm.fetalHeartRate} onChange={(e) => setRecordModalStructuredForm((prev) => ({ ...prev, fetalHeartRate: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="record-modal-movement" className={labelCls}>Movimentação fetal</label>
                  <select id="record-modal-movement" value={recordModalStructuredForm.fetalMovement} onChange={(e) => setRecordModalStructuredForm((prev) => ({ ...prev, fetalMovement: e.target.value }))} className={inputCls}>
                    <option value="">Não informado</option>
                    <option value="Presente">Presente</option>
                    <option value="Reduzida">Reduzida</option>
                    <option value="Ausente">Ausente</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="record-modal-edema" className={labelCls}>Edema</label>
                  <select id="record-modal-edema" value={recordModalStructuredForm.edema} onChange={(e) => setRecordModalStructuredForm((prev) => ({ ...prev, edema: e.target.value }))} className={inputCls}>
                    <option value="">Não informado</option>
                    <option value="Ausente">Ausente</option>
                    <option value="Leve">Leve</option>
                    <option value="Moderado">Moderado</option>
                    <option value="Importante">Importante</option>
                  </select>
                </div>
              </div>
              <div>
                <label htmlFor="record-modal-warning" className={labelCls}>Sinais de alerta / intercorrências</label>
                <textarea id="record-modal-warning" rows={3} value={recordModalStructuredForm.warningSigns} onChange={(e) => setRecordModalStructuredForm((prev) => ({ ...prev, warningSigns: e.target.value }))} className={textareaCls} />
              </div>
              <div>
                <label htmlFor="record-modal-actions" className={labelCls}>Condutas e ações livres</label>
                <textarea id="record-modal-actions" rows={4} value={recordModalStructuredForm.freeActions} onChange={(e) => setRecordModalStructuredForm((prev) => ({ ...prev, freeActions: e.target.value }))} className={textareaCls} />
              </div>
              <div>
                <label htmlFor="record-modal-extra" className={labelCls}>Observações adicionais</label>
                <textarea id="record-modal-extra" rows={3} value={recordModalStructuredForm.additionalObservations} onChange={(e) => setRecordModalStructuredForm((prev) => ({ ...prev, additionalObservations: e.target.value }))} className={textareaCls} />
              </div>
              <div>
                <label htmlFor="record-modal-next" className={labelCls}>Próxima consulta</label>
                <input id="record-modal-next" type="date" value={recordModalForm.nextAppointment} onChange={(e) => setRecordModalForm((prev) => ({ ...prev, nextAppointment: e.target.value }))} className={inputCls} />
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                <button type="submit" disabled={busyRecordId === selectedRecord.id} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                  {busyRecordId === selectedRecord.id ? 'Salvando...' : 'Salvar alterações'}
                </button>
                <button type="button" onClick={() => openRecordModal(selectedRecord, false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              {(() => {
                const structured = parseConsultationActions(selectedRecord.actions);
                const visibleStructuredItems = CONSULTATION_ACTION_LABELS.filter(({ key }) => structured[key]);
                return (
                  <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {formatDate(selectedRecord.date, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">{selectedRecord.doctorName}</p>
                </div>
                {selectedRecord.nextAppointment && (
                  <span className="rounded-lg bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
                    Próxima consulta: {formatDate(selectedRecord.nextAppointment, { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                )}
              </div>
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-800">Resumo do atendimento</h4>
                <p className="text-sm leading-relaxed text-slate-700">{selectedRecord.summary}</p>
              </div>
              {visibleStructuredItems.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {visibleStructuredItems.map(({ key, label }) => (
                    <div key={key} className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="mt-1 text-sm text-slate-700">{structured[key]}</p>
                    </div>
                  ))}
                </div>
              )}
              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-800">Condutas e ações livres</h4>
                {structured.freeActions ? (
                  <ul className="space-y-2">
                    {structured.freeActions.split('\n').filter(Boolean).map((action, index) => (
                      <li key={`${action}-${index}`} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">{action}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-400">Nenhuma conduta livre registrada.</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => openRecordModal(selectedRecord, true)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Editar
                </button>
                <button type="button" onClick={() => handleDeleteRecord(selectedRecord)} disabled={busyRecordId === selectedRecord.id} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60">
                  {busyRecordId === selectedRecord.id ? 'Removendo...' : 'Remover'}
                </button>
              </div>
                  </>
                );
              })()}
            </div>
          )
        )}
      </Modal>

      <Modal
        isOpen={isCreateRecordModalOpen}
        onClose={closeCreateRecordModal}
        title="Novo registro de atendimento"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateRecord} className="space-y-4">
          <div>
            <label htmlFor="pr-create-summary" className={labelCls}>Resumo do atendimento *</label>
            <textarea id="pr-create-summary" rows={6} value={createRecordForm.summary} onChange={(e) => setCreateRecordForm((prev) => ({ ...prev, summary: e.target.value }))} className={textareaCls} placeholder="Descreva o que ocorreu no atendimento..." />
          </div>
          <div className="grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-2">
            <div>
              <label htmlFor="pr-create-complaints" className={labelCls}>Queixas principais</label>
              <textarea id="pr-create-complaints" rows={3} value={createRecordStructuredForm.mainComplaints} onChange={(e) => setCreateRecordStructuredForm((prev) => ({ ...prev, mainComplaints: e.target.value }))} className={textareaCls} placeholder="cefaleia, sangramento, dor, náuseas..." />
            </div>
            <div>
              <label htmlFor="pr-create-exams" className={labelCls}>Exames revisados</label>
              <textarea id="pr-create-exams" rows={3} value={createRecordStructuredForm.examsReviewed} onChange={(e) => setCreateRecordStructuredForm((prev) => ({ ...prev, examsReviewed: e.target.value }))} className={textareaCls} placeholder="glicemia, urina, ultrassom, hemograma..." />
            </div>
            <div>
              <label htmlFor="pr-create-guidance" className={labelCls}>Orientações</label>
              <textarea id="pr-create-guidance" rows={3} value={createRecordStructuredForm.guidance} onChange={(e) => setCreateRecordStructuredForm((prev) => ({ ...prev, guidance: e.target.value }))} className={textareaCls} placeholder="orientado sobre sinais de alarme, alimentação..." />
            </div>
            <div>
              <label htmlFor="pr-create-referrals" className={labelCls}>Encaminhamentos</label>
              <textarea id="pr-create-referrals" rows={3} value={createRecordStructuredForm.referrals} onChange={(e) => setCreateRecordStructuredForm((prev) => ({ ...prev, referrals: e.target.value }))} className={textareaCls} placeholder="alto risco, psicologia, nutrição..." />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="pr-create-pa" className={labelCls}>PA</label>
              <input id="pr-create-pa" type="text" value={createRecordStructuredForm.bloodPressure} onChange={(e) => setCreateRecordStructuredForm((prev) => ({ ...prev, bloodPressure: e.target.value }))} className={inputCls} placeholder="120x80 mmHg" />
            </div>
            <div>
              <label htmlFor="pr-create-weight" className={labelCls}>Peso</label>
              <input id="pr-create-weight" type="text" value={createRecordStructuredForm.weight} onChange={(e) => setCreateRecordStructuredForm((prev) => ({ ...prev, weight: e.target.value }))} className={inputCls} placeholder="68,4 kg" />
            </div>
            <div>
              <label htmlFor="pr-create-uterine-height" className={labelCls}>Altura uterina</label>
              <input id="pr-create-uterine-height" type="text" value={createRecordStructuredForm.uterineHeight} onChange={(e) => setCreateRecordStructuredForm((prev) => ({ ...prev, uterineHeight: e.target.value }))} className={inputCls} placeholder="31 cm" />
            </div>
            <div>
              <label htmlFor="pr-create-bcf" className={labelCls}>BCF</label>
              <input id="pr-create-bcf" type="text" value={createRecordStructuredForm.fetalHeartRate} onChange={(e) => setCreateRecordStructuredForm((prev) => ({ ...prev, fetalHeartRate: e.target.value }))} className={inputCls} placeholder="144 bpm" />
            </div>
            <div>
              <label htmlFor="pr-create-movement" className={labelCls}>Movimentação fetal</label>
              <select id="pr-create-movement" value={createRecordStructuredForm.fetalMovement} onChange={(e) => setCreateRecordStructuredForm((prev) => ({ ...prev, fetalMovement: e.target.value }))} className={inputCls}>
                <option value="">Não informado</option>
                <option value="Presente">Presente</option>
                <option value="Reduzida">Reduzida</option>
                <option value="Ausente">Ausente</option>
              </select>
            </div>
            <div>
              <label htmlFor="pr-create-edema" className={labelCls}>Edema</label>
              <select id="pr-create-edema" value={createRecordStructuredForm.edema} onChange={(e) => setCreateRecordStructuredForm((prev) => ({ ...prev, edema: e.target.value }))} className={inputCls}>
                <option value="">Não informado</option>
                <option value="Ausente">Ausente</option>
                <option value="Leve">Leve</option>
                <option value="Moderado">Moderado</option>
                <option value="Importante">Importante</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="pr-create-warning" className={labelCls}>Sinais de alerta / intercorrências</label>
            <textarea id="pr-create-warning" rows={3} value={createRecordStructuredForm.warningSigns} onChange={(e) => setCreateRecordStructuredForm((prev) => ({ ...prev, warningSigns: e.target.value }))} className={textareaCls} placeholder="PA elevada, sangramento, redução de movimentos..." />
          </div>
          <div>
            <label htmlFor="pr-create-actions" className={labelCls}>Condutas e ações livres</label>
            <textarea id="pr-create-actions" rows={4} value={createRecordStructuredForm.freeActions} onChange={(e) => setCreateRecordStructuredForm((prev) => ({ ...prev, freeActions: e.target.value }))} className={textareaCls} placeholder={'Solicitado exame X\nPrescrito ajuste Y\nRetorno em Z'} />
          </div>
          <div>
            <label htmlFor="pr-create-extra" className={labelCls}>Observações adicionais</label>
            <textarea id="pr-create-extra" rows={3} value={createRecordStructuredForm.additionalObservations} onChange={(e) => setCreateRecordStructuredForm((prev) => ({ ...prev, additionalObservations: e.target.value }))} className={textareaCls} placeholder="vacinação, adesão, contexto social, saúde mental..." />
          </div>
          <div>
            <label htmlFor="pr-create-next" className={labelCls}>Próxima consulta</label>
            <input id="pr-create-next" type="date" value={createRecordForm.nextAppointment} onChange={(e) => setCreateRecordForm((prev) => ({ ...prev, nextAppointment: e.target.value }))} className={inputCls} />
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <button type="submit" disabled={saving || !createRecordForm.summary.trim()} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {saving ? 'Salvando...' : 'Salvar registro'}
            </button>
            <button type="button" onClick={closeCreateRecordModal} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function PerfilTab({ patientId, prenatalProfile, onSuccess }: { patientId: string; prenatalProfile: PrenatalProfile; onSuccess: (msg: string) => void; }) {
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileForm, setProfileForm] = useState<PrenatalProfile>(prenatalProfile ?? DEFAULT_PRENATAL_PROFILE);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => { setProfileForm(prenatalProfile ?? DEFAULT_PRENATAL_PROFILE); }, [prenatalProfile]);

  const hasProfileData = Boolean(
    profileForm.chronicConditions.length ||
    profileForm.previousPregnancyComplications.length ||
    profileForm.familyHistory.length ||
    profileForm.allergies ||
    profileForm.continuousMedications ||
    profileForm.surgeries ||
    profileForm.obstetricHistory ||
    profileForm.mentalHealthNotes ||
    profileForm.socialContext ||
    profileForm.additionalNotes
  );

  function toggleArrayField(
    field: 'chronicConditions' | 'previousPregnancyComplications' | 'familyHistory',
    value: string,
  ) {
    setProfileForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter((item) => item !== value)
        : [...prev[field], value],
    }));
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const updated = await updatePrenatalProfile(patientId, profileForm);
      setProfileForm(updated);
      setIsEditingProfile(false);
      onSuccess('Perfil clinico-obstetrico atualizado.');
    } finally {
      setProfileSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent';
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1';
  const textareaCls = `${inputCls} resize-none`;
  const summaryBlockCls = 'rounded-lg bg-slate-50 px-4 py-3';

  return (
    <section aria-label="Perfil clinico-obstetrico" className="rounded-xl border border-slate-100 bg-white p-5 shadow-card">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-slate-800">Perfil clinico-obstetrico</h3>
          <p className="text-sm text-slate-500">
            Cadastro longitudinal da gestante. Deve ser preenchido uma vez e atualizado quando houver mudança relevante.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setProfileForm(prenatalProfile ?? DEFAULT_PRENATAL_PROFILE);
            setIsEditingProfile((prev) => !prev);
          }}
          className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          {isEditingProfile ? 'Cancelar edição' : hasProfileData ? 'Editar perfil' : 'Preencher perfil'}
        </button>
      </div>

      {isEditingProfile ? (
      <form onSubmit={handleSaveProfile} className="grid gap-4">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <label htmlFor="profile-risk" className={labelCls}>Classificação de risco</label>
            <select
              id="profile-risk"
              value={profileForm.riskClassification}
              onChange={(e) => setProfileForm((prev) => ({ ...prev, riskClassification: e.target.value as PrenatalProfile['riskClassification'] }))}
              className={inputCls}
            >
              <option value="habitual">Habitual</option>
              <option value="intermediario">Intermediário</option>
              <option value="alto">Alto risco</option>
            </select>
          </div>
          <div>
            <label htmlFor="profile-allergies" className={labelCls}>Alergias</label>
            <input id="profile-allergies" type="text" value={profileForm.allergies ?? ''} onChange={(e) => setProfileForm((prev) => ({ ...prev, allergies: e.target.value }))} className={inputCls} placeholder="medicamentos, alimentos, látex..." />
          </div>
          <div>
            <label htmlFor="profile-medications" className={labelCls}>Medicações de uso contínuo</label>
            <input id="profile-medications" type="text" value={profileForm.continuousMedications ?? ''} onChange={(e) => setProfileForm((prev) => ({ ...prev, continuousMedications: e.target.value }))} className={inputCls} placeholder="anti-hipertensivos, insulina..." />
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">Condições crônicas e comorbidades</p>
            <div className="flex flex-wrap gap-2">
              {CHRONIC_CONDITION_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleArrayField('chronicConditions', option)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    profileForm.chronicConditions.includes(option)
                      ? 'bg-brand-100 text-brand-700 ring-1 ring-brand-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">Complicações obstétricas prévias</p>
            <div className="flex flex-wrap gap-2">
              {PREVIOUS_COMPLICATION_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleArrayField('previousPregnancyComplications', option)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    profileForm.previousPregnancyComplications.includes(option)
                      ? 'bg-amber-100 text-amber-800 ring-1 ring-amber-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-xs font-medium text-slate-600">Histórico familiar relevante</p>
            <div className="flex flex-wrap gap-2">
              {FAMILY_HISTORY_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => toggleArrayField('familyHistory', option)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    profileForm.familyHistory.includes(option)
                      ? 'bg-sky-100 text-sky-700 ring-1 ring-sky-200'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label htmlFor="profile-obstetric" className={labelCls}>Histórico obstétrico resumido</label>
            <textarea id="profile-obstetric" rows={4} value={profileForm.obstetricHistory ?? ''} onChange={(e) => setProfileForm((prev) => ({ ...prev, obstetricHistory: e.target.value }))} className={textareaCls} placeholder="Gesta/para, abortamentos, partos anteriores, intercorrências..." />
          </div>
          <div>
            <label htmlFor="profile-surgeries" className={labelCls}>Cirurgias e antecedentes clínicos importantes</label>
            <textarea id="profile-surgeries" rows={4} value={profileForm.surgeries ?? ''} onChange={(e) => setProfileForm((prev) => ({ ...prev, surgeries: e.target.value }))} className={textareaCls} placeholder="cesárea prévia, cirurgia uterina, internações, cardiopatia..." />
          </div>
          <div>
            <label htmlFor="profile-mental" className={labelCls}>Saúde mental e vulnerabilidades</label>
            <textarea id="profile-mental" rows={3} value={profileForm.mentalHealthNotes ?? ''} onChange={(e) => setProfileForm((prev) => ({ ...prev, mentalHealthNotes: e.target.value }))} className={textareaCls} placeholder="ansiedade, depressão, necessidade de apoio, adesão..." />
          </div>
          <div>
            <label htmlFor="profile-social" className={labelCls}>Contexto social e apoio</label>
            <textarea id="profile-social" rows={3} value={profileForm.socialContext ?? ''} onChange={(e) => setProfileForm((prev) => ({ ...prev, socialContext: e.target.value }))} className={textareaCls} placeholder="rede de apoio, condições de moradia, violência, transporte..." />
          </div>
        </div>

        <div>
          <label htmlFor="profile-notes" className={labelCls}>Observações gerais para seguimento</label>
          <textarea id="profile-notes" rows={4} value={profileForm.additionalNotes ?? ''} onChange={(e) => setProfileForm((prev) => ({ ...prev, additionalNotes: e.target.value }))} className={textareaCls} placeholder="anotações livres do acompanhamento, plano, cuidados especiais..." />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={profileSaving}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
          >
            {profileSaving ? <Spinner size="sm" /> : null}
            {profileSaving ? 'Salvando...' : 'Salvar perfil'}
          </button>
          <p className="text-xs text-slate-400">
            Campos úteis para estratificação de risco e continuidade do pré-natal.
          </p>
        </div>
      </form>
      ) : hasProfileData ? (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className={summaryBlockCls}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Classificação de risco</p>
              <p className="mt-1 text-sm text-slate-700">{profileForm.riskClassification}</p>
            </div>
            <div className={summaryBlockCls}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Alergias</p>
              <p className="mt-1 text-sm text-slate-700">{profileForm.allergies || 'Não informado'}</p>
            </div>
            <div className={summaryBlockCls}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Medicações de uso contínuo</p>
              <p className="mt-1 text-sm text-slate-700">{profileForm.continuousMedications || 'Não informado'}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <div className={summaryBlockCls}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Condições crônicas</p>
              <p className="mt-1 text-sm text-slate-700">{profileForm.chronicConditions.length ? profileForm.chronicConditions.join(', ') : 'Nenhuma informada'}</p>
            </div>
            <div className={summaryBlockCls}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Complicações obstétricas prévias</p>
              <p className="mt-1 text-sm text-slate-700">{profileForm.previousPregnancyComplications.length ? profileForm.previousPregnancyComplications.join(', ') : 'Nenhuma informada'}</p>
            </div>
            <div className={summaryBlockCls}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Histórico familiar</p>
              <p className="mt-1 text-sm text-slate-700">{profileForm.familyHistory.length ? profileForm.familyHistory.join(', ') : 'Nenhum informado'}</p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className={summaryBlockCls}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Histórico obstétrico</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{profileForm.obstetricHistory || 'Não informado'}</p>
            </div>
            <div className={summaryBlockCls}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Cirurgias e antecedentes clínicos</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{profileForm.surgeries || 'Não informado'}</p>
            </div>
            <div className={summaryBlockCls}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Saúde mental e vulnerabilidades</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{profileForm.mentalHealthNotes || 'Não informado'}</p>
            </div>
            <div className={summaryBlockCls}>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Contexto social e apoio</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">{profileForm.socialContext || 'Não informado'}</p>
            </div>
          </div>

          <div className={summaryBlockCls}>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Observações gerais</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{profileForm.additionalNotes || 'Não informado'}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-slate-700">Perfil ainda não preenchido.</p>
          <p className="mt-2 text-sm text-slate-500">Preencha uma vez a ficha clínica-obstétrica da gestante e depois utilize apenas o modo de visualização ou edição.</p>
        </div>
      )}
    </section>
  );
}

// Aba: Medicamentos
interface MedicamentosTabProps {
  patientId: string;
  medications: Medication[];
  onSuccess: (msg: string) => void;
}
function MedicamentosTab({ patientId, medications, onSuccess }: MedicamentosTabProps) {
  const { user } = useAuth();
  const [saving, setSaving] = useState(false);
  const [busyMedicationId, setBusyMedicationId] = useState<string | null>(null);
  const [localMeds, setLocalMeds] = useState(medications);
  const [selectedMedication, setSelectedMedication] = useState<Medication | null>(null);
  const [isCreateMedicationModalOpen, setIsCreateMedicationModalOpen] = useState(false);
  const [isMedicationModalEditing, setIsMedicationModalEditing] = useState(false);
  const [createMedicationForm, setCreateMedicationForm] = useState({
    name: '', dose: '', frequency: '', duration: '', notes: '',
  });
  const [medicationModalForm, setMedicationModalForm] = useState({
    name: '', dose: '', frequency: '', duration: '', notes: '',
  });

  useEffect(() => { setLocalMeds(medications); }, [medications]);

  function closeCreateMedicationModal() {
    setIsCreateMedicationModalOpen(false);
    setCreateMedicationForm({ name: '', dose: '', frequency: '', duration: '', notes: '' });
  }

  function closeMedicationModal() {
    setSelectedMedication(null);
    setIsMedicationModalEditing(false);
    setMedicationModalForm({ name: '', dose: '', frequency: '', duration: '', notes: '' });
  }

  async function handleCreateMedication(e: React.FormEvent) {
    e.preventDefault();
    if (!createMedicationForm.name.trim()) return;
    setSaving(true);
    try {
      const med = await addMedication({
        patientId,
        name: createMedicationForm.name,
        dose: createMedicationForm.dose,
        frequency: createMedicationForm.frequency,
        duration: createMedicationForm.duration,
        notes: createMedicationForm.notes || undefined,
        startDate: new Date().toISOString().split('T')[0],
        isActive: true,
        prescribedBy: user?.nomeCompleto ?? 'Dr. Médico',
      });
      setLocalMeds(prev => [med, ...prev]);
      closeCreateMedicationModal();
      onSuccess('Medicamento cadastrado. O paciente será notificado. (Simulação)');
    } finally {
      setSaving(false);
    }
  }

  function openMedicationModal(med: Medication, editMode = false) {
    setSelectedMedication(med);
    setIsMedicationModalEditing(editMode);
    setMedicationModalForm({
      name: med.name,
      dose: med.dose,
      frequency: med.frequency,
      duration: med.duration,
      notes: med.notes ?? '',
    });
  }

  async function handleSaveMedicationEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMedication || !medicationModalForm.name.trim()) return;
    setBusyMedicationId(selectedMedication.id);
    try {
      const updated = await updateMedication(selectedMedication.id, {
        name: medicationModalForm.name,
        dose: medicationModalForm.dose,
        frequency: medicationModalForm.frequency,
        duration: medicationModalForm.duration,
        notes: medicationModalForm.notes || undefined,
        startDate: selectedMedication.startDate,
        endDate: selectedMedication.endDate,
        isActive: selectedMedication.isActive,
      });

      const merged = { ...selectedMedication, ...updated, prescribedBy: selectedMedication.prescribedBy };
      setLocalMeds((prev) => prev.map((med) => (med.id === selectedMedication.id ? merged : med)));
      setSelectedMedication(merged);
      setIsMedicationModalEditing(false);
      onSuccess('Medicamento atualizado com sucesso.');
    } finally {
      setBusyMedicationId(null);
    }
  }

  async function handleToggleMedication(med: Medication) {
    const actionLabel = med.isActive ? 'desativar' : 'reativar';
    if (!window.confirm(`Deseja ${actionLabel} este medicamento?`)) return;

    setBusyMedicationId(med.id);
    try {
      const updated = await updateMedication(med.id, {
        isActive: !med.isActive,
        endDate: med.isActive ? new Date().toISOString().split('T')[0] : undefined,
        startDate: med.startDate,
        name: med.name,
        dose: med.dose,
        frequency: med.frequency,
        duration: med.duration,
        notes: med.notes,
      });

      setLocalMeds(prev => prev.map((item) => (
        item.id === med.id
          ? {
              ...item,
              ...updated,
              prescribedBy: item.prescribedBy,
              endDate: med.isActive ? new Date().toISOString().split('T')[0] : undefined,
            }
          : item
      )));
      if (selectedMedication?.id === med.id) {
        setSelectedMedication((prev) => prev ? {
          ...prev,
          ...updated,
          prescribedBy: prev.prescribedBy,
          endDate: med.isActive ? new Date().toISOString().split('T')[0] : undefined,
        } : prev);
      }
      onSuccess(med.isActive ? 'Medicamento desativado.' : 'Medicamento reativado.');
    } finally {
      setBusyMedicationId(null);
    }
  }

  async function handleDeleteMedication(med: Medication) {
    if (!window.confirm(`Deseja remover "${med.name}"? Esta ação não poderá ser desfeita.`)) return;

    setBusyMedicationId(med.id);
    try {
      await deleteMedication(med.id);
      setLocalMeds(prev => prev.filter((item) => item.id !== med.id));
      if (selectedMedication?.id === med.id) closeMedicationModal();
      onSuccess('Medicamento removido.');
    } finally {
      setBusyMedicationId(null);
    }
  }

  const inputCls = 'w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent';
  const labelCls = 'block text-xs font-medium text-slate-600 mb-1';

  const active   = localMeds.filter(m => m.isActive);
  const inactive = localMeds.filter(m => !m.isActive);

  return (
    <div>
      <section aria-label="Medicamentos do paciente" className="min-w-0">
        <div className="grid gap-6 2xl:grid-cols-2">
          <div>
            <div className="mb-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-700">Em uso ({active.length})</h3>
                  <p className="text-sm text-slate-500">Prescrições ativas acompanhadas neste momento.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateMedicationModalOpen(true)}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                >
                  Novo medicamento
                </button>
              </div>
            </div>
            {active.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400 shadow-card">
                Nenhum medicamento ativo.
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {active.map(m => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => openMedicationModal(m)}
                      className="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-left shadow-card transition-shadow hover:shadow-card-md"
                    >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{m.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">{m.dose} · {m.frequency} · {m.duration}</p>
                      {m.notes && <p className="mt-1 text-xs text-brand-700">{m.notes}</p>}
                      <p className="mt-1 text-xs text-slate-400">Prescrito por {m.prescribedBy}</p>
                    </div>
                    <Badge variant="success">Ativo</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-500">Histórico - suspensos ({inactive.length})</h3>
              <p className="text-sm text-slate-500">Medicamentos encerrados ou já concluídos.</p>
            </div>
            {inactive.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-400 shadow-card">
                Nenhum medicamento no histórico.
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {inactive.map(m => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => openMedicationModal(m)}
                      className="flex w-full items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-left transition-shadow hover:shadow-card"
                    >
                    <div>
                      <p className="text-sm font-medium text-slate-500">{m.name}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{m.dose} · {m.frequency} · {m.duration}</p>
                      {m.notes && <p className="mt-1 text-xs text-slate-500">{m.notes}</p>}
                    </div>
                    <Badge variant="neutral">Suspenso</Badge>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <Modal
        isOpen={isCreateMedicationModalOpen}
        onClose={closeCreateMedicationModal}
        title="Novo medicamento"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateMedication} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="med-create-name" className={labelCls}>Nome do medicamento *</label>
              <input id="med-create-name" type="text" value={createMedicationForm.name} onChange={(e) => setCreateMedicationForm((prev) => ({ ...prev, name: e.target.value }))} className={inputCls} placeholder="ex: Metildopa" />
            </div>
            <div>
              <label htmlFor="med-create-dose" className={labelCls}>Dosagem *</label>
              <input id="med-create-dose" type="text" value={createMedicationForm.dose} onChange={(e) => setCreateMedicationForm((prev) => ({ ...prev, dose: e.target.value }))} className={inputCls} placeholder="ex: 250mg" />
            </div>
            <div>
              <label htmlFor="med-create-frequency" className={labelCls}>Frequência *</label>
              <input id="med-create-frequency" type="text" value={createMedicationForm.frequency} onChange={(e) => setCreateMedicationForm((prev) => ({ ...prev, frequency: e.target.value }))} className={inputCls} placeholder="ex: 3x ao dia" />
            </div>
            <div>
              <label htmlFor="med-create-duration" className={labelCls}>Duração *</label>
              <input id="med-create-duration" type="text" value={createMedicationForm.duration} onChange={(e) => setCreateMedicationForm((prev) => ({ ...prev, duration: e.target.value }))} className={inputCls} placeholder="ex: 30 dias" />
            </div>
            <div>
              <label htmlFor="med-create-notes" className={labelCls}>Observações</label>
              <input id="med-create-notes" type="text" value={createMedicationForm.notes} onChange={(e) => setCreateMedicationForm((prev) => ({ ...prev, notes: e.target.value }))} className={inputCls} placeholder="instruções especiais..." />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
            <button type="submit" disabled={saving || !createMedicationForm.name.trim()} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {saving ? 'Salvando...' : 'Prescrever'}
            </button>
            <button type="button" onClick={closeCreateMedicationModal} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
              Cancelar
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(selectedMedication)}
        onClose={closeMedicationModal}
        title={isMedicationModalEditing ? 'Editar medicamento' : 'Detalhes do medicamento'}
        maxWidth="max-w-3xl"
      >
        {selectedMedication && (
          isMedicationModalEditing ? (
            <form onSubmit={handleSaveMedicationEdit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor="med-modal-name" className={labelCls}>Nome do medicamento *</label>
                  <input id="med-modal-name" type="text" value={medicationModalForm.name} onChange={(e) => setMedicationModalForm((prev) => ({ ...prev, name: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="med-modal-dose" className={labelCls}>Dosagem</label>
                  <input id="med-modal-dose" type="text" value={medicationModalForm.dose} onChange={(e) => setMedicationModalForm((prev) => ({ ...prev, dose: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="med-modal-frequency" className={labelCls}>Frequência</label>
                  <input id="med-modal-frequency" type="text" value={medicationModalForm.frequency} onChange={(e) => setMedicationModalForm((prev) => ({ ...prev, frequency: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="med-modal-duration" className={labelCls}>Duração</label>
                  <input id="med-modal-duration" type="text" value={medicationModalForm.duration} onChange={(e) => setMedicationModalForm((prev) => ({ ...prev, duration: e.target.value }))} className={inputCls} />
                </div>
                <div>
                  <label htmlFor="med-modal-notes" className={labelCls}>Observações</label>
                  <input id="med-modal-notes" type="text" value={medicationModalForm.notes} onChange={(e) => setMedicationModalForm((prev) => ({ ...prev, notes: e.target.value }))} className={inputCls} />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                <button type="submit" disabled={busyMedicationId === selectedMedication.id} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                  {busyMedicationId === selectedMedication.id ? 'Salvando...' : 'Salvar alterações'}
                </button>
                <button type="button" onClick={() => openMedicationModal(selectedMedication, false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-lg font-semibold text-slate-900">{selectedMedication.name}</h4>
                  <p className="mt-1 text-sm text-slate-500">{selectedMedication.dose} · {selectedMedication.frequency} · {selectedMedication.duration}</p>
                </div>
                <Badge variant={selectedMedication.isActive ? 'success' : 'neutral'}>
                  {selectedMedication.isActive ? 'Ativo' : 'Suspenso'}
                </Badge>
              </div>
              {selectedMedication.notes && (
                <div>
                  <h5 className="mb-2 text-sm font-semibold text-slate-800">Observações</h5>
                  <p className="text-sm text-slate-700">{selectedMedication.notes}</p>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Início</p>
                  <p className="text-sm text-slate-700">{formatDate(selectedMedication.startDate, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Prescrito por</p>
                  <p className="text-sm text-slate-700">{selectedMedication.prescribedBy}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => openMedicationModal(selectedMedication, true)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Editar
                </button>
                <button type="button" onClick={() => handleToggleMedication(selectedMedication)} disabled={busyMedicationId === selectedMedication.id} className={`rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60 ${selectedMedication.isActive ? 'border border-amber-200 text-amber-700 hover:bg-amber-50' : 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'}`}>
                  {busyMedicationId === selectedMedication.id ? 'Processando...' : selectedMedication.isActive ? 'Desativar' : 'Reativar'}
                </button>
                <button type="button" onClick={() => handleDeleteMedication(selectedMedication)} disabled={busyMedicationId === selectedMedication.id} className="rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60">
                  {busyMedicationId === selectedMedication.id ? 'Removendo...' : 'Remover'}
                </button>
              </div>
            </div>
          )
        )}
      </Modal>
    </div>
  );
}

function ExamesTab({ patientId }: { patientId: string }) {
  const [exams, setExams] = useState<MedicalExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchPatientExams(patientId)
      .then(setExams)
      .catch(() => setError('Nao foi possivel carregar os exames anexados pela paciente.'))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return <PageSpinner label="Carregando exames..." />;
  }

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <section aria-label="Exames em PDF enviados pela paciente" className="space-y-4">
      <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        PDFs enviados pela paciente para revisao clinica. Abra os arquivos conforme necessidade para avaliar exames anexados ao acompanhamento.
      </div>

      {exams.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-400 shadow-card">
          Nenhum exame em PDF foi anexado pela paciente ate o momento.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {exams.map((exam) => (
            <Card key={exam.id} className="rounded-2xl">
              <CardBody className="pt-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-semibold text-slate-900">{exam.title}</h3>
                      {exam.examType && <Badge variant="info">{exam.examType}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {exam.examDate ? `Data do exame: ${formatDate(exam.examDate)}` : 'Data do exame nao informada'}
                    </p>
                  </div>
                  <Badge variant="neutral">{formatExamSize(exam.fileSizeBytes)}</Badge>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Arquivo</p>
                    <p className="mt-2 text-sm font-medium text-slate-800">{exam.fileName}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Enviado em</p>
                    <p className="mt-2 text-sm font-medium text-slate-800">{formatDate(exam.uploadedAt)}</p>
                  </div>
                </div>

                {exam.notes && (
                  <div className="mt-4 rounded-2xl border border-slate-100 bg-white p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observacoes da paciente</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{exam.notes}</p>
                  </div>
                )}

                <div className="mt-4 flex justify-end">
                  <a
                    href={getExamDownloadUrl(exam.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
                  >
                    Abrir PDF
                  </a>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

// Página principal
export function PatientDetails() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const [patient,   setPatient]   = useState<Patient | null>(null);
  const [reports,   setReports]   = useState<DailyReport[]>([]);
  const [meds,      setMeds]      = useState<Medication[]>([]);
  const [records,   setRecords]   = useState<MedicalRecord[]>([]);
  const [prenatalProfile, setPrenatalProfile] = useState<PrenatalProfile>(DEFAULT_PRENATAL_PROFILE);
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
    setSummaryLoading(true);
    fetchPatientDetailsBundle(id)
      .then((data) => {
        setPatient(data.patient);
        setReports(data.reports);
        setMeds(data.medications);
        setRecords(data.medicalRecords);
        setPrenatalProfile(data.prenatalProfile ?? DEFAULT_PRENATAL_PROFILE);
        setTimeline(data.timeline);
        setSummary(data.summary);
      })
      .catch(() => setError('Erro ao carregar dados do paciente.'))
      .finally(() => {
        setLoading(false);
        setSummaryLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <DoctorLayout>
        <PageSpinner label="Carregando dados do paciente..." />
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
      <div className="mx-auto w-full max-w-[1600px] px-4 pb-8 sm:px-6 lg:px-8">
        <Tabs value={activeTab} onValueChange={setTab}>
          <TabsList aria-label="Seções do paciente" className="mb-0">
            <TabsTrigger value="analise">Análise</TabsTrigger>
            <TabsTrigger value="relatos">Relatos</TabsTrigger>
            <TabsTrigger value="resumos-ia">Resumos IA</TabsTrigger>
            <TabsTrigger value="prontuario">Prontuário</TabsTrigger>
            <TabsTrigger value="medicamentos">Medicamentos</TabsTrigger>
            <TabsTrigger value="exames">Exames</TabsTrigger>
            <TabsTrigger value="perfil">Perfil</TabsTrigger>
          </TabsList>

          <TabsContent value="analise">
            <AnalysisTab
              summary={summary}
              timeline={timeline}
              reports={reports}
              summaryLoading={summaryLoading}
            />
          </TabsContent>

          <TabsContent value="relatos">
            <ReportsTab reports={reports} onSuccess={setToast} onReportsChange={setReports} />
          </TabsContent>

          <TabsContent value="resumos-ia">
            <DoctorAISummariesTab patientId={patient.id} onSuccess={setToast} />
          </TabsContent>

          <TabsContent value="perfil">
            <PerfilTab
              patientId={patient.id}
              prenatalProfile={prenatalProfile}
              onSuccess={setToast}
            />
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

          <TabsContent value="exames">
            <ExamesTab patientId={patient.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast} onDismiss={() => setToast(null)} />}
    </DoctorLayout>
  );
}
