
import React from 'react';
import { PickupRequest, Child } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Car } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';

interface CalledRequestsCardProps {
  calledRequests: PickupRequest[];
  children: Child[];
}

const CalledRequestsCard: React.FC<CalledRequestsCardProps> = ({
  calledRequests,
  children
}) => {
  const { t } = useTranslation();

  if (calledRequests.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Car className="h-5 w-5 text-green-600 animate-bounce" />
          🚗 {t('dashboard.readyForPickup', { count: calledRequests.length })}
        </CardTitle>
        <CardDescription>
          {t('dashboard.childrenReadyHeadToPickup')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {calledRequests.map((request) => {
            const child = children.find(c => c.id === request.studentId);
            return (
              <div 
                key={request.id}
                className="p-3 border rounded-md flex items-center gap-3 bg-green-50 border-green-200 animate-pulse hover:shadow-md transition-shadow duration-300"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-green-300 flex-shrink-0 animate-bounce">
                  <Car className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    🎒 {child?.name || t('common.unknownChild')}
                  </div>
                  <div className="text-xs text-green-600 font-semibold">
                    ✨ {t('dashboard.readyForPickupHeadToArea')} 🚙
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {t('dashboard.called', { time: new Date(request.requestTime).toLocaleTimeString() })}
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

export default CalledRequestsCard;
