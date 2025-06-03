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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-4 px-4 max-w-7xl">
        <header className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="flex items-center gap-3">
              <Logo size="sm" className="text-school-primary" />
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">School Pickup</h1>
            </div>
            <div className="sm:ml-auto">
              <p className="text-sm sm:text-base text-gray-600">Welcome, {user?.name}</p>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-school-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Main Selection Card */}
            <div className="xl:col-span-2">
              <Card className="h-fit">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg sm:text-xl">Select Children for Pickup</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Choose which children to pick up today
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {children.length === 0 ? (
                    <div className="text-center py-8 sm:py-12 text-muted-foreground">
                      <UserRound className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-base sm:text-lg">No children found in your account</p>
                    </div>
                  ) : (
                    <>
                      {/* Selected children count */}
                      {selectedChildren.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                          <p className="text-sm font-medium text-blue-800">
                            {selectedChildren.length} child{selectedChildren.length > 1 ? 'ren' : ''} selected for pickup
                          </p>
                        </div>
                      )}
                      
                      {/* Children grid - responsive */}
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
                    </>
                  )}
                  
                  {/* Action button */}
                  <div className="pt-4 border-t">
                    <Button 
                      className="w-full h-12 text-base font-medium bg-school-secondary hover:bg-school-secondary/90 disabled:opacity-50"
                      disabled={isSubmitting || selectedChildren.length === 0 || hasActiveRequests}
                      onClick={handleRequestPickup}
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : selectedChildren.length > 0 ? (
                        `Request Pickup for ${selectedChildren.length} Child${selectedChildren.length > 1 ? 'ren' : ''}`
                      ) : (
                        'Select Children First'
                      )}
                    </Button>
                    
                    {hasActiveRequests && (
                      <p className="text-xs sm:text-sm text-center text-muted-foreground mt-2">
                        You can't select more children while others are ready for pickup
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Ready for Pickup Sidebar */}
            <div className="xl:col-span-1">
              <Card className="sticky top-4">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    <CheckCheck className="h-5 w-5 text-green-600" />
                    Ready for Pickup
                  </CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    Children currently called
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {activeRequests.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-muted-foreground">
                      <CheckCheck className="h-8 w-8 mx-auto mb-3 opacity-50" />
                      <p className="text-sm sm:text-base">No active pickup requests</p>
                      <p className="text-xs sm:text-sm mt-1">Select children above to request pickup</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {activeRequests.map((request) => {
                        const child = children.find(c => c.id === request.childId);
                        return (
                          <div 
                            key={request.id}
                            className="p-3 border rounded-md flex items-center gap-3 bg-green-50 border-green-200 call-animation"
                          >
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-green-300">
                              <UserRound className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm sm:text-base truncate">
                                {child?.name || 'Unknown Child'}
                              </div>
                              <div className="text-xs sm:text-sm text-green-600 flex items-center gap-1">
                                <CheckCheck className="h-3 w-3" /> 
                                Ready for pickup!
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      
                      <div className="bg-green-100 border border-green-300 rounded-lg p-3 mt-4">
                        <p className="text-xs sm:text-sm font-medium text-green-800 text-center">
                          🎉 Your child{activeRequests.length > 1 ? 'ren are' : ' is'} ready! 
                          Please proceed to the pickup area.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;
