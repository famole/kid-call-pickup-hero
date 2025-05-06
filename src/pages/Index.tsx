
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import ParentDashboard from '@/components/ParentDashboard';

const Index = () => {
  const { user } = useAuth();

  // Render based on role
  if (user?.role === 'admin') {
    // Admins still see the parent dashboard on the homepage
    // They can navigate to the admin panel via the navigation
    return <ParentDashboard />;
  }

  // Default to parent dashboard
  return <ParentDashboard />;
};

export default Index;
