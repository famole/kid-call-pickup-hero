
import React from 'react';
import { PickupRequest, Child } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface PendingRequestsCardProps {
  pendingRequests: PickupRequest[];
  children: Child[];
}

const PendingRequestsCard: React.FC<PendingRequestsCardProps> = ({
  pendingRequests,
  children
}) => {
  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-600" />
          In Queue
        </CardTitle>
        <CardDescription>
          Waiting to be called
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingRequests.map((request) => {
            const child = children.find(c => c.id === request.studentId);
            return (
              <div 
                key={request.id}
                className="p-3 border rounded-md flex items-center gap-3 bg-orange-50 border-orange-200"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-orange-300 flex-shrink-0">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {child?.name || 'Unknown Child'}
                  </div>
                  <div className="text-xs text-orange-600">
                    In pickup queue
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingRequestsCard;
