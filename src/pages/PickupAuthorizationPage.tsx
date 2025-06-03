
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import PickupAuthorizationManagement from '@/components/pickup-authorization/PickupAuthorizationManagement';

const PickupAuthorizationPage: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-school-primary mx-auto mb-4"></div>
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'parent') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-6 px-4 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Pickup Authorizations</h1>
          <p className="text-gray-600">
            Manage who can pick up your children and when they're authorized to do so.
          </p>
        </div>
        
        <PickupAuthorizationManagement />
      </div>
    </div>
  );
};

export default PickupAuthorizationPage;
