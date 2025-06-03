
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import PickupRequestItem from './PickupRequestItem';
import { PickupRequest, User } from '@/types';

interface PickupRequestsTabProps {
  activeRequests: PickupRequest[];
  parentsCache: Record<string, User>;
  loading: boolean;
}

const PickupRequestsTab: React.FC<PickupRequestsTabProps> = ({ 
  activeRequests, 
  parentsCache, 
  loading 
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Active Pickup Requests</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-school-primary"></div>
          </div>
        ) : activeRequests.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            No active pickup requests
          </div>
        ) : (
          <div className="space-y-4">
            {activeRequests.map((request) => (
              <PickupRequestItem 
                key={request.id} 
                request={request} 
                parentsCache={parentsCache} 
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PickupRequestsTab;
