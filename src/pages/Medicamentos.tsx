import { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { getMedicamentos } from '../services/apiMock';
import { Medicamento } from '../types/domain';

export function Medicamentos() {
  const { user } = useAuth();
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    nome: '',
    dosagem: '',
    frequencia: '',
    dataInicio: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    async function loadMedicamentos() {
      if (!user) return;
      const data = await getMedicamentos(user.id);
      setMedicamentos(data);
    }
    loadMedicamentos();
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const novoMedicamento: Medicamento = {
        id: String(medicamentos.length + 1),
        gestanteId: user.id,
        nome: formData.nome,
        dosagem: formData.dosagem,
        frequencia: formData.frequencia,
        dataInicio: formData.dataInicio,
        dataFim: null,
        ativo: true,
      };

      setMedicamentos([novoMedicamento, ...medicamentos]);
      setFormData({
        nome: '',
        dosagem: '',
        frequencia: '',
        dataInicio: new Date().toISOString().split('T')[0],
      });
      setShowForm(false);
    } finally {
      setLoading(false);
    }
  }

  function toggleMedicamento(id: string) {
    setMedicamentos((prev) =>
      prev.map((med) => (med.id === id ? { ...med, ativo: !med.ativo } : med))
    );
  }

  const medicamentosAtivos = medicamentos.filter((m) => m.ativo);
  const medicamentosInativos = medicamentos.filter((m) => !m.ativo);

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Medicamentos</h2>
          <p className="text-sm text-slate-600">Gerenciar prescrições e tratamentos</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Novo Medicamento'}
        </Button>
      </div>

      {showForm && (
        <div className="p-6 mb-6 bg-white rounded shadow">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">
            Adicionar Medicamento
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Nome do Medicamento
                </label>
                <Input
                  value={formData.nome}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nome: e.target.value }))
                  }
                  placeholder="Ex: Vitamina D"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Dosagem
                </label>
                <Input
                  value={formData.dosagem}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, dosagem: e.target.value }))
                  }
                  placeholder="Ex: 1000 UI"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Frequência
                </label>
                <Input
                  value={formData.frequencia}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, frequencia: e.target.value }))
                  }
                  placeholder="Ex: Uma vez ao dia"
                  required
                />
              </div>
              <div>
                <label className="block mb-1 text-sm font-medium text-slate-700">
                  Data de Início
                </label>
                <Input
                  type="date"
                  value={formData.dataInicio}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, dataInicio: e.target.value }))
                  }
                  required
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Medicamento'}
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
        {medicamentosAtivos.length > 0 && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-slate-800">Ativos</h3>
            <div className="grid gap-3">
              {medicamentosAtivos.map((med) => (
                <div
                  key={med.id}
                  className="p-4 bg-white border-l-4 border-green-600 rounded shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-800">{med.nome}</h4>
                      <p className="mt-1 text-sm text-slate-600">
                        Dosagem: <span className="font-medium">{med.dosagem}</span>
                      </p>
                      <p className="text-sm text-slate-600">
                        Frequência: <span className="font-medium">{med.frequencia}</span>
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Desde {med.dataInicio}
                      </p>
                    </div>
                    <Button
                      onClick={() => toggleMedicamento(med.id)}
                      className="text-xs bg-red-600 hover:bg-red-700"
                    >
                      Desativar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {medicamentosInativos.length > 0 && (
          <div>
            <h3 className="mb-4 text-lg font-semibold text-slate-800">Inativos</h3>
            <div className="grid gap-3">
              {medicamentosInativos.map((med) => (
                <div
                  key={med.id}
                  className="p-4 border-l-4 rounded shadow bg-slate-50 opacity-60 border-slate-400"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-600">{med.nome}</h4>
                      <p className="mt-1 text-sm text-slate-500">
                        Dosagem: {med.dosagem}
                      </p>
                      <p className="mt-2 text-xs text-slate-400">
                        Até {med.dataFim || 'Data não definida'}
                      </p>
                    </div>
                    <Button
                      onClick={() => toggleMedicamento(med.id)}
                      className="text-xs bg-green-600 hover:bg-green-700"
                    >
                      Reativar
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {medicamentos.length === 0 && (
          <div className="p-8 text-center bg-white rounded shadow">
            <p className="text-slate-500">Nenhum medicamento registrado.</p>
            <Button onClick={() => setShowForm(true)} className="mt-4">
              Adicionar Medicamento
            </Button>
          </div>
        )}
      </div>
    </MainLayout>
  );
}