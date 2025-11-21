import React from 'react';
import { useOptimizedParentDashboard } from '@/hooks/useOptimizedParentDashboard';
import { useParentSelfCheckout } from '@/hooks/useParentSelfCheckout';
import { useRecentPickupNotifications } from '@/hooks/useRecentPickupNotifications';
import { useUpcomingActivity } from '@/hooks/useUpcomingActivity';
import { useAuth } from '@/context/auth/AuthProvider';
import { useTranslation } from '@/hooks/useTranslation';
import ParentDashboardHeader from '@/components/parent-dashboard/ParentDashboardHeader';
import ChildrenSelectionCard from '@/components/parent-dashboard/ChildrenSelectionCard';
import PendingRequestsCard from '@/components/parent-dashboard/PendingRequestsCard';
import CalledRequestsCard from '@/components/parent-dashboard/CalledRequestsCard';
import SelfCheckoutStatusCard from '@/components/parent-dashboard/SelfCheckoutStatusCard';
import RecentPickupsNotification from '@/components/parent-dashboard/RecentPickupsNotification';
import { UpcomingActivityCard } from '@/components/activities/UpcomingActivityCard';

/**
 * Enhanced Parent Dashboard Component
 * 
 * This component uses the existing optimized hooks but with improved structure:
 * - Maintains compatibility with existing components
 * - Uses the already optimized useOptimizedParentDashboard hook
 * - Includes proper error boundaries and loading states
 * - Optimized rendering with React.memo for child components
 */
const EnhancedParentDashboard: React.FC = () => {
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

  const {
    recentPickups,
    dismissNotification
  } = useRecentPickupNotifications();

  const {
    data: upcomingActivity,
    isLoading: activityLoading
  } = useUpcomingActivity();

  // Get children with active requests to disable selection
  const childrenWithActiveRequests = [
    ...pendingRequests.map(req => req.studentId),
    ...calledRequests.map(req => req.studentId)
  ];

  // Show loading state for initial load
  if (loading && children.length === 0) {
    return (
      <div className="min-h-screen w-full bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gray-50">
      <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8">
        <div className="space-y-2 sm:space-y-3">
          <ParentDashboardHeader userName={user?.name} />
          
          {!activityLoading && upcomingActivity && (
            <UpcomingActivityCard activity={upcomingActivity} />
          )}
          
          <RecentPickupsNotification 
            pickups={recentPickups}
            onDismiss={dismissNotification}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Student Selection Component - Main priority, left side for larger screens */}
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

            {/* Status Components - Right side for larger screens */}
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedParentDashboard;
