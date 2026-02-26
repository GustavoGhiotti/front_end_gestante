import { useNavigate } from 'react-router-dom';
import { type Patient } from '../../types/doctor';
import { AlertBadge } from './AlertBadge';
import { formatDate } from '../../lib/utils';

interface PatientHeaderProps {
  patient: Patient;
}

export function PatientHeader({ patient }: PatientHeaderProps) {
  const navigate = useNavigate();

  const ig = patient.gestationalWeeks != null
    ? `${patient.gestationalWeeks}s${patient.gestationalDays != null ? ` ${patient.gestationalDays}d` : ''}`
    : '—';

  return (
    <div className="bg-white border-b border-slate-100 px-6 py-5">
      {/* Breadcrumb / voltar */}
      <button
        type="button"
        onClick={() => navigate('/doctor')}
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 mb-4 transition-colors"
        aria-label="Voltar para lista de pacientes"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Pacientes
      </button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Info principal */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div
            className="w-12 h-12 rounded-full bg-brand-100 text-brand-700 font-semibold text-lg flex items-center justify-center flex-shrink-0"
            aria-hidden="true"
          >
            {patient.name.charAt(0)}
          </div>

          <div>
            <h1 className="text-xl font-semibold text-slate-900 leading-tight">{patient.name}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
              <span>{patient.age} anos</span>
              {ig !== '—' && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>IG: {ig}</span>
                </>
              )}
              {patient.dueDate && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>DPP: {formatDate(patient.dueDate, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </>
              )}
              {patient.bloodType && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Tipo sang.: {patient.bloodType}</span>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-400">
              <span>CPF: {patient.cpf}</span>
              {patient.phone && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{patient.phone}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Badge de alerta */}
        <div className="sm:flex-shrink-0">
          <AlertBadge level={patient.alertLevel} />
        </div>
      </div>

      {/* Flags */}
      {patient.alertFlags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2" role="list" aria-label="Flags de atenção">
          {patient.alertFlags.map((flag, i) => (
            <div
              key={i}
              role="listitem"
              className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 text-xs font-medium px-2.5 py-1 rounded-full ring-1 ring-amber-200"
            >
              <svg className="w-3 h-3 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              {flag}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
