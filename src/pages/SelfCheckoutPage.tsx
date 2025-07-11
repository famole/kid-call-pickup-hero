
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import SelfCheckoutAuthorizationManagement from '@/components/self-checkout/SelfCheckoutAuthorizationManagement';
import SelfCheckoutManagement from '@/components/self-checkout/SelfCheckoutManagement';

const SelfCheckoutPage: React.FC = () => {
  const { user, loading: authLoading } = useAuth();

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-school-primary mx-auto mb-4"></div>
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <Navigation />
      <div className="w-full">
        <div className="container mx-auto py-6 px-4">
          {user.role === 'parent' ? (
            <SelfCheckoutAuthorizationManagement />
          ) : user.role === 'admin' || user.role === 'teacher' || user.role === 'superadmin' ? (
            <SelfCheckoutManagement />
          ) : (
            <div className="text-center py-8">
              <h2 className="text-xl font-semibold text-gray-700">Access Denied</h2>
              <p className="text-gray-500 mt-2">You don't have permission to access this page.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SelfCheckoutPage;
