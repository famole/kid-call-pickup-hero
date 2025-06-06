
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import ParentDashboardHeader from './ParentDashboardHeader';
import ChildrenSelectionCard from './ChildrenSelectionCard';
import PendingRequestsCard from './PendingRequestsCard';
import CalledRequestsCard from './CalledRequestsCard';
import { Child, PickupRequest } from '@/types';

interface ChildWithType extends Child {
  isAuthorized?: boolean;
}

interface ParentDashboardLayoutProps {
  children: ChildWithType[];
  activeRequests: PickupRequest[];
  selectedChildren: string[];
  isSubmitting: boolean;
  childrenWithActiveRequests: string[];
  onToggleChildSelection: (studentId: string) => void;
  onRequestPickup: () => void;
}

const ParentDashboardLayout: React.FC<ParentDashboardLayoutProps> = ({
  children,
  activeRequests,
  selectedChildren,
  isSubmitting,
  childrenWithActiveRequests,
  onToggleChildSelection,
  onRequestPickup
}) => {
  const { user } = useAuth();

  // Split requests by status
  const pendingRequests = activeRequests.filter(req => req.status === 'pending');
  const calledRequests = activeRequests.filter(req => req.status === 'called');

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="w-full max-w-none py-4 px-4 sm:px-6 lg:px-8">
        <ParentDashboardHeader userName={user?.name} />

        <div className="w-full space-y-6">
          {/* Status Cards - Only show when there's data */}
          {(pendingRequests.length > 0 || calledRequests.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
              {pendingRequests.length > 0 && (
                <PendingRequestsCard 
                  pendingRequests={pendingRequests}
                  children={children}
                />
              )}
              {calledRequests.length > 0 && (
                <CalledRequestsCard 
                  calledRequests={calledRequests}
                  children={children}
                />
              )}
            </div>
          )}

          {/* Main Selection Card */}
          <div className="w-full">
            <ChildrenSelectionCard
              children={children}
              selectedChildren={selectedChildren}
              childrenWithActiveRequests={childrenWithActiveRequests}
              isSubmitting={isSubmitting}
              onToggleChildSelection={onToggleChildSelection}
              onRequestPickup={onRequestPickup}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboardLayout;
