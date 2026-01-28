import { MainLayout } from '../components/layout/MainLayout';

export function DashboardMedico() {
  return (
    <MainLayout>
      <div className="mb-6">
        <h2 className="mb-2 text-3xl font-bold text-slate-800">
          Dashboard do Médico
        </h2>
        <p className="text-slate-600">
          Gerenciar pacientes e acompanhar evolução das gestações
        </p>
      </div>

      <div className="p-8 text-center bg-white rounded-lg shadow">
        <p className="mb-4 text-slate-600">
          Funcionalidade em desenvolvimento...
        </p>
        <p className="text-sm text-slate-500">
          Aqui será possível visualizar lista de pacientes, resumos da IA,
          filtros por sintomas e sistema de semáforo de risco.
        </p>
      </div>
    </MainLayout>
  );
}