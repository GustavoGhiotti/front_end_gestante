import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function PatientHome() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex items-center justify-center px-5">
      <div className="w-full max-w-md text-center">

        {/* Ícone */}
        <div className="w-16 h-16 rounded-2xl bg-brand-100 flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-brand-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
          </svg>
        </div>

        {/* Saudação */}
        {user?.nomeCompleto && (
          <p className="text-brand-600 text-sm font-medium mb-1">
            Olá, {user.nomeCompleto.split(' ')[0]}!
          </p>
        )}

        <h1 className="text-2xl font-bold text-slate-800 mb-2">
          Área da Gestante
        </h1>
        <p className="text-slate-500 text-sm mb-8 max-w-xs mx-auto">
          Essa seção está em construção. Em breve você terá acesso ao seu painel de acompanhamento completo.
        </p>

        {/* Badge "Em breve" */}
        <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium px-3 py-1.5 rounded-full mb-8">
          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd" />
          </svg>
          Em breve
        </div>

        {/* Ação */}
        <div className="flex flex-col gap-3">
          <Link
            to="/gestante/dashboard"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
          >
            Ir para meu Dashboard
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
        </div>

        {/* Rodapé */}
        <p className="mt-10 text-xs text-slate-400">
          GestaCare · TCC 2026 · USCS
        </p>
      </div>
    </div>
  );
}

export default PatientHome;
