
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminClassesScreen from "@/pages/AdminClassesScreen";
import AdminStudentsScreen from "@/pages/AdminStudentsScreen";
import AdminParentsScreen from "@/pages/AdminParentsScreen";
import PickupManagement from "@/pages/PickupManagement";
import { useIsMobile } from "@/hooks/use-mobile";

const AdminTabs = () => {
  const isMobile = useIsMobile();

  return (
    <div className="container mx-auto">
      <Tabs defaultValue="classes" className="mx-auto">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2 gap-1' : 'grid-cols-5'} max-w-3xl mx-auto mb-6`}>
          <TabsTrigger value="classes" className={isMobile ? 'text-xs px-2' : ''}>Classes</TabsTrigger>
          <TabsTrigger value="students" className={isMobile ? 'text-xs px-2' : ''}>Students</TabsTrigger>
          <TabsTrigger value="parents" className={isMobile ? 'text-xs px-2' : ''}>Parents</TabsTrigger>
          <TabsTrigger value="teachers" className={isMobile ? 'text-xs px-2' : ''}>Teachers</TabsTrigger>
          <TabsTrigger value="pickup" className={isMobile ? 'text-xs px-2' : ''}>Pickup</TabsTrigger>
        </TabsList>
        
        <TabsContent value="classes">
          <AdminClassesScreen />
        </TabsContent>
        
        <TabsContent value="students">
          <AdminStudentsScreen />
        </TabsContent>
        
        <TabsContent value="parents">
          <AdminParentsScreen userRole="parent" />
        </TabsContent>
        
        <TabsContent value="teachers">
          <AdminParentsScreen userRole="teacher" />
        </TabsContent>

        <TabsContent value="pickup">
          <PickupManagement showNavigation={false} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTabs;
