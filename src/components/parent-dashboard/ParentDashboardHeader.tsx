
import React from 'react';
import Logo from '@/components/Logo';
import { useTranslation } from '@/hooks/useTranslation';

interface ParentDashboardHeaderProps {
  userName?: string;
}

const ParentDashboardHeader: React.FC<ParentDashboardHeaderProps> = ({ userName }) => {
  const { t } = useTranslation();
  
  return (
    <header className="mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="flex items-center justify-center sm:justify-start gap-3">
          <Logo size="sm" className="text-school-primary" />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Clifton College</h1>
        </div>
        <div className="sm:ml-auto">
          <p className="text-sm sm:text-base text-gray-600">{t('dashboard.welcome', { name: userName })}</p>
        </div>
      </div>
    </header>
  );
};

export default ParentDashboardHeader;
