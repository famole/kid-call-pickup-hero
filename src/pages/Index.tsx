
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';
import Navigation from '@/components/Navigation';
import EnhancedParentDashboard from '@/components/EnhancedParentDashboard';

const Index = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login if not authenticated and not loading
    if (!loading && !isAuthenticated) {
      navigate('/login');
      return;
    }

    // Redirect admin and superadmin users to admin panel
    if (user && ['admin', 'superadmin'].includes(user.role)) {
      navigate('/admin');
      return;
    }

    // Redirect teachers to pickup management
    if (user && user.role === 'teacher') {
      navigate('/pickup-management');
      return;
    }
  }, [loading, isAuthenticated, user, navigate]);

  // Show loading indicator while checking auth status
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center w-full">
        <div className="text-center">
          <p className="text-xl">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // If authenticated, render with navigation
  if (isAuthenticated) {
    return (
      <div className="min-h-screen w-full bg-gray-50">
        <Navigation />
        <div className="w-full">
          <EnhancedParentDashboard />
        </div>
      </div>
    );
  }

  // This shouldn't be reached due to the useEffect redirect, but just in case
  return null;
};

export default Index;
