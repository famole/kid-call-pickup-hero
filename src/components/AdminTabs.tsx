
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminClassesScreen from "@/pages/AdminClassesScreen";
import AdminStudentsScreen from "@/pages/AdminStudentsScreen";
import AdminParentsScreen from "@/pages/AdminParentsScreen";
import PickupManagement from "@/pages/PickupManagement";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "@/hooks/useTranslation";

const AdminTabs = () => {
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  return (
    <div className="container mx-auto">
      <Tabs defaultValue="classes" className="mx-auto">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3 gap-1' : 'grid-cols-6'} max-w-4xl mx-auto mb-6`}>
          <TabsTrigger value="classes" className={isMobile ? 'text-xs px-2' : ''}>{t('admin.classes')}</TabsTrigger>
          <TabsTrigger value="students" className={isMobile ? 'text-xs px-2' : ''}>{t('admin.students')}</TabsTrigger>
          <TabsTrigger value="parents" className={isMobile ? 'text-xs px-2' : ''}>{t('admin.parents')}</TabsTrigger>
          <TabsTrigger value="family" className={isMobile ? 'text-xs px-2' : ''}>{t('admin.family')}</TabsTrigger>
          <TabsTrigger value="teachers" className={isMobile ? 'text-xs px-2' : ''}>{t('admin.teachers')}</TabsTrigger>
          <TabsTrigger value="pickup" className={isMobile ? 'text-xs px-2' : ''}>{t('admin.pickup')}</TabsTrigger>
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
        
        <TabsContent value="family">
          <AdminParentsScreen userRole="family" />
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
