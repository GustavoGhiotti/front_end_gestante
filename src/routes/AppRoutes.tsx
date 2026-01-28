import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '../contexts/AuthContext';
import { ProtectedRoute } from './ProtectedRoute';
import { Login } from '../pages/Login';
import { DashboardGestante } from '../pages/DashboardGestante';
import { DashboardMedico } from '../pages/DashboardMedico';
import { Relatos } from '../pages/Relatos';
import { Resumos } from '../pages/Resumos';
import { Medicamentos } from '../pages/Medicamentos';
import { Consultas } from '../pages/Consultas';

export function AppRoutes() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          
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
          
          <Route
            path="/medico/dashboard"
            element={
              <ProtectedRoute requiredRole="medico">
                <DashboardMedico />
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}