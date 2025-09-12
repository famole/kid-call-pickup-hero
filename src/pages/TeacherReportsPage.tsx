import React from 'react';
import { useAuth } from '@/context/auth/AuthProvider';
import { useTranslation } from '@/hooks/useTranslation';
import Navigation from '@/components/Navigation';
import TeacherReportsTab from '@/components/teacher-reports/TeacherReportsTab';

const TeacherReportsPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <Navigation />
      <div className="w-full">
        <div className="container mx-auto py-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">{t('navigation.reports')}</h1>
            <p className="text-gray-600 mt-2">
              {t('teacherReports.description')}
            </p>
          </div>
          
          <TeacherReportsTab />
        </div>
      </div>
    </div>
  );
};

export default TeacherReportsPage;