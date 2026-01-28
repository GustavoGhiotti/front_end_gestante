import { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';
import { getRelatos, getMedicamentos } from '../services/apiMock';
import { RelatoDiario, Medicamento } from '../types/domain';
import { useNavigate } from 'react-router-dom';

export function DashboardGestante() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [relatos, setRelatos] = useState<RelatoDiario[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);

  useEffect(() => {
    async function loadData() {
      if (!user) return;
      const [relatosData, medicamentosData] = await Promise.all([
        getRelatos(user.id),
        getMedicamentos(user.id),
      ]);
      setRelatos(relatosData);
      setMedicamentos(medicamentosData);
    }
    loadData();
  }, [user]);

  const medicamentosAtivos = medicamentos.filter((m) => m.ativo);

  return (
    <MainLayout>
      <div className="mb-8">
        <h2 className="mb-2 text-3xl font-bold text-slate-800">
          Bem-vinda, {user?.nomeCompleto}! 👋
        </h2>
        <p className="text-slate-600">
          Acompanhe sua saúde e bem-estar durante a gestação
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-3">
        <div className="p-6 bg-white border-l-4 border-blue-600 rounded-lg shadow">
          <h3 className="text-sm font-semibold uppercase text-slate-600">
            Relatos Registrados
          </h3>
          <p className="mt-2 text-3xl font-bold text-slate-800">{relatos.length}</p>
          <button
            onClick={() => navigate('/gestante/relatos')}
            className="mt-3 text-xs font-medium text-blue-600 hover:text-blue-800"
          >
            Ver relatos →
          </button>
        </div>

        <div className="p-6 bg-white border-l-4 border-green-600 rounded-lg shadow">
          <h3 className="text-sm font-semibold uppercase text-slate-600">
            Medicamentos Ativos
          </h3>
          <p className="mt-2 text-3xl font-bold text-slate-800">
            {medicamentosAtivos.length}
          </p>
          <button
            onClick={() => navigate('/gestante/medicamentos')}
            className="mt-3 text-xs font-medium text-green-600 hover:text-green-800"
          >
            Gerenciar →
          </button>
        </div>

        <div className="p-6 bg-white border-l-4 border-purple-600 rounded-lg shadow">
          <h3 className="text-sm font-semibold uppercase text-slate-600">
            Análises da IA
          </h3>
          <p className="mt-2 text-3xl font-bold text-slate-800">
            {relatos.length > 0 ? '✓' : '—'}
          </p>
          <button
            onClick={() => navigate('/gestante/resumos')}
            className="mt-3 text-xs font-medium text-purple-600 hover:text-purple-800"
          >
            Ver análises →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">
            📝 Últimos Relatos
          </h3>
          {relatos.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum relato registrado ainda.
            </p>
          ) : (
            <div className="space-y-3">
              {relatos.slice(0, 3).map((relato) => (
                <div
                  key={relato.id}
                  className="p-3 border rounded bg-slate-50 border-slate-200"
                >
                  <p className="text-sm font-medium text-slate-800">
                    {relato.data}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {relato.descricao.substring(0, 60)}...
                  </p>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => navigate('/gestante/relatos')}
            className="w-full px-4 py-2 mt-4 text-sm font-medium text-white rounded bg-sky-600 hover:bg-sky-700"
          >
            + Novo Relato
          </button>
        </div>

        <div className="p-6 bg-white rounded-lg shadow">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">
            💊 Medicamentos Atuais
          </h3>
          {medicamentosAtivos.length === 0 ? (
            <p className="text-sm text-slate-500">
              Nenhum medicamento ativo.
            </p>
          ) : (
            <div className="space-y-3">
              {medicamentosAtivos.slice(0, 3).map((med) => (
                <div
                  key={med.id}
                  className="p-3 border border-green-200 rounded bg-green-50"
                >
                  <p className="text-sm font-medium text-slate-800">
                    {med.nome}
                  </p>
                  <p className="mt-1 text-xs text-slate-600">
                    {med.dosagem} - {med.frequencia}
                  </p>
                </div>
              ))}
            </div>
          )}
          <button
            onClick={() => navigate('/gestante/medicamentos')}
            className="w-full px-4 py-2 mt-4 text-sm font-medium text-white bg-green-600 rounded hover:bg-green-700"
          >
            + Novo Medicamento
          </button>
        </div>
      </div>
    </MainLayout>
  );
}