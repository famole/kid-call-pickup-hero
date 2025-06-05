
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import ParentDashboardHeader from './ParentDashboardHeader';
import ChildrenSelectionCard from './ChildrenSelectionCard';
import PickupStatusSidebar from './PickupStatusSidebar';
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

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="w-full max-w-none py-4 px-4 sm:px-6 lg:px-8">
        <ParentDashboardHeader userName={user?.name} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
          {/* Main Selection Card */}
          <div className="xl:col-span-2 w-full">
            <ChildrenSelectionCard
              children={children}
              selectedChildren={selectedChildren}
              childrenWithActiveRequests={childrenWithActiveRequests}
              isSubmitting={isSubmitting}
              onToggleChildSelection={onToggleChildSelection}
              onRequestPickup={onRequestPickup}
            />
          </div>

          {/* Status Sidebar */}
          <div className="w-full">
            <PickupStatusSidebar
              activeRequests={activeRequests}
              children={children}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboardLayout;
