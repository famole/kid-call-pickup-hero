import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createPickupRequest, getActivePickupRequestsForParent } from '@/services/pickupService';
import { getStudentsForParent } from '@/services/studentService';
import { Child, PickupRequest } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCheck, UserRound } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import ChildCard from './ChildCard';
import Logo from '@/components/Logo';

const ParentDashboard = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [activeRequests, setActiveRequests] = useState<PickupRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        try {
          setLoading(true);
          // Get children for this parent from the database
          const parentChildren = await getStudentsForParent(user.id);
          setChildren(parentChildren);

          // Check for active pickup requests
          const active = await getActivePickupRequestsForParent(user.id);
          setActiveRequests(active);
        } catch (error) {
          console.error('Error loading parent dashboard data:', error);
          toast({
            title: "Error",
            description: "Failed to load data. Please try again.",
            variant: "destructive",
          });
        } finally {
          setLoading(false);
        }
      }
    };

    loadData();

    // Set up a refresh interval (in a real app, this would be replaced with websockets)
    const interval = setInterval(async () => {
      if (user) {
        try {
          const updated = await getActivePickupRequestsForParent(user.id);
          setActiveRequests(updated);
        } catch (error) {
          console.error('Error refreshing pickup requests:', error);
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [user, toast]);

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
      const promises = selectedChildren.map(childId => 
        createPickupRequest(childId, user.id)
      );
      await Promise.all(promises);

      toast({
        title: "Pickup Request Sent",
        description: `Your ${selectedChildren.length > 1 ? 'children are' : 'child is'} now ready for pickup.`,
      });

      // Refresh the active requests list
      const active = await getActivePickupRequestsForParent(user.id);
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
    <div className="container mx-auto py-4 sm:py-6 px-4">
      <header className="mb-6 sm:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Logo size="sm" className="text-school-primary" />
          <h1 className="text-2xl sm:text-3xl font-bold">School Pickup</h1>
        </div>
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-base sm:text-lg text-gray-600">Welcome, {user?.name}</p>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-school-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Select Children for Pickup</CardTitle>
                <CardDescription>
                  Choose which children to pick up today
                </CardDescription>
              </CardHeader>
              <CardContent>
                {children.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    No children found in your account
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                
                <div className="mt-4 sm:mt-6">
                  <Button 
                    className="w-full bg-school-secondary hover:bg-school-secondary/90"
                    disabled={isSubmitting || selectedChildren.length === 0 || hasActiveRequests}
                    onClick={handleRequestPickup}
                  >
                    {isSubmitting ? 'Processing...' : selectedChildren.length > 0 ? 'Request Immediate Pickup' : 'Select Children First'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Ready for Pickup</CardTitle>
                <CardDescription>
                  Children currently ready for pickup
                </CardDescription>
              </CardHeader>
              <CardContent>
                {activeRequests.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-muted-foreground">
                    No active pickup requests
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {activeRequests.map((request) => {
                      const child = children.find(c => c.id === request.childId);
                      return (
                        <div 
                          key={request.id}
                          className="p-3 border rounded-md flex items-center gap-3 bg-green-50 border-green-200 call-animation"
                        >
                          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border">
                            <UserRound className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{child?.name || 'Unknown Child'}</div>
                            <div className="text-sm text-muted-foreground">
                              <span className="flex items-center gap-1 text-green-600">
                                <CheckCheck className="h-3 w-3" /> Ready for pickup!
                              </span>
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
      )}
    </div>
  );
};

export default ParentDashboard;
