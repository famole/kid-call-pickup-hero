
import React from 'react';
import { useAuth } from '@/context/auth/AuthProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminTabs from '@/components/AdminTabs';
import AdminPanelHeader from '@/components/admin-panel/AdminPanelHeader';
import ReportsTab from '@/components/admin-reports/ReportsTab';

const AdminPanel = () => {
  const { user } = useAuth();

  return (
    <div className="container mx-auto py-6">
      <AdminPanelHeader userName={user?.name} />

      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="grid grid-cols-2 mb-8">
          <TabsTrigger value="manage">Manage School</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="manage">
          <AdminTabs />
        </TabsContent>
        
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
