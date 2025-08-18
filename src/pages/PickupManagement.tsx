
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import { startAutoCompletionProcess } from '@/services/pickup/autoCompletePickupRequests';
import { logger } from '@/utils/logger';
import { Class } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCheck, LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/hooks/useTranslation';
import { useIsMobile } from '@/hooks/use-mobile';

interface PickupManagementProps {
  showNavigation?: boolean;
}

const PickupManagement: React.FC<PickupManagementProps> = ({ showNavigation = true }) => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [teacherClasses, setTeacherClasses] = useState<Class[]>([]);
  
  // Memoize role checks to prevent unnecessary re-renders
  const isAdmin = useMemo(() => user?.role === 'admin' || user?.role === 'superadmin', [user?.role]);
  const isTeacher = useMemo(() => user?.role === 'teacher', [user?.role]);

  // Memoize fetchClasses function to prevent infinite loops
  const fetchClasses = useCallback(async () => {
    if (!user?.email) return;
    
    try {
      if (isAdmin) {
        // Admins can see all classes
        const classData = await getAllClasses();
        setClasses(classData);
      } else if (isTeacher) {
        // Teachers can only see their assigned classes
        // First, get the parent ID from the database using the user's email
        const { data: parentData, error: parentError } = await supabase
          .from('parents')
          .select('id')
          .eq('email', user.email)
          .single();
        
        if (parentError || !parentData) {
          console.error('Error fetching parent data for teacher:', parentError);
          return;
        }
        
        const teacherClassesData = await getClassesForTeacher(parentData.id);
        const formattedClasses = teacherClassesData.map(cls => ({
          ...cls,
          teacher: '', // This field is not used in the context of teacher-specific classes
          createdAt: '',
          updatedAt: ''
        }));
        setTeacherClasses(formattedClasses);
        setClasses(formattedClasses);
        
        logger.info(`Teacher ${user.email} is assigned to classes:`, formattedClasses.map(c => c.name));
        logger.info(`Teacher class IDs:`, formattedClasses.map(c => c.id));
        
        // Auto-select the first class if teacher has only one class, otherwise keep 'all'
        if (formattedClasses.length === 1) {
          setSelectedClass(formattedClasses[0].id);
        }
      }
    } catch (error) {
      logger.error('Error fetching classes:', error);
    }
  }, [user?.email, isAdmin, isTeacher]);

  const teacherClassIds = useMemo(() => {
    const ids = isTeacher ? teacherClasses.map(cls => cls.id) : undefined;
    logger.info('teacherClassIds in PickupManagement:', ids);
    return ids;
  }, [isTeacher, teacherClasses]);
  const { childrenByClass, loading: calledLoading, refetch: refetchCalled } = useCalledStudents(selectedClass, teacherClassIds);
  const { pendingRequests, loading: pendingLoading, markAsCalled, refetch: refetchPending } = useOptimizedPickupManagement(selectedClass, teacherClassIds);
  const { authorizations, loading: selfCheckoutLoading } = useSelfCheckoutStudents(selectedClass);

  // Check if user has permission to access this page - include superadmin
  const hasPermission = useMemo(() => user?.role === 'admin' || user?.role === 'teacher' || user?.role === 'superadmin', [user?.role]);

  // Flatten the called students from grouped format to a flat array
  const calledStudents = useMemo(() => Object.values(childrenByClass).flat(), [childrenByClass]);

  useEffect(() => {
    fetchClasses();
    
    // Start the auto-completion process
    const stopAutoCompletion = startAutoCompletionProcess();
    
    // Cleanup on unmount
    return stopAutoCompletion;
  }, [fetchClasses]);

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
      logger.info('Student marked as called - real-time subscriptions will handle updates');
    } catch (error) {
      logger.error('Error marking student as called:', error);
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
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-3 h-auto p-1' : 'grid-cols-3'}`}>
              <TabsTrigger value="pending" className={`flex items-center gap-1 ${isMobile ? 'text-xs px-1 py-2 flex-col min-h-[3rem]' : 'gap-2'}`}>
                <Clock className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                <span className={isMobile ? 'text-center leading-tight' : ''}>
                  {isMobile ? 'Pendientes' : t('pickup.pendingRequests', { count: pendingRequests.length })}
                </span>
              </TabsTrigger>
              <TabsTrigger value="called" className={`flex items-center gap-1 ${isMobile ? 'text-xs px-1 py-2 flex-col min-h-[3rem]' : 'gap-2'}`}>
                <CheckCheck className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                <span className={isMobile ? 'text-center leading-tight' : ''}>
                  {isMobile ? 'Llamados' : t('pickup.currentlyCalled', { count: calledStudents.length })}
                </span>
              </TabsTrigger>
              <TabsTrigger value="self-checkout" className={`flex items-center gap-1 ${isMobile ? 'text-xs px-1 py-2 flex-col min-h-[3rem]' : 'gap-2'}`}>
                <LogOut className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
                <span className={isMobile ? 'text-center leading-tight' : ''}>
                  {isMobile ? 'Auto-Salida' : t('pickup.selfCheckout', { count: authorizations.length })}
                </span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-6 mt-4">
              <PendingPickupsTable 
                requests={pendingRequests}
                onMarkAsCalled={handleMarkAsCalledWithRefresh}
                loading={pendingLoading}
              />
            </TabsContent>

            <TabsContent value="called" className="space-y-6 mt-4">
              <CalledStudentsTable 
                requests={calledStudents}
                loading={calledLoading}
                onStatusChange={() => {
                  refetchCalled();
                  refetchPending();
                }}
              />
            </TabsContent>

            <TabsContent value="self-checkout" className="space-y-6 mt-4">
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
