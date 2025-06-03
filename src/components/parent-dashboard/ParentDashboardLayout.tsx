
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-4 px-4 max-w-7xl">
        <ParentDashboardHeader userName={user?.name} />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Selection Card */}
          <div className="xl:col-span-2">
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
          <PickupStatusSidebar
            activeRequests={activeRequests}
            children={children}
          />
        </div>
      </div>
    </div>
  );
};

export default ParentDashboardLayout;
