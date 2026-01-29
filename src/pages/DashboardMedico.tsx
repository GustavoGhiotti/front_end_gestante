import { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useNavigate } from 'react-router-dom';
import { getAllGestantes, getRelatosGestante } from '../services/apiMock';
import { User } from '../types/domain';

interface GestanteComRelatos extends User {
  totalRelatos: number;
  ultimoRelato?: string;
  statusRisco: 'verde' | 'amarelo' | 'vermelho';
}

export function DashboardMedico() {
  const [gestantes, setGestantes] = useState<GestanteComRelatos[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      const todasGestantes = await getAllGestantes();
      const gestantesComRelatos = await Promise.all(
        todasGestantes.map(async (gestante) => {
          const relatos = await getRelatosGestante(gestante.id);
          
          // Simular status de risco baseado em sintomas
          let statusRisco: 'verde' | 'amarelo' | 'vermelho' = 'verde';
          if (relatos.length > 0) {
            const ultimoRelato = relatos[0];
            const sintomasGraves = ['contrações', 'sangramento', 'pressão alta'];
            const temSintomaGrave = ultimoRelato.sintomas.some(s => 
              sintomasGraves.includes(s.toLowerCase())
            );
            
            if (temSintomaGrave) {
              statusRisco = 'vermelho';
            } else if (ultimoRelato.sintomas.length > 3) {
              statusRisco = 'amarelo';
            }
          }

          return {
            ...gestante,
            totalRelatos: relatos.length,
            ultimoRelato: relatos[0]?.data || 'Sem relatos',
            statusRisco,
          };
        })
      );

      setGestantes(gestantesComRelatos);
      setLoading(false);
    }

    loadData();
  }, []);

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
        return 'bg-green-50 border-green-300';
      case 'amarelo':
        return 'bg-yellow-50 border-yellow-300';
      case 'vermelho':
        return 'bg-red-50 border-red-300';
      default:
        return 'bg-gray-50 border-gray-300';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="py-12 text-center">
          <p className="text-slate-600">Carregando dados...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-8">
        <h2 className="mb-2 text-3xl font-bold text-slate-800">
          Dashboard Médico
        </h2>
        <p className="text-slate-600">
          Acompanhe suas pacientes gestantes
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-3">
        <div className="p-6 bg-white border-l-4 border-blue-600 rounded-lg shadow">
          <h3 className="text-sm font-semibold uppercase text-slate-600">
            Total de Pacientes
          </h3>
          <p className="mt-2 text-3xl font-bold text-slate-800">{gestantes.length}</p>
        </div>

        <div className="p-6 bg-white border-l-4 border-green-600 rounded-lg shadow">
          <h3 className="text-sm font-semibold uppercase text-slate-600">
            Status Normal
          </h3>
          <p className="mt-2 text-3xl font-bold text-slate-800">
            {gestantes.filter((g) => g.statusRisco === 'verde').length}
          </p>
        </div>

        <div className="p-6 bg-white border-l-4 border-red-600 rounded-lg shadow">
          <h3 className="text-sm font-semibold uppercase text-slate-600">
            Necessitam Atenção
          </h3>
          <p className="mt-2 text-3xl font-bold text-slate-800">
            {gestantes.filter((g) => g.statusRisco !== 'verde').length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="text-lg font-semibold text-slate-800">
             Minhas Pacientes
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-slate-50 border-slate-200">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-left uppercase text-slate-700">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-left uppercase text-slate-700">
                  Paciente
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-left uppercase text-slate-700">
                  Semanas
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-left uppercase text-slate-700">
                  Relatos
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-left uppercase text-slate-700">
                  Último Relato
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-left uppercase text-slate-700">
                  Ação
                </th>
              </tr>
            </thead>
            <tbody>
              {gestantes.map((gestante) => (
                <tr key={gestante.id} className={`border-b border-slate-200 hover:bg-slate-50 ${getSemaforoColor(gestante.statusRisco)}`}>
                  <td className="px-6 py-4 text-center">
                    <span className="text-2xl">
                      {getSemaforoIcon(gestante.statusRisco)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-800">
                      {gestante.nomeCompleto}
                    </div>
                    <div className="text-sm text-slate-500">{gestante.email}</div>
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    {gestante.semanasGestacao || '—'}
                  </td>
                  <td className="px-6 py-4 text-slate-700">
                    <span className="px-3 py-1 text-sm font-medium text-blue-800 bg-blue-100 rounded">
                      {gestante.totalRelatos}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-700">
                    {gestante.ultimoRelato}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/medico/paciente/${gestante.id}`)}
                      className="text-sm font-medium text-sky-600 hover:text-sky-800"
                    >
                      Ver Detalhes →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {gestantes.length === 0 && (
          <div className="px-6 py-8 text-center">
            <p className="text-slate-500">Nenhuma paciente registrada.</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
}