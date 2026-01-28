import { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../contexts/AuthContext';
import { getRelatos, createRelato } from '../services/apiMock';
import { RelatoDiario } from '../types/domain';

export function Relatos() {
  const { user } = useAuth();
  const [relatos, setRelatos] = useState<RelatoDiario[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    descricao: '',
    humor: 'normal',
    sintomas: [] as string[],
  });

  const sintomasDisponiveis = [
    'enjôo',
    'fadiga',
    'dor nas costas',
    'inchaço',
    'insônia',
    'dor de cabeça',
    'edema',
    'contrações',
  ];

  useEffect(() => {
    async function loadRelatos() {
      if (!user) return;
      const data = await getRelatos(user.id);
      setRelatos(data);
    }
    loadRelatos();
  }, [user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const novoRelato = await createRelato({
        gestanteId: user.id,
        data: formData.data,
        descricao: formData.descricao,
        humor: formData.humor,
        sintomas: formData.sintomas,
      });

      setRelatos([novoRelato, ...relatos]);
      setFormData({
        data: new Date().toISOString().split('T')[0],
        descricao: '',
        humor: 'normal',
        sintomas: [],
      });
      setShowForm(false);
    } finally {
      setLoading(false);
    }
  }

  function toggleSintoma(sintoma: string) {
    setFormData((prev) => ({
      ...prev,
      sintomas: prev.sintomas.includes(sintoma)
        ? prev.sintomas.filter((s) => s !== sintoma)
        : [...prev.sintomas, sintoma],
    }));
  }

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-slate-800">Relatos Diários</h2>
          <p className="text-sm text-slate-600">Registre como você está se sentindo</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Novo Relato'}
        </Button>
      </div>

      {showForm && (
        <div className="p-6 mb-6 bg-white rounded shadow">
          <h3 className="mb-4 text-lg font-semibold text-slate-800">Novo Relato</h3>
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
                  Como você está se sentindo?
                </label>
                <select
                  value={formData.humor}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, humor: e.target.value }))
                  }
                  className="w-full px-3 py-2 border rounded border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  <option value="feliz">😊 Feliz</option>
                  <option value="normal">😐 Normal</option>
                  <option value="triste">😢 Triste</option>
                  <option value="ansioso">😰 Ansioso</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700">
                Descrição
              </label>
              <textarea
                value={formData.descricao}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, descricao: e.target.value }))
                }
                placeholder="Descreva como você se sente hoje..."
                className="w-full h-24 px-3 py-2 border rounded border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500"
                required
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-medium text-slate-700">
                Sintomas (selecione os que está sentindo)
              </label>
              <div className="grid grid-cols-2 gap-2">
                {sintomasDisponiveis.map((sintoma) => (
                  <label key={sintoma} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sintomas.includes(sintoma)}
                      onChange={() => toggleSintoma(sintoma)}
                    />
                    <span className="text-sm text-slate-700">{sintoma}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Salvando...' : 'Salvar Relato'}
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

      <div className="grid gap-4">
        {relatos.length === 0 ? (
          <div className="p-8 text-center bg-white rounded shadow">
            <p className="text-slate-500">Nenhum relato registrado ainda.</p>
            <Button onClick={() => setShowForm(true)} className="mt-4">
              Criar Primeiro Relato
            </Button>
          </div>
        ) : (
          relatos.map((relato) => (
            <div key={relato.id} className="p-6 bg-white border-l-4 rounded shadow border-sky-600">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="text-lg font-semibold text-slate-800">{relato.data}</p>
                  <p className="text-sm text-slate-500">Humor: {relato.humor}</p>
                </div>
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
    </MainLayout>
  );
}