import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { loginMock } from '../services/apiMock';
import { UserRole } from '../types/domain';
import { useAuth } from '../contexts/AuthContext';

export function Login() {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('gestante');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErro(null);
    setLoading(true);

    try {
      const user = await loginMock(email, role);
      setUser(user);

      if (user.role === 'gestante') {
        navigate('/gestante/dashboard');
      } else {
        navigate('/medico/dashboard');
      }
    } catch (error) {
      setErro('Falha ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 bg-gradient-to-br from-sky-600 to-sky-800">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-slate-800">🏥</h1>
          <h2 className="mt-2 text-2xl font-bold text-slate-800">
            Sistema de Monitoramento
          </h2>
          <p className="mt-1 text-slate-600">Saúde da Gestante</p>
        </div>

        <p className="p-4 mb-6 text-sm border border-blue-200 rounded text-slate-600 bg-blue-50">
          <strong>Teste rápido:</strong>
          <br />
          <span className="font-mono text-xs">gestante@example.com</span>
          <br />
          <span className="font-mono text-xs">medico@example.com</span>
        </p>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">
              E-mail
            </label>
            <Input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block mb-2 text-sm font-medium text-slate-700">
              Perfil
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="gestante"
                  checked={role === 'gestante'}
                  onChange={() => setRole('gestante')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">👩 Gestante</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="medico"
                  checked={role === 'medico'}
                  onChange={() => setRole('medico')}
                  className="w-4 h-4"
                />
                <span className="text-sm text-slate-700">👨‍⚕️ Médico</span>
              </label>
            </div>
          </div>

          {erro && (
            <div className="px-4 py-3 text-sm text-red-800 border border-red-200 rounded bg-red-50">
              {erro}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-6 text-xs text-center text-slate-500">
          Sistema de Monitoramento de Gestantes - TCC 2026
        </p>
      </div>
    </div>
  );
}