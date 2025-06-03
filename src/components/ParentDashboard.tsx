
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { createPickupRequest, getActivePickupRequestsForParent } from '@/services/pickupService';
import { getStudentsForParent } from '@/services/studentService';
import { Child, PickupRequest } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import ParentDashboardHeader from './parent-dashboard/ParentDashboardHeader';
import ChildrenSelectionCard from './parent-dashboard/ChildrenSelectionCard';
import PickupStatusSidebar from './parent-dashboard/PickupStatusSidebar';

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
        description: `Your ${selectedChildren.length > 1 ? 'children have' : 'child has'} been added to the pickup queue.`,
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

  // Check if any children have active requests (either pending or called)
  const childrenWithActiveRequests = activeRequests.map(req => req.childId);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-4 px-4 max-w-7xl">
        <ParentDashboardHeader userName={user?.name} />

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-school-primary"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Main Selection Card */}
            <div className="xl:col-span-2">
              <ChildrenSelectionCard
                children={children}
                selectedChildren={selectedChildren}
                childrenWithActiveRequests={childrenWithActiveRequests}
                isSubmitting={isSubmitting}
                onToggleChildSelection={toggleChildSelection}
                onRequestPickup={handleRequestPickup}
              />
            </div>

            {/* Status Sidebar */}
            <PickupStatusSidebar
              activeRequests={activeRequests}
              children={children}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ParentDashboard;
