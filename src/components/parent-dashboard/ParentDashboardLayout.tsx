
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import ParentDashboardHeader from './ParentDashboardHeader';
import ChildrenSelectionCard from './ChildrenSelectionCard';
import PendingRequestsCard from './PendingRequestsCard';
import CalledRequestsCard from './CalledRequestsCard';
import AuthorizedPickupNotification from './AuthorizedPickupNotification';
import { Child, PickupRequest } from '@/types';

interface ChildWithType extends Child {
  isAuthorized?: boolean;
}

interface ParentInfo {
  id: string;
  name: string;
}

interface ParentDashboardLayoutProps {
  children: ChildWithType[];
  activeRequests: PickupRequest[];
  selectedChildren: string[];
  isSubmitting: boolean;
  childrenWithActiveRequests: string[];
  parentInfo?: ParentInfo[];
  onToggleChildSelection: (studentId: string) => void;
  onRequestPickup: () => void;
}

const ParentDashboardLayout: React.FC<ParentDashboardLayoutProps> = ({
  children,
  activeRequests,
  selectedChildren,
  isSubmitting,
  childrenWithActiveRequests,
  parentInfo = [],
  onToggleChildSelection,
  onRequestPickup
}) => {
  const { user } = useAuth();

  // Split requests by status
  const pendingRequests = activeRequests.filter(req => req.status === 'pending');
  const calledRequests = activeRequests.filter(req => req.status === 'called');

  // Find requests that were made by authorized users (not the current parent)
  const authorizedUserRequests = activeRequests.filter(req => req.parentId !== user?.id);

  // Only show status cards if there are no authorized user requests to avoid redundancy
  const shouldShowStatusCards = authorizedUserRequests.length === 0;

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="w-full max-w-none py-4 px-4 sm:px-6 lg:px-8">
        <ParentDashboardHeader userName={user?.name} />

        <div className="w-full space-y-6">
          {/* Authorized User Pickup Notifications */}
          {authorizedUserRequests.length > 0 && (
            <AuthorizedPickupNotification 
              requests={authorizedUserRequests}
              children={children}
              parentInfo={parentInfo}
            />
          )}

          {/* Status Cards - Only show when there are no authorized notifications to avoid redundancy */}
          {shouldShowStatusCards && (pendingRequests.length > 0 || calledRequests.length > 0) && (
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
