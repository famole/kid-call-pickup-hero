
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, School, UserRound } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const AdminPanel = () => {
  const { user } = useAuth();
  const [activeRequests, setActiveRequests] = useState<PickupRequest[]>([]);
  const [activeTab, setActiveTab] = useState('requests');
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

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="requests">Pickup Requests</TabsTrigger>
          <TabsTrigger value="students">Students</TabsTrigger>
          <TabsTrigger value="classes">Classes</TabsTrigger>
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
        
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Students</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {children.map((child) => {
                  const childClass = classes.find(c => c.id === child.classId);
                  const childParents = parents.filter(p => child.parentIds.includes(p.id));
                  
                  return (
                    <Card key={child.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                            <UserRound className="h-5 w-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-semibold">{child.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {childClass?.name || 'No Class'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-sm">
                          <strong className="block mb-1">Parents:</strong>
                          {childParents.length > 0 ? (
                            <ul className="list-disc list-inside text-muted-foreground">
                              {childParents.map(parent => (
                                <li key={parent.id}>{parent.name}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground">No parents assigned</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="classes">
          <Card>
            <CardHeader>
              <CardTitle>Classes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classes.map((cls) => {
                  const classChildren = children.filter(child => child.classId === cls.id);
                  
                  return (
                    <Card key={cls.id}>
                      <CardContent className="p-4">
                        <h3 className="font-semibold text-lg mb-1">{cls.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">
                          {cls.grade} • Teacher: {cls.teacher}
                        </p>
                        
                        <div className="text-sm">
                          <strong className="block mb-1">Students ({classChildren.length}):</strong>
                          {classChildren.length > 0 ? (
                            <ul className="list-disc list-inside text-muted-foreground">
                              {classChildren.map(child => (
                                <li key={child.id}>{child.name}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-muted-foreground">No students in this class</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminPanel;
