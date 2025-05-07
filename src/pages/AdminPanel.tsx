import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { School } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdminTabs from '@/components/AdminTabs';
import { useState, useEffect } from 'react';
import { 
  children, 
  classes, 
  parents, 
  getActivePickupRequests, 
  updatePickupRequestStatus,
  getChildById
} from '@/services/mockData';
import { Child, Class, PickupRequest, User } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const AdminPanel = () => {
  const { user } = useAuth();
  const [activeRequests, setActiveRequests] = useState<PickupRequest[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    // Initial fetch of active requests
    setActiveRequests(getActivePickupRequests());
    
    // Set up refresh interval
    const interval = setInterval(() => {
      setActiveRequests(getActivePickupRequests());
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const handleCallStudent = (requestId: string) => {
    const updated = updatePickupRequestStatus(requestId, 'called');
    if (updated) {
      toast({
        title: 'Student Called',
        description: 'The student has been called for pickup.',
      });
      setActiveRequests(getActivePickupRequests());
    }
  };

  const handleMarkCompleted = (requestId: string) => {
    const updated = updatePickupRequestStatus(requestId, 'completed');
    if (updated) {
      toast({
        title: 'Pickup Completed',
        description: 'The student pickup has been marked as completed.',
      });
      setActiveRequests(getActivePickupRequests());
    }
  };

  return (
    <div className="container mx-auto py-6">
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <School className="h-8 w-8 text-school-primary" />
            <h1 className="text-3xl font-bold">School Pickup Admin</h1>
          </div>
          <div>
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
              {activeRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No active pickup requests
                </div>
              ) : (
                <div className="space-y-4">
                  {activeRequests.map((request) => {
                    const child = getChildById(request.childId);
                    const parent = parents.find(p => p.id === request.parentId);
                    const childClass = child ? classes.find(c => c.id === child.classId) : null;
                    
                    return (
                      <div 
                        key={request.id}
                        className={`p-4 border rounded-lg flex items-center gap-4 ${
                          request.status === 'called' 
                            ? 'bg-green-50 border-green-200'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div>
                          <h3 className="font-semibold text-lg">{child?.name || 'Unknown Child'}</h3>
                          <p className="text-sm text-muted-foreground">
                            Class: {childClass?.name || 'Unknown'} • 
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
                              onClick={() => handleCallStudent(request.id)}
                            >
                              Call Student
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              className="border-school-secondary text-school-secondary hover:bg-school-secondary/10"
                              onClick={() => handleMarkCompleted(request.id)}
                            >
                              <Check className="mr-1 h-4 w-4" /> Mark Completed
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
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
