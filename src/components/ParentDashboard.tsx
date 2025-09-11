
import React from 'react';
import { useOptimizedParentDashboard } from '@/hooks/useOptimizedParentDashboard';
import { useParentSelfCheckout } from '@/hooks/useParentSelfCheckout';
import { useAuth } from '@/context/auth/AuthProvider';
import { useTranslation } from '@/hooks/useTranslation';
import ParentDashboardHeader from '@/components/parent-dashboard/ParentDashboardHeader';
import ChildrenSelectionCard from '@/components/parent-dashboard/ChildrenSelectionCard';
import PendingRequestsCard from '@/components/parent-dashboard/PendingRequestsCard';
import CalledRequestsCard from '@/components/parent-dashboard/CalledRequestsCard';

import SelfCheckoutStatusCard from '@/components/parent-dashboard/SelfCheckoutStatusCard';

const ParentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const {
    children,
    pendingRequests,
    calledRequests,
    authorizedRequests,
    parentInfo,
    loading,
    selectedChildren,
    isSubmitting,
    currentParentId,
    toggleChildSelection,
    handleRequestPickup,
    refetch
  } = useOptimizedParentDashboard();

  const {
    selfCheckoutStudents,
    loading: selfCheckoutLoading
  } = useParentSelfCheckout();


  // Get children with active requests to disable selection
  const childrenWithActiveRequests = [
    ...pendingRequests.map(req => req.studentId),
    ...calledRequests.map(req => req.studentId)
  ];


  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="space-y-3 sm:space-y-4">
          <ParentDashboardHeader userName={user?.name} />
          

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Status Components First - Left side for larger screens */}
            <div className="lg:col-span-1 space-y-3 sm:space-y-4 lg:order-2">
              <PendingRequestsCard 
                pendingRequests={pendingRequests} 
                children={children}
                currentParentId={currentParentId}
                onRequestCancelled={refetch}
              />
              <CalledRequestsCard 
                calledRequests={calledRequests} 
                children={children}
                currentParentId={currentParentId}
              />
              {(selfCheckoutStudents.length > 0 || selfCheckoutLoading) && (
                <SelfCheckoutStatusCard
                  selfCheckoutStudents={selfCheckoutStudents}
                  loading={selfCheckoutLoading}
                />
              )}
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
