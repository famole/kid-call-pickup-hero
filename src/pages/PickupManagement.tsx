
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import Navigation from '@/components/Navigation';
import ClassFilter from '@/components/viewer/ClassFilter';
import NoStudents from '@/components/viewer/NoStudents';
import PendingPickupsTable from '@/components/pickup/PendingPickupsTable';
import CalledStudentsTable from '@/components/pickup/CalledStudentsTable';
import SelfCheckoutStudentsTable from '@/components/self-checkout/SelfCheckoutStudentsTable';
import { useCalledStudents } from '@/hooks/useCalledStudents';
import { useOptimizedPickupManagement } from '@/hooks/useOptimizedPickupManagement';
import { useSelfCheckoutStudents } from '@/hooks/useSelfCheckoutStudents';
import { getAllClasses } from '@/services/classService';
import { getClassesForTeacher } from '@/services/classTeacherService';
import { startAutoCompletionProcess } from '@/services/pickup/autoCompletePickupRequests';
import { Class } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCheck, LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';

interface PickupManagementProps {
  showNavigation?: boolean;
}

const PickupManagement: React.FC<PickupManagementProps> = ({ showNavigation = true }) => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [teacherClasses, setTeacherClasses] = useState<Class[]>([]);
  
  // Determine if user is admin (can see all classes) or teacher (limited to assigned classes)
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const isTeacher = user?.role === 'teacher';

  // Use the optimized hooks for better performance and real-time updates
  const { childrenByClass, loading: calledLoading, refetch: refetchCalled } = useCalledStudents(selectedClass);
  const { pendingRequests, loading: pendingLoading, markAsCalled, refetch: refetchPending } = useOptimizedPickupManagement(selectedClass);
  const { authorizations, loading: selfCheckoutLoading } = useSelfCheckoutStudents(selectedClass);

  // Check if user has permission to access this page - include superadmin
  const hasPermission = user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'superadmin';

  // Flatten the called students from grouped format to a flat array
  const calledStudents = Object.values(childrenByClass).flat();

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        if (isAdmin) {
          // Admins can see all classes
          const classData = await getAllClasses();
          setClasses(classData);
        } else if (isTeacher && user?.id) {
          // Teachers can only see their assigned classes
          const teacherClassesData = await getClassesForTeacher(user.id);
          const formattedClasses = teacherClassesData.map(cls => ({
            ...cls,
            teacher: '', // This field is not used in the context of teacher-specific classes
            createdAt: '',
            updatedAt: ''
          }));
          setTeacherClasses(formattedClasses);
          setClasses(formattedClasses);
          
          // Auto-select the first class if teacher has only one class, otherwise keep 'all'
          if (formattedClasses.length === 1) {
            setSelectedClass(formattedClasses[0].id);
          }
        }
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };
    
    if (user?.id) {
      fetchClasses();
    }
    
    // Start the auto-completion process
    const stopAutoCompletion = startAutoCompletionProcess();
    
    // Cleanup on unmount
    return stopAutoCompletion;
  }, [user?.id, isAdmin, isTeacher]);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-school-primary mx-auto mb-4"></div>
          <p className="text-xl">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  // Redirect if user doesn't have permission
  if (!hasPermission) {
    return <Navigate to="/" replace />;
  }

  const handleClassChange = (value: string) => {
    setSelectedClass(value);
  };

  const handleMarkAsCalledWithRefresh = async (requestId: string) => {
    try {
      await markAsCalled(requestId);
      console.log('Student marked as called - real-time subscriptions will handle updates');
    } catch (error) {
      console.error('Error marking student as called:', error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gray-50">
      {showNavigation && <Navigation />}
      <div className="w-full">
        <div className="container mx-auto py-6 px-4">
          <div className="mb-6">
            <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-start sm:space-y-0">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">{t('pickup.management')}</h2>
                <p className="text-base sm:text-lg text-muted-foreground">{t('pickup.manageStudentPickupRequests')}</p>
              </div>
              {isAdmin && classes.length > 0 ? (
                <ClassFilter 
                  selectedClass={selectedClass} 
                  classes={classes} 
                  onChange={handleClassChange} 
                />
              ) : isAdmin ? (
                <Skeleton className="h-10 w-48" />
              ) : null}
            </div>
          </div>

          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {t('pickup.pendingRequests', { count: pendingRequests.length })}
              </TabsTrigger>
              <TabsTrigger value="called" className="flex items-center gap-2">
                <CheckCheck className="h-4 w-4" />
                {t('pickup.currentlyCalled', { count: calledStudents.length })}
              </TabsTrigger>
              <TabsTrigger value="self-checkout" className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                {t('pickup.selfCheckout', { count: authorizations.length })}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-6">
              <PendingPickupsTable 
                requests={pendingRequests}
                onMarkAsCalled={handleMarkAsCalledWithRefresh}
                loading={pendingLoading}
              />
            </TabsContent>

            <TabsContent value="called" className="space-y-6">
              <CalledStudentsTable 
                requests={calledStudents}
                loading={calledLoading}
              />
            </TabsContent>

            <TabsContent value="self-checkout" className="space-y-6">
              <SelfCheckoutStudentsTable 
                authorizations={authorizations}
                loading={selfCheckoutLoading}
              />
            </TabsContent>
          </Tabs>
          
          <div className="mt-8">
            <Card>
              <CardContent className="p-4">
                <h3 className="text-lg font-semibold mb-2">{t('pickup.pickupManagementInfo')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('pickup.pickupManagementDescription')}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PickupManagement;
