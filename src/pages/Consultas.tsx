import { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

interface Consulta {
  id: string;
  data: string;
  horario: string;
  medico: string;
  especialidade: string;
  local: string;
  anotacoes: string;
}

export function Consultas() {
  const [consultas, setConsultas] = useState<Consulta[]>([
    {
      id: '1',
      data: '2026-02-15',
      horario: '10:30',
      medico: 'Dra. Ana Silva',
      especialidade: 'Obstetrícia',
      local: 'Clínica Vida - Sala 201',
      anotacoes: 'Consulta de rotina - ultrassom agendado',
    },
  ]);

  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    data: '',
    horario: '',
    medico: '',
    especialidade: '',
    local: '',
    anotacoes: '',
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const novaConsulta: Consulta = {
        id: String(consultas.length + 1),
        ...formData,
      };

      setConsultas([novaConsulta, ...consultas]);
      setFormData({
        data: '',
        horario: '',
        medico: '',
        especialidade: '',
        local: '',
        anotacoes: '',
      });
      setShowForm(false);
    } finally {
      setLoading(false);
    }
  }

  function cancelarConsulta(id: string) {
    setConsultas((prev) => prev.filter((c) => c.id !== id));
  }

  const hoje = new Date().toISOString().split('T')[0];
  const consultasProximas = consultas.filter((c) => c.data >= hoje);
  const consultasPassadas = consultas.filter((c) => c.data < hoje);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Consultas</h2>
          <p className="text-sm text-slate-600">
            Agendamentos com seus médicos
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Agendar Consulta'}
        </Button>
      </div>

      {showForm && (
        <div className="p-6 mb-6 bg-white rounded shadow">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">
            Agendar Consulta
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Data
                </label>
                <Input
                  type="date"
                  value={formData.data}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, data: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Horário
                </label>
                <Input
                  type="time"
                  value={formData.horario}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, horario: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Médico
                </label>
                <Input
                  value={formData.medico}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, medico: e.target.value }))
                  }
                  placeholder="Nome do médico"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Especialidade
                </label>
                <Input
                  value={formData.especialidade}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      especialidade: e.target.value,
                    }))
                  }
                  placeholder="Ex: Obstetrícia"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-slate-700">
                Local
              </label>
              <Input
                value={formData.local}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, local: e.target.value }))
                }
                placeholder="Clínica ou Hospital"
                required
              />
            </div>

            <div>
              <label className="block mb-1 text-sm font-medium text-slate-700">
                Anotações
              </label>
              <textarea
                value={formData.anotacoes}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    anotacoes: e.target.value,
                  }))
                }
                placeholder="Anotações adicionais..."
                className="w-full h-20 px-3 py-2 border rounded border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Agendando...' : 'Agendar'}
              </Button>
              <Button
                type="button"
                onClick={() => setShowForm(false)}
                className="bg-slate-500 hover:bg-slate-600"
              >
                Cancelar
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-6">
        {consultasProximas.length > 0 && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-slate-800">
              📅 Próximas Consultas
            </h3>
            <div className="grid gap-4">
              {consultasProximas.map((consulta) => (
                <div
                  key={consulta.id}
                  className="p-6 bg-white border-l-4 border-blue-600 rounded shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-slate-800">
                        {consulta.medico}
                      </h4>
                      <p className="mt-1 text-sm text-slate-600">
                        📍 {consulta.especialidade}
                      </p>
                      <p className="text-sm text-slate-600">
                        📅 {new Date(consulta.data).toLocaleDateString('pt-BR')} às{' '}
                        {consulta.horario}
                      </p>
                      <p className="text-sm text-slate-600">📌 {consulta.local}</p>
                      {consulta.anotacoes && (
                        <p className="mt-3 text-sm italic text-slate-700">
                          "{consulta.anotacoes}"
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={() => cancelarConsulta(consulta.id)}
                      className="text-xs bg-red-600 hover:bg-red-700"
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {consultasPassadas.length > 0 && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-slate-800">
              ✓ Consultas Realizadas
            </h3>
            <div className="grid gap-4">
              {consultasPassadas.map((consulta) => (
                <div
                  key={consulta.id}
                  className="p-6 border-l-4 rounded shadow bg-slate-50 opacity-70 border-slate-400"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-700">
                      {consulta.medico}
                    </h4>
                    <p className="mt-1 text-sm text-slate-600">
                      {consulta.especialidade}
                    </p>
                    <p className="text-sm text-slate-600">
                      {new Date(consulta.data).toLocaleDateString('pt-BR')} às{' '}
                      {consulta.horario}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {consultas.length === 0 && (
          <div className="p-8 text-center bg-white rounded shadow">
            <p className="text-slate-500">Nenhuma consulta agendada.</p>
            <Button onClick={() => setShowForm(true)} className="mt-4">
              Agendar Primeira Consulta
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}