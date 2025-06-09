
import React from 'react';
import { PickupRequest, Child } from '@/types';
import PendingRequestsCard from './PendingRequestsCard';
import CalledRequestsCard from './CalledRequestsCard';

interface PickupStatusSidebarProps {
  activeRequests: PickupRequest[];
  children: Child[];
}

const PickupStatusSidebar: React.FC<PickupStatusSidebarProps> = ({
  activeRequests,
  children
}) => {
  // Split requests by status
  const pendingRequests = activeRequests.filter(req => req.status === 'pending');
  const calledRequests = activeRequests.filter(req => req.status === 'called');

  // Don't render anything if there are no requests
  if (pendingRequests.length === 0 && calledRequests.length === 0) {
    return null;
  }

  return (
    <div className="xl:col-span-1 space-y-4">
      <PendingRequestsCard 
        pendingRequests={pendingRequests}
        children={children}
      />
      <CalledRequestsCard 
        calledRequests={calledRequests}
        children={children}
      />
    </div>
  );
};

export default PickupStatusSidebar;
