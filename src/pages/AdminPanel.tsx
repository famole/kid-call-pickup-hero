
import React from 'react';
import { useAuth } from '@/context/auth/AuthProvider';
import { useTranslation } from '@/hooks/useTranslation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from '@/components/Navigation';
import AdminTabs from '@/components/AdminTabs';
import AdminPanelHeader from '@/components/admin-panel/AdminPanelHeader';
import ReportsTab from '@/components/admin-reports/ReportsTab';
import { useIsMobile } from '@/hooks/use-mobile';

const AdminPanel = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen w-full bg-gray-50 overflow-x-hidden">
      <Navigation />
      <div className="w-full">
        <div className="container mx-auto py-4 sm:py-6 px-3 sm:px-6">
          <AdminPanelHeader userName={user?.name} />

          <Tabs defaultValue="manage" className="w-full">
            <TabsList className="grid grid-cols-2 mb-8">
              <TabsTrigger value="manage" className={isMobile ? 'text-sm px-2' : ''}>{t('admin.manageSchool')}</TabsTrigger>
              <TabsTrigger value="reports" className={isMobile ? 'text-sm px-2' : ''}>{t('admin.reports')}</TabsTrigger>
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
