
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth/AuthProvider';
import { School } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminTabs from '@/components/AdminTabs';
import { getActivePickupRequests, updatePickupRequestStatus } from '@/services/pickupService';
import { getStudentById } from '@/services/studentService';
import { getAllParents } from '@/services/parentService';
import { getClassById } from '@/services/classService';
import { Child, Class, PickupRequest, User } from '@/types';
import { Parent } from '@/types/parent';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Database } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

// ChildRequestItem component to fix the hook execution order problem
const ChildRequestItem = ({ request, parentsCache }) => {
  const [child, setChild] = useState<Child | null>(null);
  const [classInfo, setClassInfo] = useState<Class | null>(null);
  const [parent, setParent] = useState<User | null>(parentsCache[request.parentId] || null);
  const { toast } = useToast();
  
  // Load child and class data when component mounts
  useEffect(() => {
    const loadData = async () => {
      try {
        const childData = await getStudentById(request.childId);
        setChild(childData);
        
        if (childData?.classId) {
          try {
            const classData = await getClassById(childData.classId);
            setClassInfo(classData);
          } catch (error) {
            console.error(`Error fetching class for child ${request.childId}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error fetching details for request ${request.id}:`, error);
      }
    };
    
    loadData();
  }, [request.childId, request.id]);

  const handleCallStudent = async () => {
    try {
      const updated = await updatePickupRequestStatus(request.id, 'called');
      if (updated) {
        toast({
          title: 'Student Called',
          description: 'The student has been called for pickup.',
        });
      }
    } catch (error) {
      console.error('Error calling student:', error);
      toast({
        title: 'Error',
        description: 'Failed to call student.',
        variant: 'destructive',
      });
    }
  };

  const handleMarkCompleted = async () => {
    try {
      const updated = await updatePickupRequestStatus(request.id, 'completed');
      if (updated) {
        toast({
          title: 'Pickup Completed',
          description: 'The student pickup has been marked as completed.',
        });
      }
    } catch (error) {
      console.error('Error completing pickup:', error);
      toast({
        title: 'Error',
        description: 'Failed to mark pickup as completed.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div 
      className={`p-4 border rounded-lg flex items-center gap-4 ${
        request.status === 'called' 
          ? 'bg-green-50 border-green-200'
          : 'bg-blue-50 border-blue-200'
      }`}
    >
      <div>
        <h3 className="font-semibold text-lg">{child?.name || 'Loading...'}</h3>
        <p className="text-sm text-muted-foreground">
          Class: {classInfo?.name || 'Loading...'} • 
          Requested by: {parent?.name || 'Unknown Parent'}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Requested at: {new Date(request.requestTime).toLocaleTimeString()}
        </p>
      </div>
      <div className="ml-auto flex gap-2">
        {request.status === 'pending' ? (
          <Button 
            variant="outline" 
            className="border-school-primary text-school-primary hover:bg-school-primary/10"
            onClick={handleCallStudent}
          >
            Call Student
          </Button>
        ) : (
          <Button 
            variant="outline" 
            className="border-school-secondary text-school-secondary hover:bg-school-secondary/10"
            onClick={handleMarkCompleted}
          >
            <Check className="mr-1 h-4 w-4" /> Mark Completed
          </Button>
        )}
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const { user } = useAuth();
  const [activeRequests, setActiveRequests] = useState<PickupRequest[]>([]);
  const [studentsCache, setStudentsCache] = useState<Record<string, Child>>({});
  const [classesCache, setClassesCache] = useState<Record<string, Class>>({});
  const [parentsCache, setParentsCache] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Initial fetch
    const fetchData = async () => {
      try {
        setLoading(true);
        const requests = await getActivePickupRequests();
        setActiveRequests(requests);
        
        // Prefetch parent data for efficiency
        const parents = await getAllParents();
        const parentsMap: Record<string, User> = {};
        parents.forEach(parent => {
          // Convert Parent to User type by adding the required role property
          parentsMap[parent.id] = {
            ...parent,
            role: 'parent' // Set default role for parents
          };
        });
        setParentsCache(parentsMap);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast({
          title: "Error",
          description: "Failed to load pickup requests",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Set up refresh interval
    const interval = setInterval(async () => {
      try {
        const requests = await getActivePickupRequests();
        setActiveRequests(requests);
      } catch (error) {
        console.error('Error refreshing pickup requests:', error);
      }
    }, 3000);
    
    return () => clearInterval(interval);
  }, [toast]);

  return (
    <div className="container mx-auto py-6">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <School className="h-8 w-8 text-school-primary" />
            <h1 className="text-3xl font-bold">School Pickup Admin</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              to="/admin/setup"
              className="inline-flex items-center px-4 py-2 bg-emerald-100 text-emerald-700 rounded-md hover:bg-emerald-200 transition-colors"
            >
              <Database className="mr-2 h-4 w-4" /> Migrate Data
            </Link>
            <span className="text-muted-foreground">Logged in as {user?.name}</span>
          </div>
        </div>
      </header>

      <Tabs defaultValue="requests" className="w-full">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="requests">Pickup Requests</TabsTrigger>
          <TabsTrigger value="manage">Manage School</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Active Pickup Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-school-primary"></div>
                </div>
              ) : activeRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No active pickup requests
                </div>
              ) : (
                <div className="space-y-4">
                  {activeRequests.map((request) => (
                    <ChildRequestItem 
                      key={request.id} 
                      request={request} 
                      parentsCache={parentsCache} 
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="manage">
          <AdminTabs />
        </TabsContent>
        
        <TabsContent value="reports">
          <div className="text-center py-12 text-muted-foreground">
            Reports section coming soon
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
