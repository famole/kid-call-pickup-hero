
import React from 'react';
import { PickupRequest, Child } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Info } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/context/AuthContext';

interface PendingRequestsCardProps {
  pendingRequests: PickupRequest[];
  children: Child[];
  currentParentId?: string;
}

const PendingRequestsCard: React.FC<PendingRequestsCardProps> = ({
  pendingRequests,
  children,
  currentParentId
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Filter requests based on user role
  const filteredRequests = user?.role === 'family' || user?.role === 'other'
    ? pendingRequests.filter(req => req.parentId === currentParentId)
    : pendingRequests;

  if (filteredRequests.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-600" />
          ⏳ {t('dashboard.inQueue', { count: filteredRequests.length })}
        </CardTitle>
        <CardDescription>
          {filteredRequests.some(req => currentParentId && req.parentId !== currentParentId) ? (
            <>
              {t('dashboard.authorizedPickupRequestsBeingProcessed')}
              <br />
              <span className="text-xs text-blue-600 mt-1 block">
                ℹ️ {t('dashboard.noteAuthorizedPickup')}
              </span>
            </>
          ) : (
            t('dashboard.pickupRequestsBeingProcessed')
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
                    : 'bg-orange-50 border-orange-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center border flex-shrink-0 ${
                  isRequestedByOtherParent 
                    ? 'border-blue-300' 
                    : 'border-orange-300'
                }`}>
                  {isRequestedByOtherParent ? (
                    <Info className="h-5 w-5 text-blue-600" />
                  ) : (
                    <Clock className="h-5 w-5 text-orange-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    📚 {child?.name || t('common.unknownChild')}
                  </div>
                  {isRequestedByOtherParent ? (
                    <>
                      <div className="text-xs text-blue-600 font-medium">
                        ℹ️ {t('dashboard.pickupRequestedBy', { name: request.requestingParent?.name || 'Desconocido' })}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {t('dashboard.requestedAt', { time: new Date(request.requestTime).toLocaleTimeString() })}
                      </div>
                      <div className="text-xs text-blue-500 font-medium mt-1">
                        🛈 {t('dashboard.authorizedPickup')} - {t('dashboard.pending')}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-xs text-orange-600 font-medium">
                        ⏱️ {t('dashboard.waitingInPickupQueue')}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {t('dashboard.requested', { time: new Date(request.requestTime).toLocaleTimeString() })}
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

export default PendingRequestsCard;
