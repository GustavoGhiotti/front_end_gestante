import { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { getResumos } from '../services/apiMock';
import { ResumoIA } from '../types/domain';

export function Resumos() {
  const { user } = useAuth();
  const [resumos, setResumos] = useState<ResumoIA[]>([]);

  useEffect(() => {
    async function loadResumos() {
      if (!user) return;
      const data = await getResumos(user.id);
      setResumos(data);
    }
    loadResumos();
  }, [user]);

  const getSemaforoIcon = (status: string) => {
    switch (status) {
      case 'verde':
        return '🟢';
      case 'amarelo':
        return '🟡';
      case 'vermelho':
        return '🔴';
      default:
        return '⚪';
    }
  };

  const getSemaforoColor = (status: string) => {
    switch (status) {
      case 'verde':
        return 'bg-green-100 border-green-300';
      case 'amarelo':
        return 'bg-yellow-100 border-yellow-300';
      case 'vermelho':
        return 'bg-red-100 border-red-300';
      default:
        return 'bg-gray-100 border-gray-300';
    }
  };

  const getSemaforoTextColor = (status: string) => {
    switch (status) {
      case 'verde':
        return 'text-green-800';
      case 'amarelo':
        return 'text-yellow-800';
      case 'vermelho':
        return 'text-red-800';
      default:
        return 'text-gray-800';
    }
  };

  return (
    <MainLayout>
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-slate-800">Análises da IA</h2>
        <p className="text-sm text-slate-600">Resumos inteligentes dos seus relatos diários</p>
      </div>

      <div className="grid gap-6">
        {resumos.length === 0 ? (
          <div className="p-8 text-center bg-white rounded shadow">
            <p className="text-slate-500">Nenhuma análise disponível ainda.</p>
            <p className="mt-2 text-sm text-slate-400">
              Crie relatos diários para receber análises da IA.
            </p>
          </div>
        ) : (
          resumos.map((resumo) => (
            <div
              key={resumo.id}
              className={`p-6 rounded shadow border-l-4 ${getSemaforoColor(resumo.semaforo)}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="mb-1 text-lg font-semibold text-slate-800">
                    {resumo.tipo === 'diario' ? 'Análise Diária' : 'Análise Semanal'}
                  </h3>
                </div>
                <div className="text-center">
                  <span className="text-4xl">{getSemaforoIcon(resumo.semaforo)}</span>
                  <p className={`text-xs font-semibold mt-1 ${getSemaforoTextColor(resumo.semaforo)}`}>
                    {resumo.semaforo.toUpperCase()}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <h4 className="mb-2 text-sm font-semibold text-slate-700">Resumo</h4>
                <p className="leading-relaxed text-slate-700">{resumo.resumo}</p>
              </div>

              {resumo.sintomasIdentificados.length > 0 && (
                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">
                    Sintomas Identificados
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {resumo.sintomasIdentificados.map((sintoma) => (
                      <span
                        key={sintoma}
                        className="px-3 py-1 text-xs text-blue-800 bg-blue-100 rounded"
                      >
                        {sintoma}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {resumo.avisos.length > 0 && (
                <div className="mb-4">
                  <h4 className="mb-2 text-sm font-semibold text-slate-700">⚠️ Avisos</h4>
                  <ul className="space-y-1">
                    {resumo.avisos.map((aviso, idx) => (
                      <li key={idx} className="text-sm text-slate-700">
                        • {aviso}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <h4 className="mb-2 text-sm font-semibold text-slate-700">
                   Recomendações
                </h4>
                <p className="text-sm leading-relaxed text-slate-700">
                  {resumo.recomendacoes}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </MainLayout>
  );
}