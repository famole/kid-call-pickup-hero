
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminClassesScreen from "@/pages/AdminClassesScreen";
import AdminStudentsScreen from "@/pages/AdminStudentsScreen";
import AdminParentsScreen from "@/pages/AdminParentsScreen";
import PickupManagement from "@/pages/PickupManagement";

const AdminTabs = () => {
  return (
    <div className="container mx-auto">
      <Tabs defaultValue="classes" className="mx-auto">
        <TabsList className="grid w-full grid-cols-5 max-w-3xl mx-auto mb-6">
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="parents">Parents</TabsTrigger>
          <TabsTrigger value="teachers">Teachers</TabsTrigger>
          <TabsTrigger value="pickup">Pickup</TabsTrigger>
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
