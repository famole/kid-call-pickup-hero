
import React from 'react';
import { PickupRequest, Child } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Info } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { logger } from '@/utils/logger';

interface ChildWithType extends Child {
  isAuthorized?: boolean;
}

interface ParentInfo {
  id: string;
  name: string;
}

interface AuthorizedPickupNotificationProps {
  requests: PickupRequest[];
  children: ChildWithType[];
  parentInfo?: ParentInfo[];
}

const AuthorizedPickupNotification: React.FC<AuthorizedPickupNotificationProps> = ({
  requests,
  children,
  parentInfo = []
}) => {
  const { t } = useTranslation();

  // Debug logging to see what's being passed to the component
  logger.info('🔍 AuthorizedPickupNotification received:', {
    requestsCount: requests.length,
    requests: requests.map(r => ({
      id: r.id,
      studentId: r.studentId,
      parentId: r.parentId
    }))
  });

  if (requests.length === 0) {
    logger.info('🔍 AuthorizedPickupNotification: Not rendering (no requests)');
    return null;
  }

  logger.info('🔍 AuthorizedPickupNotification: RENDERING with', requests.length, 'requests');

  return (
    <Card className="w-full md:w-[90%] mx-auto border-blue-200 bg-blue-50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
          <Users className="h-5 w-5" />
          🔔 {t('dashboard.authorizedPickupNotifications')}
        </CardTitle>
        <CardDescription className="text-blue-700">
          {t('dashboard.someoneAuthorizedRequested')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {requests.map((request) => {
            const child = children.find(c => c.id === request.studentId);
            const requester = parentInfo.find(p => p.id === request.parentId);
            const statusColor = request.status === 'pending' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-green-100 text-green-800 border-green-200';
            const statusText = request.status === 'pending' ? `⏳ ${t('dashboard.pending')}` : `🚗 ${t('dashboard.calledForPickup')}`;
            
            return (
              <div 
                key={request.id}
                className="p-4 border rounded-lg bg-white border-blue-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center border border-blue-300 flex-shrink-0">
                      <Info className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">
                        {child?.name || t('common.unknownChild')}
                      </div>
                      <div className="text-xs text-blue-600">
                        📋 {t('dashboard.pickupRequestedBy', { name: requester?.name || 'authorized user' })}
                      </div>
                    </div>
                  </div>
                  <Badge className={statusColor}>
                    {statusText}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 ml-13">
                  🕐 {t('dashboard.requestedAt', { time: new Date(request.requestTime).toLocaleTimeString() })}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-xs text-blue-800">
            💡 <strong>{t('common.info')}:</strong> {t('dashboard.noteAuthorizedPickup')}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthorizedPickupNotification;
