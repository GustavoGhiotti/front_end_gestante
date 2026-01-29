import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const gestanteLinks = [
    { path: '/gestante/dashboard', label: 'Dashboard' },
    { path: '/gestante/relatos', label: 'Relatos'},
    { path: '/gestante/resumos', label: 'Resumos IA' },
    { path: '/gestante/medicamentos', label: 'Medicamentos'},
    { path: '/gestante/consultas', label: 'Consultas' },
  ];

  const medicoLinks = [
    { path: '/medico/dashboard', label: 'Dashboard'},
    { path: '/medico/alertas', label: 'Alertas'},
    { path: '/medico/relatorios', label: 'Relatórios'},
  ];

  const links = user?.role === 'gestante' ? gestanteLinks : medicoLinks;

  return (
    <aside className="flex flex-col w-64 text-white shadow-lg bg-slate-800">
      <div className="p-6 border-b border-slate-700">
        <h2 className="text-lg font-bold">🏥 Saúde Gestante</h2>
        <p className="mt-1 text-xs capitalize text-slate-400">{user?.role}</p>
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