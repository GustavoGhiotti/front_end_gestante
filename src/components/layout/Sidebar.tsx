import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const gestanteLinks = [
    { path: '/gestante/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/gestante/relatos', label: 'Relatos', icon: '📝' },
    { path: '/gestante/resumos', label: 'Resumos IA', icon: '🤖' },
    { path: '/gestante/medicamentos', label: 'Medicamentos', icon: '💊' },
    { path: '/gestante/consultas', label: 'Consultas', icon: '📅' },
  ];

  const medicoLinks = [
    { path: '/medico/dashboard', label: 'Dashboard', icon: '📊' },
  ];

  const links = user?.role === 'gestante' ? gestanteLinks : medicoLinks;

  return (
    <aside className="flex flex-col w-64 text-white shadow-lg bg-slate-800">
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-lg font-bold">🏥 Saúde Gestante</h2>
      </div>

      <nav className="flex-1 p-4">
        <div className="space-y-2">
          {links.map((link) => (
            <button
              key={link.path}
              onClick={() => navigate(link.path)}
              className={`w-full text-left px-4 py-3 rounded transition-colors ${
                isActive(link.path)
                  ? 'bg-sky-600 text-white font-semibold'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              <span className="mr-2">{link.icon}</span>
              {link.label}
            </button>
          ))}
        </div>
      </nav>

      <div className="p-4 text-xs border-t border-slate-700 text-slate-400">
        <p>Versão 1.0</p>
        <p className="mt-2">TCC - 2026</p>
      </div>
    </aside>
  );
}