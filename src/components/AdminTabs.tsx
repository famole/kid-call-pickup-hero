
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminClassesScreen from "@/pages/AdminClassesScreen";
import AdminStudentsScreen from "@/pages/AdminStudentsScreen";

const AdminTabs = () => {
  return (
    <Tabs defaultValue="classes" className="container mx-auto">
      <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto mb-6">
        <TabsTrigger value="classes">Classes</TabsTrigger>
        <TabsTrigger value="students">Students</TabsTrigger>
      </TabsList>
      
      <TabsContent value="classes">
        <AdminClassesScreen />
      </TabsContent>
      
      <TabsContent value="students">
        <AdminStudentsScreen />
      </TabsContent>
    </Tabs>
  );
};

export default AdminTabs;
