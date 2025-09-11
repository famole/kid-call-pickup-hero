
import React from 'react';
import { PickupRequest, Child } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Car, Info } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/context/auth/AuthProvider';

interface CalledRequestsCardProps {
  calledRequests: PickupRequest[];
  children: Child[];
  currentParentId?: string;
}

const CalledRequestsCard: React.FC<CalledRequestsCardProps> = ({
  calledRequests,
  children,
  currentParentId
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Show all called requests that affect this parent:
  // 1. Requests made by this parent
  // 2. Requests made by family members for this parent's assigned children
  const filteredRequests = calledRequests;

  if (filteredRequests.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Car className="h-5 w-5 text-green-600 animate-bounce" />
          🚗 {t('dashboard.readyForPickup', { count: filteredRequests.length })}
        </CardTitle>
        <CardDescription>
          {filteredRequests.some(req => currentParentId && req.parentId !== currentParentId) ? (
            <>
              {t('dashboard.childrenReadyHeadToPickup')}
              <br />
              <span className="text-xs text-blue-600 mt-1 block">
                ℹ️ {t('dashboard.noteAuthorizedPickup')}
              </span>
            </>
          ) : (
            t('dashboard.childrenReadyHeadToPickup')
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {filteredRequests.map((request) => {
            const child = children.find(c => c.id === request.studentId);
            const isRequestedByOtherParent = currentParentId && request.parentId !== currentParentId;
            
            return (
              <div 
                key={request.id}
                className={`p-3 border rounded-md flex items-center gap-3 hover:shadow-md transition-shadow duration-300 ${
                  isRequestedByOtherParent 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-green-50 border-green-200 animate-pulse'
                }`}
              >
                <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center border flex-shrink-0 ${
                  isRequestedByOtherParent 
                    ? 'border-blue-300' 
                    : 'border-green-300 animate-bounce'
                }`}>
                  {isRequestedByOtherParent ? (
                    <Info className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Car className="h-5 w-5 text-green-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    🎒 {child?.name || t('common.unknownChild')}
                  </div>
                  {isRequestedByOtherParent ? (
                    <>
                      <div className="text-xs text-blue-600 font-medium">
                        ℹ️ {t('dashboard.pickupRequestedBy', { name: request.requestingParent?.name || 'Desconocido' })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {t('dashboard.called', { time: new Date(request.requestTime).toLocaleTimeString() })}
                      </div>
                      <div className="text-xs text-blue-500 font-medium mt-1">
                        🛈 {t('dashboard.authorizedPickup')} - {t('dashboard.calledForPickup')}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs text-green-600 font-semibold">
                        ✨ {t('dashboard.readyForPickupHeadToArea')} 🚙
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {t('dashboard.called', { time: new Date(request.requestTime).toLocaleTimeString() })}
                      </div>
                    </>
                  )}
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
