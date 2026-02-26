import { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { fetchAvailablePatients } from '../../mocks/doctorData';

interface AvailablePatient {
  id: string;
  name: string;
  cpf: string;
  age: number;
}

interface AssociatePatientModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AssociatePatientModal({ isOpen, onClose }: AssociatePatientModalProps) {
  const [query, setQuery]             = useState('');
  const [patients, setPatients]       = useState<AvailablePatient[]>([]);
  const [loading, setLoading]         = useState(false);
  const [associated, setAssociated]   = useState<string | null>(null);
  const [confirming, setConfirming]   = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetchAvailablePatients()
      .then(data => setPatients(data as AvailablePatient[]))
      .finally(() => setLoading(false));
    return () => {
      setQuery('');
      setAssociated(null);
      setConfirming(null);
    };
  }, [isOpen]);

  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.cpf.includes(query),
  );

  async function handleAssociate(id: string) {
    setConfirming(id);
    await new Promise(r => setTimeout(r, 700)); // simula request
    setAssociated(id);
    setConfirming(null);
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Associar novo paciente" maxWidth="max-w-md">
      {/* Busca */}
      <div className="mb-4">
        <label htmlFor="patient-search" className="block text-sm font-medium text-slate-700 mb-1">
          Buscar por nome ou CPF
        </label>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            id="patient-search"
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Ex.: Maria ou 123.456..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent"
          />
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner label="Carregando pacientes disponíveis…" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-sm text-slate-400 py-6">Nenhum resultado para "{query}"</p>
      ) : (
        <ul className="flex flex-col gap-2" role="list">
          {filtered.map(p => {
            const isAssociated = associated === p.id;
            const isConfirming = confirming === p.id;

            return (
              <li
                key={p.id}
                role="listitem"
                className="flex items-center justify-between gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{p.name}</p>
                  <p className="text-xs text-slate-400">{p.cpf} · {p.age} anos</p>
                </div>

                {isAssociated ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full ring-1 ring-emerald-200">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                    </svg>
                    Associada
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAssociate(p.id)}
                    disabled={isConfirming}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-60 transition-colors"
                    aria-label={`Associar paciente ${p.name}`}
                  >
                    {isConfirming ? <Spinner size="sm" /> : null}
                    {isConfirming ? 'Associando…' : 'Associar'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {/* Rodapé */}
      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
        >
          Fechar
        </button>
      </div>
    </Modal>
  );
}
