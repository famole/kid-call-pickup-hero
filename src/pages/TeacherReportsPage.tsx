import React from 'react';
import { useAuth } from '@/context/auth/AuthProvider';
import { useTranslation } from '@/hooks/useTranslation';
import Navigation from '@/components/Navigation';
import TeacherReportsTab from '@/components/teacher-reports/TeacherReportsTab';
import PageHeader from '@/components/PageHeader';

const TeacherReportsPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <Navigation />
      <div className="w-full">
        <div className="container mx-auto py-6 px-4">
          <PageHeader
            title={t('navigation.reports', 'Reportes')}
            description={t('teacherReports.description')}
          />
          
          <TeacherReportsTab />
        </div>
      </div>
    </div>
  );
};

export default TeacherReportsPage;
