
import React, { useState } from 'react';
import { useOptimizedParentDashboard } from '@/hooks/useOptimizedParentDashboard';
import ParentDashboardHeader from '@/components/parent-dashboard/ParentDashboardHeader';
import ChildrenSelectionCard from '@/components/parent-dashboard/ChildrenSelectionCard';
import PendingRequestsCard from '@/components/parent-dashboard/PendingRequestsCard';
import CalledRequestsCard from '@/components/parent-dashboard/CalledRequestsCard';
import AuthorizedPickupNotification from '@/components/parent-dashboard/AuthorizedPickupNotification';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogOut, Car } from 'lucide-react';
import { Link } from 'react-router-dom';

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

          {/* Quick Actions Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LogOut className="h-5 w-5 text-blue-600" />
                  Self-Checkout Authorization
                </CardTitle>
                <CardDescription className="text-sm">
                  Allow your children to leave school independently
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/self-checkout">
                  <Button className="w-full" variant="outline">
                    Manage Self-Checkout
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Car className="h-5 w-5 text-green-600" />
                  Pickup Authorizations
                </CardTitle>
                <CardDescription className="text-sm">
                  Authorize others to pick up your children
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/pickup-authorization">
                  <Button className="w-full" variant="outline">
                    Manage Authorizations
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2 space-y-4 sm:space-y-6">
              <ChildrenSelectionCard
                children={children}
                selectedChildren={selectedChildren}
                childrenWithActiveRequests={childrenWithActiveRequests}
                isSubmitting={isSubmitting}
                onToggleChildSelection={toggleChildSelection}
                onRequestPickup={handleRequestPickup}
              />
            </div>
            
            <div className="space-y-4 sm:space-y-6">
              <PendingRequestsCard 
                pendingRequests={pendingRequests} 
                children={children}
              />
              <CalledRequestsCard 
                calledRequests={calledRequests} 
                children={children}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentDashboard;
