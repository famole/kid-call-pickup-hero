
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getChildrenForParent, createPickupRequest, getActivePickupRequests } from '@/services/mockData';
import { Child, PickupRequest } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCheck, School, UserRound } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ChildCard from './ChildCard';

const ParentDashboard = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [activeRequests, setActiveRequests] = useState<PickupRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      const parentChildren = getChildrenForParent(user.id);
      setChildren(parentChildren);
    }
  }, [user]);

  useEffect(() => {
    // Check for active pickup requests
    const active = getActivePickupRequests().filter(
      req => user && req.parentId === user.id
    );
    setActiveRequests(active);

    // Set up a refresh interval (in a real app, this would be replaced with websockets)
    const interval = setInterval(() => {
      const updated = getActivePickupRequests().filter(
        req => user && req.parentId === user.id
      );
      setActiveRequests(updated);
    }, 5000);

    return () => clearInterval(interval);
  }, [user]);

  const toggleChildSelection = (childId: string) => {
    setSelectedChildren(prev => 
      prev.includes(childId) 
        ? prev.filter(id => id !== childId)
        : [...prev, childId]
    );
  };

  const handleRequestPickup = async () => {
    if (!user || !selectedChildren.length) return;

    setIsSubmitting(true);
    try {
      // Create pickup requests for all selected children
      selectedChildren.forEach(childId => {
        createPickupRequest(childId, user.id);
      });

      toast({
        title: "Pickup Request Sent",
        description: `Pickup requests sent for ${selectedChildren.length} children.`,
      });

      // Refresh the active requests list
      const active = getActivePickupRequests().filter(
        req => user && req.parentId === user.id
      );
      setActiveRequests(active);
      
      // Clear the selection
      setSelectedChildren([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create pickup requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasActiveRequests = activeRequests.length > 0;

  return (
    <div className="container mx-auto py-6">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <School className="h-8 w-8 text-school-primary" />
          <h1 className="text-3xl font-bold">School Pickup</h1>
        </div>
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-lg text-gray-600">Welcome, {user?.name}</p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Select Children for Pickup</CardTitle>
              <CardDescription>
                Choose which children to pick up today
              </CardDescription>
            </CardHeader>
            <CardContent>
              {children.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No children found in your account
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {children.map((child) => (
                    <ChildCard
                      key={child.id}
                      child={child}
                      isSelected={selectedChildren.includes(child.id)}
                      isDisabled={hasActiveRequests}
                      onClick={() => !hasActiveRequests && toggleChildSelection(child.id)}
                    />
                  ))}
                </div>
              )}
              
              <div className="mt-6">
                <Button 
                  className="w-full bg-school-secondary hover:bg-school-secondary/90"
                  disabled={isSubmitting || selectedChildren.length === 0 || hasActiveRequests}
                  onClick={handleRequestPickup}
                >
                  {isSubmitting ? 'Requesting...' : 'Request Pickup'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Active Pickups</CardTitle>
              <CardDescription>
                Children currently requested for pickup
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No active pickup requests
                </div>
              ) : (
                <div className="space-y-4">
                  {activeRequests.map((request) => {
                    const child = children.find(c => c.id === request.childId);
                    return (
                      <div 
                        key={request.id}
                        className={`p-3 border rounded-md flex items-center gap-3 ${
                          request.status === 'called' 
                            ? 'bg-green-50 border-green-200 call-animation'
                            : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border">
                          <UserRound className={`h-6 w-6 ${
                            request.status === 'called' ? 'text-green-600' : 'text-blue-600'
                          }`} />
                        </div>
                        <div>
                          <div className="font-medium">{child?.name || 'Unknown Child'}</div>
                          <div className="text-sm text-muted-foreground">
                            {request.status === 'called' ? (
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCheck className="h-3 w-3" /> Ready for pickup!
                              </span>
                            ) : (
                              'Waiting to be called'
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
