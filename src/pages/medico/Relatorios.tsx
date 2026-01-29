import { useEffect, useState } from 'react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Button } from '../../components/ui/Button';
import { getAllGestantes, getRelatosGestante } from '../../services/apiMock';

interface RelatorioGestante {
  gestanteId: string;
  gestanteName: string;
  totalRelatos: number;
  mediaRelatoriosPorSemana: number;
  sintomasMaisFrequentes: string[];
  ultimaAtualizacao: string;
}

export function Relatorios() {
  const [relatorios, setRelatorios] = useState<RelatorioGestante[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadRelatorios() {
      const gestantes = await getAllGestantes();
      const relatoriosData: RelatorioGestante[] = [];

      await Promise.all(
        gestantes.map(async (gestante) => {
          const relatos = await getRelatosGestante(gestante.id);

          const sintomosMap: Record<string, number> = {};
          relatos.forEach((relato) => {
            relato.sintomas.forEach((sintoma) => {
              sintomosMap[sintoma] = (sintomosMap[sintoma] || 0) + 1;
            });
          });

          const sintomasMaisFrequentes = Object.entries(sintomosMap)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([sintoma]) => sintoma);

          relatoriosData.push({
            gestanteId: gestante.id,
            gestanteName: gestante.nomeCompleto,
            totalRelatos: relatos.length,
            mediaRelatoriosPorSemana: relatos.length > 0 ? Math.round(relatos.length / 4) : 0,
            sintomasMaisFrequentes,
            ultimaAtualizacao: relatos[0]?.data || 'N/A',
          });
        })
      );

      setRelatorios(relatoriosData);
      setLoading(false);
    }

    loadRelatorios();
  }, []);

  const handleExportarPDF = (gestante: RelatorioGestante) => {
    // Simulação de exportação
    const conteudo = `
RELATÓRIO MÉDICO
================

Paciente: ${gestante.gestanteName}
Data: ${new Date().toLocaleDateString('pt-BR')}

Total de Relatos: ${gestante.totalRelatos}
Média por Semana: ${gestante.mediaRelatoriosPorSemana}
Última Atualização: ${gestante.ultimaAtualizacao}

Sintomas Mais Frequentes:
${gestante.sintomasMaisFrequentes.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Gerado em: ${new Date().toLocaleString('pt-BR')}
    `;

    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(conteudo));
    element.setAttribute('download', `relatorio_${gestante.gestanteName}.txt`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="py-12 text-center">
          <p className="text-slate-600">Gerando relatórios...</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="mb-6">
        <h2 className="mb-2 text-3xl font-bold text-slate-800">
          Relatórios
        </h2>
        <p className="text-slate-600">
          Análise consolidada de suas pacientes
        </p>
      </div>

      {relatorios.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-lg shadow">
          <p className="text-slate-600">Nenhum relatório disponível.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {relatorios.map((relatorio) => (
            <div key={relatorio.gestanteId} className="p-6 bg-white rounded-lg shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">
                    {relatorio.gestanteName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Última atualização: {relatorio.ultimaAtualizacao}
                  </p>
                </div>
                <Button
                  onClick={() => handleExportarPDF(relatorio)}
                  className="text-sm bg-green-600 hover:bg-green-700"
                >
                  Exportar PDF
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-4 rounded bg-blue-50">
                  <p className="text-xs font-semibold text-blue-600 uppercase">Total Relatos</p>
                  <p className="mt-2 text-2xl font-bold text-blue-900">
                    {relatorio.totalRelatos}
                  </p>
                </div>
                <div className="p-4 rounded bg-purple-50">
                  <p className="text-xs font-semibold text-purple-600 uppercase">Média por Semana</p>
                  <p className="mt-2 text-2xl font-bold text-purple-900">
                    {relatorio.mediaRelatoriosPorSemana}
                  </p>
                </div>
                <div className="p-4 rounded bg-pink-50">
                  <p className="text-xs font-semibold text-pink-600 uppercase">
                    Status
                  </p>
                  <p className="mt-2 text-2xl font-bold text-pink-900">
                    {relatorio.totalRelatos > 0 ? '✓' : '—'}
                  </p>
                </div>
              </div>

              {relatorio.sintomasMaisFrequentes.length > 0 && (
                <div>
                  <h4 className="mb-3 font-semibold text-slate-800">
                    Sintomas Mais Frequentes
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {relatorio.sintomasMaisFrequentes.map((sintoma) => (
                      <span
                        key={sintoma}
                        className="px-4 py-2 text-sm font-medium text-yellow-800 bg-yellow-100 rounded-full"
                      >
                        {sintoma}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </MainLayout>
  );
}