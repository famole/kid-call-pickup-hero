
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import StressTestPanel from '@/components/admin-panel/StressTestPanel';

const StressTestPage: React.FC = () => {
  const { user, isAdmin } = useAuth();

  if (!user || !isAdmin()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Stress Testing</h1>
          <p className="text-muted-foreground mt-2">
            Test the performance and reliability of your Supabase functions and application
          </p>
        </div>
        
        <StressTestPanel />
      </div>
    </div>
  );
};

export default StressTestPage;
