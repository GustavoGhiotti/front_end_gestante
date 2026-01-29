import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../../components/layout/MainLayout';
import { Button } from '../../components/ui/Button';
import { getGestanteById, getRelatosGestante, getMedicamentosGestante } from '../../services/apiMock';
import { User, RelatoDiario, Medicamento } from '../../types/domain';

export function PacienteDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [gestante, setGestante] = useState<User | null>(null);
  const [relatos, setRelatos] = useState<RelatoDiario[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'relatos' | 'medicamentos' | 'analise'>('relatos');

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      
      const gestanteData = await getGestanteById(id);
      const relatosData = await getRelatosGestante(id);
      const medicamentosData = await getMedicamentosGestante(id);

      setGestante(gestanteData);
      setRelatos(relatosData);
      setMedicamentos(medicamentosData);
      setLoading(false);
    }

    loadData();
  }, [id]);

  if (loading) {
    return (
      <MainLayout>
        <div className="py-12 text-center">
          <p className="text-slate-600">Carregando dados da paciente...</p>
        </div>
      </MainLayout>
    );
  }

  if (!gestante) {
    return (
      <MainLayout>
        <div className="p-6 rounded bg-red-50">
          <p className="text-red-800">Paciente não encontrada.</p>
          <Button onClick={() => navigate('/medico/dashboard')} className="mt-4">
            Voltar
          </Button>
        </div>
      </MainLayout>
    );
  }

  const medicamentosAtivos = medicamentos.filter((m) => m.ativo);

  // Função para contar sintomas
  const getSintomasMaisFrequentes = () => {
    const sintomosMap: Record<string, number> = {};
    
    relatos.forEach((relato) => {
      relato.sintomas.forEach((sintoma) => {
        sintomosMap[sintoma] = (sintomosMap[sintoma] || 0) + 1;
      });
    });

    return Object.entries(sintomosMap)
      .map(([sintoma, count]) => ({ sintoma, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  };

  const sintomasMaisFrequentes = getSintomasMaisFrequentes();

  return (
    <MainLayout>
      <div className="mb-6">
        <Button onClick={() => navigate('/medico/dashboard')} className="mb-4">
          ← Voltar
        </Button>
        
        <div className="p-6 bg-white rounded-lg shadow">
          <h2 className="mb-2 text-3xl font-bold text-slate-800">
            {gestante.nomeCompleto}
          </h2>
          <div className="grid grid-cols-2 gap-4 mt-4 md:grid-cols-4">
            <div>
              <p className="text-xs uppercase text-slate-500">Email</p>
              <p className="text-sm font-medium text-slate-800">{gestante.email}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Semanas</p>
              <p className="text-sm font-medium text-slate-800">{gestante.semanasGestacao || '—'}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Total Relatos</p>
              <p className="text-sm font-medium text-slate-800">{relatos.length}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Medicamentos</p>
              <p className="text-sm font-medium text-slate-800">{medicamentosAtivos.length}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('relatos')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === 'relatos'
                ? 'border-b-2 border-sky-600 text-sky-600'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
             Relatos ({relatos.length})
          </button>
          <button
            onClick={() => setActiveTab('medicamentos')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === 'medicamentos'
                ? 'border-b-2 border-sky-600 text-sky-600'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
             Medicamentos ({medicamentosAtivos.length})
          </button>
          <button
            onClick={() => setActiveTab('analise')}
            className={`flex-1 px-6 py-4 text-center font-medium transition-colors ${
              activeTab === 'analise'
                ? 'border-b-2 border-sky-600 text-sky-600'
                : 'text-slate-600 hover:text-slate-800'
            }`}
          >
             Análise
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'relatos' && (
            <div className="space-y-4">
              {relatos.length === 0 ? (
                <p className="text-slate-500">Nenhum relato registrado.</p>
              ) : (
                relatos.map((relato) => (
                  <div key={relato.id} className="p-4 border rounded-lg border-slate-200">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold text-slate-800">{relato.data}</h4>
                      <span className="text-lg">
                        {relato.humor === 'feliz' && '😊'}
                        {relato.humor === 'normal' && '😐'}
                        {relato.humor === 'triste' && '😢'}
                        {relato.humor === 'ansioso' && '😰'}
                      </span>
                    </div>
                    <p className="mb-3 text-slate-700">{relato.descricao}</p>
                    {relato.sintomas.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {relato.sintomas.map((sintoma) => (
                          <span
                            key={sintoma}
                            className="px-3 py-1 text-xs text-yellow-800 bg-yellow-100 rounded"
                          >
                            {sintoma}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'medicamentos' && (
            <div className="space-y-4">
              {medicamentosAtivos.length === 0 ? (
                <p className="text-slate-500">Nenhum medicamento ativo.</p>
              ) : (
                medicamentosAtivos.map((med) => (
                  <div key={med.id} className="p-4 border border-green-200 rounded-lg bg-green-50">
                    <h4 className="font-semibold text-slate-800">{med.nome}</h4>
                    <div className="grid grid-cols-2 gap-4 mt-2 text-sm">
                      <div>
                        <p className="text-slate-600">Dosagem</p>
                        <p className="font-medium text-slate-800">{med.dosagem}</p>
                      </div>
                      <div>
                        <p className="text-slate-600">Frequência</p>
                        <p className="font-medium text-slate-800">{med.frequencia}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'analise' && (
            <div className="space-y-4">
              <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
                <h4 className="mb-2 font-semibold text-slate-800">Resumo da Análise</h4>
                <ul className="space-y-2 text-sm text-slate-700">
                  <li>✓ Total de relatos: <strong>{relatos.length}</strong></li>
                  <li>✓ Medicamentos prescritos: <strong>{medicamentosAtivos.length}</strong></li>
                  <li>✓ Último registro: <strong>{relatos[0]?.data || 'Sem relatos'}</strong></li>
                  <li>✓ Semanas de gestação: <strong>{gestante.semanasGestacao || '—'}</strong></li>
                </ul>
              </div>

              {sintomasMaisFrequentes.length > 0 && (
                <div className="p-4 border rounded-lg bg-amber-50 border-amber-200">
                  <h4 className="mb-3 font-semibold text-slate-800">Sintomas Mais Frequentes</h4>
                  <div className="flex flex-wrap gap-2">
                    {sintomasMaisFrequentes.map((item) => (
                      <div key={item.sintoma} className="px-3 py-1 text-sm rounded bg-amber-100 text-amber-800">
                        <span className="font-semibold">{item.sintoma}</span>
                        <span className="ml-2 text-xs">({item.count}x)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}