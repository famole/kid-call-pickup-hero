
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/auth/AuthProvider';
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-xl">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, render based on role
  if (user?.role === 'admin') {
    // Admins still see the parent dashboard on the homepage
    // They can navigate to the admin panel via the navigation
    return <ParentDashboard />;
  }

  // Default to parent dashboard for authenticated users
  return <ParentDashboard />;
};

export default Index;
