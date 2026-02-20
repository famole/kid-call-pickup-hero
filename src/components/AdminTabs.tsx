
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminClassesScreen from "@/pages/AdminClassesScreen";
import AdminStudentsScreen from "@/pages/AdminStudentsScreen";
import AdminParentsScreen from "@/pages/AdminParentsScreen";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "@/hooks/useTranslation";

const AdminTabs = () => {
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  return (
    <div className="container mx-auto">
      <Tabs defaultValue="classes" className="mx-auto">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3 gap-1' : 'grid-cols-5'} max-w-4xl mx-auto mb-6`}>
          <TabsTrigger value="classes" className={isMobile ? 'text-[11px] px-1.5 py-1.5' : ''}>{t('admin.classes')}</TabsTrigger>
          <TabsTrigger value="students" className={isMobile ? 'text-[11px] px-1.5 py-1.5' : ''}>{t('admin.students')}</TabsTrigger>
          <TabsTrigger value="parents" className={isMobile ? 'text-[11px] px-1.5 py-1.5' : ''}>{t('admin.parents')}</TabsTrigger>
          <TabsTrigger value="family" className={isMobile ? 'text-[11px] px-1.5 py-1.5' : ''}>{t('admin.family')}</TabsTrigger>
          <TabsTrigger value="teachers" className={isMobile ? 'text-[11px] px-1.5 py-1.5' : ''}>{t('admin.teachers')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="classes">
          <AdminClassesScreen />
        </TabsContent>
        
        <TabsContent value="students">
          <AdminStudentsScreen />
        </TabsContent>
        
        <TabsContent value="parents">
          <AdminParentsScreen userRole="parent" includedRoles={['parent']} />
        </TabsContent>
        
        <TabsContent value="family">
          <AdminParentsScreen userRole="family" includedRoles={['family', 'other']} />
        </TabsContent>
        
        <TabsContent value="teachers">
          <AdminParentsScreen userRole="teacher" includedRoles={['teacher']} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminTabs;
