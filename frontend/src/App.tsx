import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';

import { AuthProvider, useAuth } from './features/auth/AuthContext';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import ProfilePage from './features/profile/ProfilePage';
import PlansPage from './features/plans/PlansPage';
import PlanDetailPage from './features/plans/PlanDetailPage';
import AppLayout from './layouts/AppLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import './App.css';

const GuestOnlyRoute = ({ children }: { children: ReactElement }) => {
  const { token } = useAuth();
  if (token) {
    return <Navigate to="/plans" replace />;
  }
  return children;
};

export const App = () => (
  <AuthProvider>
    <Routes>
      <Route
        path="/login"
        element={
          <GuestOnlyRoute>
            <LoginPage />
          </GuestOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestOnlyRoute>
            <RegisterPage />
          </GuestOnlyRoute>
        }
      />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/plans" replace />} />
          <Route path="/plans" element={<PlansPage />} />
          <Route path="/plans/:planId" element={<PlanDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/plans" replace />} />
    </Routes>
  </AuthProvider>
);

export default App;
