
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import ViewerHeader from '@/components/viewer/ViewerHeader';
import ClassFilter from '@/components/viewer/ClassFilter';
import ClassGroup from '@/components/viewer/ClassGroup';
import NoStudents from '@/components/viewer/NoStudents';
import PendingPickupsTable from '@/components/pickup/PendingPickupsTable';
import { useCalledStudents } from '@/hooks/useCalledStudents';
import { usePickupManagement } from '@/hooks/usePickupManagement';
import { getAllClasses } from '@/services/classService';
import { startAutoCompletionProcess } from '@/services/pickup/autoCompletePickupRequests';
import { Class } from '@/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Clock, CheckCheck } from 'lucide-react';

const PickupManagement: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('all');

  // Hooks for managing pickup data
  const { childrenByClass, loading: calledLoading } = useCalledStudents(selectedClass);
  const { pendingRequests, loading: pendingLoading, markAsCalled } = usePickupManagement(selectedClass);

  // Check if user has permission to access this page
  const hasPermission = user?.role === 'admin' || user?.role === 'teacher';

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
    console.log("PickupManagement: Selected class changed to:", value);
    setSelectedClass(value);
  };

  return (
    <div className="min-h-screen flex flex-col bg-school-background">
      <ViewerHeader />
      
      <div className="container mx-auto flex-1 py-6 px-4">
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-800">Pickup Management</h2>
              <p className="text-base sm:text-lg text-muted-foreground">Manage student pickup requests and calls</p>
            </div>
            <ClassFilter 
              selectedClass={selectedClass} 
              classes={classes} 
              onChange={handleClassChange} 
            />
          </div>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending Requests
            </TabsTrigger>
            <TabsTrigger value="called" className="flex items-center gap-2">
              <CheckCheck className="h-4 w-4" />
              Currently Called
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <PendingPickupsTable 
              requests={pendingRequests}
              onMarkAsCalled={markAsCalled}
              loading={pendingLoading}
            />
          </TabsContent>

          <TabsContent value="called">
            {calledLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-school-primary mx-auto mb-4"></div>
                <p className="text-lg text-muted-foreground">Loading called students...</p>
              </div>
            ) : Object.keys(childrenByClass).length === 0 ? (
              <NoStudents />
            ) : (
              <div className="space-y-8">
                {Object.entries(childrenByClass).map(([classId, students]) => (
                  <ClassGroup key={classId} classId={classId} students={students} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        <div className="mt-8">
          <Card>
            <CardContent className="p-4">
              <h3 className="text-lg font-semibold mb-2">Pickup Management Information</h3>
              <p className="text-sm text-muted-foreground">
                Use the "Pending Requests" tab to call students for pickup. Once called, students will appear in the "Currently Called" tab 
                and will be visible to parents for 5 minutes before being automatically marked as completed.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <footer className="bg-gray-100 py-4 px-4 text-center">
        <div className="container mx-auto text-sm text-muted-foreground">
          School Pickup Management System — For Teachers and Administrators
        </div>
      </footer>
    </div>
  );
};

export default PickupManagement;
