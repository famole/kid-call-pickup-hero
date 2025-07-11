
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/context/auth/AuthProvider';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireAdmin = false,
  requireSuperAdmin = false 
}) => {
  const { user, loading, isAuthenticated } = useAuth();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Check superadmin access
  if (requireSuperAdmin && user?.role !== 'superadmin') {
    return <Navigate to="/" />;
  }

  // Check admin access (admin or superadmin)
  if (requireAdmin && !['admin', 'superadmin'].includes(user?.role || '')) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
