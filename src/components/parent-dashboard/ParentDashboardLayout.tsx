
import React from 'react';

interface ParentDashboardLayoutProps {
  children: React.ReactNode;
}

const ParentDashboardLayout: React.FC<ParentDashboardLayoutProps> = ({
  children
}) => {
  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="w-full max-w-none py-4 px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
};

export default ParentDashboardLayout;
