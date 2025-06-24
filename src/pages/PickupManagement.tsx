
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
import { startAutoCompletionProcess } from '@/services/pickup/autoCompletePickupRequests';
import { Class } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCheck, LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface PickupManagementProps {
  showNavigation?: boolean;
}

const PickupManagement: React.FC<PickupManagementProps> = ({ showNavigation = true }) => {
  const { user, loading: authLoading } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');

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
        const classData = await getAllClasses();
        setClasses(classData);
      } catch (error) {
        console.error('Error fetching classes:', error);
      }
    };
    
    fetchClasses();
    
    // Start the auto-completion process
    const stopAutoCompletion = startAutoCompletionProcess();
    
    // Cleanup on unmount
    return stopAutoCompletion;
  }, []);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-school-primary mx-auto mb-4"></div>
          <p className="text-xl">Loading...</p>
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
            <div className="flex flex-col space-y-4 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Pickup Management</h2>
                <p className="text-base sm:text-lg text-muted-foreground">Manage student pickup requests, calls, and self-checkout authorizations</p>
              </div>
              {classes.length > 0 ? (
                <ClassFilter 
                  selectedClass={selectedClass} 
                  classes={classes} 
                  onChange={handleClassChange} 
                />
              ) : (
                <Skeleton className="h-10 w-48" />
              )}
            </div>
          </div>

          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Pending Requests ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="called" className="flex items-center gap-2">
                <CheckCheck className="h-4 w-4" />
                Currently Called ({calledStudents.length})
              </TabsTrigger>
              <TabsTrigger value="self-checkout" className="flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Self-Checkout ({authorizations.length})
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
                <h3 className="text-lg font-semibold mb-2">Pickup Management Information</h3>
                <p className="text-sm text-muted-foreground">
                  Use the "Pending Requests" tab to call students for pickup. Once called, students will appear in the "Currently Called" tab 
                  and will be visible to parents for 5 minutes before being automatically marked as completed. The "Self-Checkout" tab shows 
                  students who are authorized to leave school independently.
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
