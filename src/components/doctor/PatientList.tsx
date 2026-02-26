import { useNavigate } from 'react-router-dom';
import { type Patient } from '../../types/doctor';
import { AlertBadge } from './AlertBadge';
import { relativeDate } from '../../lib/utils';

interface PatientListProps {
  patients: Patient[];
}

const MOOD_EMOJI: Record<string, string> = {
  feliz: '😊', normal: '😐', triste: '😔', ansioso: '😰',
};

export function PatientList({ patients }: PatientListProps) {
  const navigate = useNavigate();

  function open(id: string)         { navigate(`/doctor/patients/${id}`); }
  function openTab(id: string, tab: string) { navigate(`/doctor/patients/${id}?tab=${tab}`); }

  if (patients.length === 0) {
    return (
      <div className="py-16 flex flex-col items-center gap-2 text-slate-400" role="status">
        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p className="text-sm">Nenhum paciente encontrado</p>
      </div>
    );
  }

  return (
    <>
      {/* ─── Tabela (desktop/tablet) ─────────────────────────────────────────── */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100 shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Paciente
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                IG
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Último relato
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                PA (mmHg)
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                FC / O₂
              </th>
              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Status
              </th>
              <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {patients.map(p => {
              const ig = p.gestationalWeeks != null
                ? `${p.gestationalWeeks}s${p.gestationalDays != null ? ` ${p.gestationalDays}d` : ''}`
                : '—';
              const pa = p.lastVitals
                ? `${p.lastVitals.bloodPressureSystolic}/${p.lastVitals.bloodPressureDiastolic}`
                : '—';
              const fc = p.lastVitals?.heartRate ?? '—';
              const o2 = p.lastVitals?.oxygenSaturation ?? '—';

              return (
                <tr
                  key={p.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  {/* Nome */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-semibold text-sm flex items-center justify-center flex-shrink-0"
                        aria-hidden="true"
                      >
                        {p.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.age} anos · {p.cpf}</p>
                      </div>
                    </div>
                  </td>

                  {/* IG */}
                  <td className="px-4 py-3 tabular-nums text-slate-700">{ig}</td>

                  {/* Último relato */}
                  <td className="px-4 py-3 text-slate-600">
                    {p.lastReportDate ? relativeDate(p.lastReportDate) : '—'}
                  </td>

                  {/* PA */}
                  <td className={`px-4 py-3 tabular-nums font-medium ${p.alertLevel === 'high' ? 'text-red-700' : p.alertLevel === 'medium' ? 'text-amber-700' : 'text-slate-700'}`}>
                    {pa}
                  </td>

                  {/* FC / O2 */}
                  <td className="px-4 py-3 text-slate-600 tabular-nums">
                    {fc} bpm · {o2}%
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <AlertBadge level={p.alertLevel} />
                  </td>

                  {/* Ações */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => open(p.id)}
                        className="px-3 py-1.5 text-xs font-medium text-brand-700 bg-brand-50 rounded-lg hover:bg-brand-100 transition-colors"
                        aria-label={`Abrir detalhes de ${p.name}`}
                      >
                        Abrir
                      </button>
                      <button
                        type="button"
                        onClick={() => openTab(p.id, 'prontuario')}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        aria-label={`Ver prontuário de ${p.name}`}
                      >
                        Prontuário
                      </button>
                      <button
                        type="button"
                        onClick={() => openTab(p.id, 'medicamentos')}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                        aria-label={`Adicionar medicamento para ${p.name}`}
                      >
                        + Med.
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ─── Cards (mobile) ─────────────────────────────────────────────────── */}
      <ul className="md:hidden flex flex-col gap-3" role="list">
        {patients.map(p => {
          const ig = p.gestationalWeeks != null
            ? `${p.gestationalWeeks}s${p.gestationalDays != null ? ` ${p.gestationalDays}d` : ''}`
            : '—';
          const pa = p.lastVitals
            ? `${p.lastVitals.bloodPressureSystolic}/${p.lastVitals.bloodPressureDiastolic}`
            : '—';

          return (
            <li key={p.id} role="listitem" className="bg-white rounded-xl border border-slate-100 shadow-card p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-semibold flex items-center justify-center flex-shrink-0"
                    aria-hidden="true"
                  >
                    {p.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-400">{p.age} anos · IG {ig}</p>
                  </div>
                </div>
                <AlertBadge level={p.alertLevel} />
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs text-center mb-3">
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-slate-400 mb-0.5">PA</p>
                  <p className="font-semibold text-slate-700">{pa}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-slate-400 mb-0.5">FC</p>
                  <p className="font-semibold text-slate-700">{p.lastVitals?.heartRate ?? '—'} bpm</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-2">
                  <p className="text-slate-400 mb-0.5">Último</p>
                  <p className="font-semibold text-slate-700">
                    {p.lastReportDate ? relativeDate(p.lastReportDate) : '—'}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => open(p.id)}
                  className="flex-1 py-2 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 transition-colors"
                  aria-label={`Abrir detalhes de ${p.name}`}
                >
                  Abrir prontuário
                </button>
                <button
                  type="button"
                  onClick={() => openTab(p.id, 'medicamentos')}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  aria-label={`Adicionar medicamento para ${p.name}`}
                >
                  + Med.
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
