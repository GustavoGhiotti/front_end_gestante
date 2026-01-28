import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/Button';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header className="bg-white border-b shadow border-slate-200">
      <div className="flex items-center justify-between max-w-6xl px-6 py-4 mx-auto">
        <div>
          <h1 className="text-xl font-bold text-slate-800">
            🏥 Sistema de Monitoramento de Gestantes
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-slate-800">{user?.nomeCompleto}</p>
            <p className="text-xs capitalize text-slate-500">{user?.role}</p>
          </div>
          <Button
            onClick={handleLogout}
            className="text-sm bg-red-600 hover:bg-red-700"
          >
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}