
import React from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useOptimizedParentDashboard } from '@/hooks/useOptimizedParentDashboard';
import { usePickupActions } from '@/hooks/usePickupActions';
import ParentDashboardLayout from './parent-dashboard/ParentDashboardLayout';

const ParentDashboard = () => {
  const { toast } = useToast();
  const { children, activeRequests, parentInfo, loading, refetch } = useOptimizedParentDashboard();
  const { 
    selectedChildren, 
    isSubmitting, 
    toggleChildSelection, 
    handleRequestPickup 
  } = usePickupActions(refetch);

  // Check if any children have active requests (either pending or called)
  const childrenWithActiveRequests = activeRequests.map(req => req.studentId);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-school-primary"></div>
      </div>
    );
  }

  return (
    <ParentDashboardLayout
      children={children}
      activeRequests={activeRequests}
      selectedChildren={selectedChildren}
      isSubmitting={isSubmitting}
      childrenWithActiveRequests={childrenWithActiveRequests}
      parentInfo={parentInfo}
      onToggleChildSelection={toggleChildSelection}
      onRequestPickup={handleRequestPickup}
    />
  );
};

export default ParentDashboard;
