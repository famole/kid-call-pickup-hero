
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminClassesScreen from "@/pages/AdminClassesScreen";
import AdminStudentsScreen from "@/pages/AdminStudentsScreen";
import AdminParentsScreen from "@/pages/AdminParentsScreen";

const AdminTabs = () => {
  return (
    <div className="container mx-auto">
      <Tabs defaultValue="classes" className="mx-auto">
        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-6">
          <TabsTrigger value="classes">Classes</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="parents">Parents</TabsTrigger>
        </TabsList>
        
        <TabsContent value="classes">
          <AdminClassesScreen />
        </TabsContent>
        
        <TabsContent value="students">
          <AdminStudentsScreen />
        </TabsContent>
        
        <TabsContent value="parents">
          <AdminParentsScreen />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTabs;
