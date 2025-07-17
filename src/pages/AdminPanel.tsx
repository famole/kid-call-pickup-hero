
import React from 'react';
import { useAuth } from '@/context/auth/AuthProvider';
import { useTranslation } from '@/hooks/useTranslation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from '@/components/Navigation';
import AdminTabs from '@/components/AdminTabs';
import AdminPanelHeader from '@/components/admin-panel/AdminPanelHeader';
import ReportsTab from '@/components/admin-reports/ReportsTab';

const AdminPanel = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <Navigation />
      <div className="w-full">
        <div className="container mx-auto py-6">
          <AdminPanelHeader userName={user?.name} />

          <Tabs defaultValue="manage" className="w-full">
            <TabsList className="grid grid-cols-2 mb-8">
              <TabsTrigger value="manage">{t('admin.manageSchool')}</TabsTrigger>
              <TabsTrigger value="reports">{t('admin.reports')}</TabsTrigger>
            </TabsList>
            
            <TabsContent value="manage">
              <AdminTabs />
            </TabsContent>
            
            <TabsContent value="reports">
              <ReportsTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
