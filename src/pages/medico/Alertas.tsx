import { useEffect, useState } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { getAllGestantes, getRelatosGestante } from '../../services/apiMock';

interface Alerta {
  id: string;
  gestanteId: string;
  gestanteNome: string;
  tipo: 'risco_alto' | 'sintomas_preocupantes' | 'sem_relato_3_dias';
  mensagem: string;
  data: string;
  urgencia: 'alta' | 'media' | 'baixa';
}

export function Alertas() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAlertas() {
      const gestantes = await getAllGestantes();
      const alertasGerados: Alerta[] = [];

      await Promise.all(
        gestantes.map(async (gestante) => {
          const relatos = await getRelatosGestante(gestante.id);

          if (relatos.length === 0) {
            alertasGerados.push({
              id: `${gestante.id}-sem-relato`,
              gestanteId: gestante.id,
              gestanteNome: gestante.nomeCompleto,
              tipo: 'sem_relato_3_dias',
              mensagem: 'Nenhum relato registrado nos últimos 3 dias',
              data: new Date().toISOString().split('T')[0],
              urgencia: 'media',
            });
            return;
          }

          const ultimoRelato = relatos[0];
          const sintomasGraves = ['contrações', 'sangramento', 'pressão alta', 'edema severo'];
          const temSintomaGrave = ultimoRelato.sintomas.some((s) =>
            sintomasGraves.includes(s.toLowerCase())
          );

          if (temSintomaGrave) {
            alertasGerados.push({
              id: `${gestante.id}-risco`,
              gestanteId: gestante.id,
              gestanteNome: gestante.nomeCompleto,
              tipo: 'risco_alto',
              mensagem: `Sintomas preocupantes detectados: ${ultimoRelato.sintomas.join(', ')}`,
              data: ultimoRelato.data,
              urgencia: 'alta',
            });
          } else if (ultimoRelato.sintomas.length > 3) {
            alertasGerados.push({
              id: `${gestante.id}-multiplos`,
              gestanteId: gestante.id,
              gestanteNome: gestante.nomeCompleto,
              tipo: 'sintomas_preocupantes',
              mensagem: `${ultimoRelato.sintomas.length} sintomas registrados no último relato`,
              data: ultimoRelato.data,
              urgencia: 'media',
            });
          }
        })
      );

      setAlertas(alertasGerados.sort((a, b) => b.data.localeCompare(a.data)));
      setLoading(false);
    }

    loadAlertas();
  }, []);

  const getUrgenciaColor = (urgencia: string) => {
    switch (urgencia) {
      case 'alta':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'media':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'baixa':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'risco_alto':
        return 'Alto Risco';
      case 'sintomas_preocupantes':
        return 'Sintomas Preocupantes';
      case 'sem_relato_3_dias':
        return 'Sem relato nos últimos 3 dias';
      default:
        return '📌';
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="py-12 text-center">
          <p className="text-slate-600">Carregando alertas...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6">
        <h2 className="mb-2 text-3xl font-bold text-slate-800">
           Alertas e Notificações
        </h2>
        <p className="text-slate-600">
          Acompanhe situações que necessitam de atenção
        </p>
      </div>

      {alertas.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-lg shadow">
          <p className="text-lg text-slate-600">✅ Nenhum alerta no momento</p>
          <p className="mt-2 text-sm text-slate-500">
            Todas as suas pacientes estão com evolução normal
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {alertas.map((alerta) => (
            <div
              key={alerta.id}
              className={`p-6 rounded-lg shadow border-l-4 ${getUrgenciaColor(alerta.urgencia)}`}
            >
              <div className="flex items-start gap-4">
                <span className="text-3xl">{getIcon(alerta.tipo)}</span>
                <div className="flex-1">
                  <h3 className="mb-1 text-lg font-semibold">
                    {alerta.gestanteNome}
                  </h3>
                  <p className="mb-2">{alerta.mensagem}</p>
                  <p className="text-xs opacity-75">Data do relato: {alerta.data}</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-3 py-1 text-xs font-semibold uppercase rounded">
                    {alerta.urgencia}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
}