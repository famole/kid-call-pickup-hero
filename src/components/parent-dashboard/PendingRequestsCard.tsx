
import React from 'react';
import { PickupRequest, Child } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface PendingRequestsCardProps {
  pendingRequests: PickupRequest[];
  children: Child[];
}

const PendingRequestsCard: React.FC<PendingRequestsCardProps> = ({
  pendingRequests,
  children
}) => {
  const { t } = useTranslation();

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <Card className="w-full md:w-[90%] mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-600" />
          ⏳ {t('dashboard.inQueue', { count: pendingRequests.length })}
        </CardTitle>
        <CardDescription>
          {t('dashboard.pickupRequestsBeingProcessed')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {pendingRequests.map((request) => {
            const child = children.find(c => c.id === request.studentId);
            return (
              <div 
                key={request.id}
                className="p-3 border rounded-md flex items-center gap-3 bg-orange-50 border-orange-200 hover:shadow-md transition-shadow duration-300"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-orange-300 flex-shrink-0">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    📚 {child?.name || t('common.unknownChild')}
                  </div>
                  <div className="text-xs text-orange-600 font-medium">
                    ⏱️ {t('dashboard.waitingInPickupQueue')}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t('dashboard.requested', { time: new Date(request.requestTime).toLocaleTimeString() })}
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
