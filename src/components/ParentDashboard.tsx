
import React, { useState } from 'react';
import { useOptimizedParentDashboard } from '@/hooks/useOptimizedParentDashboard';
import ParentDashboardHeader from '@/components/parent-dashboard/ParentDashboardHeader';
import ChildrenSelectionCard from '@/components/parent-dashboard/ChildrenSelectionCard';
import PendingRequestsCard from '@/components/parent-dashboard/PendingRequestsCard';
import CalledRequestsCard from '@/components/parent-dashboard/CalledRequestsCard';
import AuthorizedPickupNotification from '@/components/parent-dashboard/AuthorizedPickupNotification';

const ParentDashboard: React.FC = () => {
  const {
    children,
    pendingRequests,
    calledRequests,
    authorizedRequests,
    parentInfo,
    loading,
    selectedChildren,
    setSelectedChildren,
    isSubmitting,
    toggleChildSelection,
    handleRequestPickup
  } = useOptimizedParentDashboard();

  // Get children with active requests to disable selection
  const childrenWithActiveRequests = [
    ...pendingRequests.map(req => req.studentId),
    ...calledRequests.map(req => req.studentId)
  ];

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-gray-50">
        <div className="w-full max-w-none py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-center items-center min-h-[400px]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-school-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="w-full max-w-none py-4 px-4 sm:px-6 lg:px-8">
        <div className="space-y-4 sm:space-y-6">
          <ParentDashboardHeader />
          
          <AuthorizedPickupNotification 
            requests={authorizedRequests}
            children={children}
            parentInfo={parentInfo}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Status Components First - Left side for larger screens */}
            <div className="lg:col-span-1 space-y-4 sm:space-y-6 lg:order-2">
              <PendingRequestsCard 
                pendingRequests={pendingRequests} 
                children={children}
              />
              <CalledRequestsCard 
                calledRequests={calledRequests} 
                children={children}
              />
            </div>
            
            {/* Student Selection Component - Right side for larger screens */}
            <div className="lg:col-span-2 lg:order-1">
              <ChildrenSelectionCard
                children={children}
                selectedChildren={selectedChildren}
                childrenWithActiveRequests={childrenWithActiveRequests}
                isSubmitting={isSubmitting}
                onToggleChildSelection={toggleChildSelection}
                onRequestPickup={handleRequestPickup}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
