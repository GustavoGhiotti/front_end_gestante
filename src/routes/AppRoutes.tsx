import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

// Páginas existentes (gestante)
import { Login } from '../pages/Login';
import { DashboardGestante } from '../pages/DashboardGestante';
import { Relatos } from '../pages/Relatos';
import { Resumos } from '../pages/Resumos';
import { Medicamentos } from '../pages/Medicamentos';
import { Consultas } from '../pages/Consultas';

// Páginas médico — legado (mantidas para compatibilidade)
import { DashboardMedico } from '../pages/DashboardMedico';
import { PacienteDetalhes } from '../pages/medico/PacienteDetalhes';
import { Alertas } from '../pages/medico/Alertas';
import { Relatorios } from '../pages/medico/Relatorios';

// Páginas médico — novo design
import { DoctorDashboard } from '../pages/doctor/DoctorDashboard';
import { PatientDetails } from '../pages/doctor/PatientDetails';
import { DoctorAlerts } from '../pages/doctor/Alerts';
import { DoctorReports } from '../pages/doctor/Reports';

// Páginas gestante — novo design
import { PatientHome } from '../pages/patient/PatientHome';

export function AppRoutes() {
  console.log('AppRoutes: Renderizando rotas…');

  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* ─── Pública ─────────────────────────────────────────────────── */}
          <Route path="/login" element={<Login />} />

          {/* ─── Gestante ─────────────────────────────────────────────────── */}
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

          {/* ─── Médico — novo design (rotas canônicas) ───────────────────── */}
          <Route
            path="/doctor"
            element={
              <ProtectedRoute requiredRole="medico">
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/patients/:id"
            element={
              <ProtectedRoute requiredRole="medico">
                <PatientDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/alerts"
            element={
              <ProtectedRoute requiredRole="medico">
                <DoctorAlerts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctor/reports"
            element={
              <ProtectedRoute requiredRole="medico">
                <DoctorReports />
              </ProtectedRoute>
            }
          />

          {/* ─── Médico — legado (redireciona para novo design) ────────────── */}
          <Route path="/medico/dashboard" element={<Navigate to="/doctor" replace />} />
          <Route path="/medico/paciente/:id" element={<Navigate to="/doctor" replace />} />
          <Route path="/medico/alertas" element={<Navigate to="/doctor/alerts" replace />} />
          <Route path="/medico/relatorios" element={<Navigate to="/doctor/reports" replace />} />

          {/* ─── Gestante — placeholder nova área ─────────────────────────── */}
          <Route
            path="/patient"
            element={
              <ProtectedRoute requiredRole="gestante">
                <PatientHome />
              </ProtectedRoute>
            }
          />

          {/* ─── Catch-all ────────────────────────────────────────────────── */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default AppRoutes;