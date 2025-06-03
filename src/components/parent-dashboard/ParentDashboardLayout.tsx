
import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';
import { Link } from 'react-router-dom';
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

        <div className="space-y-6">
          {/* Authorization Management Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Pickup Authorizations
              </CardTitle>
              <CardDescription>
                Manage who can pick up your children when you're not available
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                You can authorize other parents to pick up your children within specific date ranges. 
                This is useful for carpools, emergencies, or when you can't make it to pickup.
              </p>
              <Link to="/pickup-authorizations">
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  Manage Authorizations
                </Button>
              </Link>
            </CardContent>
          </Card>

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
    </div>
  );
};

export default ParentDashboardLayout;
