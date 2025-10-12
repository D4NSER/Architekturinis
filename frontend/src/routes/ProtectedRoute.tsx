import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../features/auth/AuthContext';

export const ProtectedRoute = () => {
  const { token, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <div className="page-loading">Kraunama...</div>;
  }

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
