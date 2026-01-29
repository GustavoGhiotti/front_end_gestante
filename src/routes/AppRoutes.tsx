import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { Login } from '../pages/Login';
import { DashboardGestante } from '../pages/DashboardGestante';
import { DashboardMedico } from '../pages/DashboardMedico';
import { PacienteDetalhes } from '../pages/medico/PacienteDetalhes';
import { Alertas } from '../pages/medico/Alertas';
import { Relatorios } from '../pages/medico/Relatorios';
import { Relatos } from '../pages/Relatos';
import { Resumos } from '../pages/Resumos';
import { Medicamentos } from '../pages/Medicamentos';
import { Consultas } from '../pages/Consultas';

export function AppRoutes() {
  console.log('AppRoutes: Renderizando rotas...');

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          {/* ROTAS GESTANTE */}
          <Route
            path="/gestante/dashboard"
            element={
              <ProtectedRoute requiredRole="gestante">
                <DashboardGestante />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestante/relatos"
            element={
              <ProtectedRoute requiredRole="gestante">
                <Relatos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestante/resumos"
            element={
              <ProtectedRoute requiredRole="gestante">
                <Resumos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestante/medicamentos"
            element={
              <ProtectedRoute requiredRole="gestante">
                <Medicamentos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gestante/consultas"
            element={
              <ProtectedRoute requiredRole="gestante">
                <Consultas />
              </ProtectedRoute>
            }
          />
          
          {/* ROTAS MÉDICO */}
          <Route
            path="/medico/dashboard"
            element={
              <ProtectedRoute requiredRole="medico">
                <DashboardMedico />
              </ProtectedRoute>
            }
          />
          <Route
            path="/medico/paciente/:id"
            element={
              <ProtectedRoute requiredRole="medico">
                <PacienteDetalhes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/medico/alertas"
            element={
              <ProtectedRoute requiredRole="medico">
                <Alertas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/medico/relatorios"
            element={
              <ProtectedRoute requiredRole="medico">
                <Relatorios />
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default AppRoutes;