
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import Navigation from '@/components/Navigation';
import PickupAuthorizationManagement from '@/components/pickup-authorization/PickupAuthorizationManagement';
import { useTranslation } from '@/hooks/useTranslation';
import PageHeader from '@/components/PageHeader';

const PickupAuthorizationPage: React.FC = () => {
  const { user, loading } = useAuth();
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-school-primary mx-auto mb-4"></div>
          <p className="text-xl">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'parent') {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6 max-w-4xl">
        <PageHeader title={t('pickupAuth.title', 'Autorizaciones de Retiro')} />
        <PickupAuthorizationManagement />
      </div>
    </div>
  );
};

export default PickupAuthorizationPage;
