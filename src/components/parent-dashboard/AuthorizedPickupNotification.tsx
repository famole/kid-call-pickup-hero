
import React from 'react';
import { PickupRequest, Child } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Info } from 'lucide-react';

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
  if (requests.length === 0) {
    return null;
  }

  return (
    <Card className="w-full border-blue-200 bg-blue-50">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2 text-blue-800">
          <Users className="h-5 w-5" />
          🔔 Authorized Pickup Notifications
        </CardTitle>
        <CardDescription className="text-blue-700">
          Someone authorized has requested pickup for your children
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {requests.map((request) => {
            const child = children.find(c => c.id === request.studentId);
            const requester = parentInfo.find(p => p.id === request.parentId);
            const statusColor = request.status === 'pending' ? 'bg-orange-100 text-orange-800 border-orange-200' : 'bg-green-100 text-green-800 border-green-200';
            const statusText = request.status === 'pending' ? '⏳ Pending' : '🚗 Called for Pickup';
            
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
                        {child?.name || 'Unknown Child'}
                      </div>
                      <div className="text-xs text-blue-600">
                        📋 Pickup requested by {requester?.name || 'authorized user'}
                      </div>
                    </div>
                  </div>
                  <Badge className={statusColor}>
                    {statusText}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 ml-13">
                  🕐 Requested at {new Date(request.requestTime).toLocaleTimeString()}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 p-3 bg-blue-100 rounded-lg">
          <p className="text-xs text-blue-800">
            💡 <strong>Note:</strong> These pickup requests were made by someone who is authorized to pick up your children. 
            You don't need to take any action - this is just to keep you informed.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default AuthorizedPickupNotification;
