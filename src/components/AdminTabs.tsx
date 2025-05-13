
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminClassesScreen from "@/pages/AdminClassesScreen";
import AdminStudentsScreen from "@/pages/AdminStudentsScreen";
import AdminParentsScreen from "@/pages/AdminParentsScreen";
import { Link } from "react-router-dom";
import { Settings, Database } from "lucide-react";

const AdminTabs = () => {
  return (
    <div className="container mx-auto">
      <div className="flex justify-end mb-4">
        <Link 
          to="/admin/setup" 
          className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <Database className="h-4 w-4 mr-1" />
          Data Migration
        </Link>
      </div>
      
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
