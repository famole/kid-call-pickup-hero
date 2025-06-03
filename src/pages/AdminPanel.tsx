
import React from 'react';
import { useAuth } from '@/context/auth/AuthProvider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminTabs from '@/components/AdminTabs';
import AdminPanelHeader from '@/components/admin-panel/AdminPanelHeader';
import PickupRequestsTab from '@/components/admin-pickup/PickupRequestsTab';
import ReportsTab from '@/components/admin-reports/ReportsTab';
import { useAdminPanelData } from '@/hooks/useAdminPanelData';

const AdminPanel = () => {
  const { user } = useAuth();
  const { activeRequests, parentsCache, loading } = useAdminPanelData();

  return (
    <div className="container mx-auto py-6">
      <AdminPanelHeader userName={user?.name} />

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="requests">Pickup Requests</TabsTrigger>
          <TabsTrigger value="manage">Manage School</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="requests">
          <PickupRequestsTab 
            activeRequests={activeRequests}
            parentsCache={parentsCache}
            loading={loading}
          />
        </TabsContent>
        
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
