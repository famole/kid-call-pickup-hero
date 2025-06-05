
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Navigation from '@/components/Navigation';
import ParentDashboard from '@/components/ParentDashboard';

const Index = () => {
  const { user, loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect to login if not authenticated and not loading
    if (!loading && !isAuthenticated) {
      navigate('/login');
    }
  }, [loading, isAuthenticated, navigate]);

  // Show loading indicator while checking auth status
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center w-full">
        <div className="text-center">
          <p className="text-xl">Loading...</p>
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
          <ParentDashboard />
        </div>
      </div>
    );
  }

  // This shouldn't be reached due to the useEffect redirect, but just in case
  return null;
};

export default Index;
