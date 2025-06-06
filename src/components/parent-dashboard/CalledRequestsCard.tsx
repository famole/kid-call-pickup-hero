
import React from 'react';
import { PickupRequest, Child } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Car } from 'lucide-react';

interface CalledRequestsCardProps {
  calledRequests: PickupRequest[];
  children: Child[];
}

const CalledRequestsCard: React.FC<CalledRequestsCardProps> = ({
  calledRequests,
  children
}) => {
  if (calledRequests.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Car className="h-5 w-5 text-green-600 animate-bounce-twice" />
          🚗 On the Way 🎉
        </CardTitle>
        <CardDescription>
          Ready for pickup - Your ride is here! 🌟
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {calledRequests.map((request) => {
            const child = children.find(c => c.id === request.studentId);
            return (
              <div 
                key={request.id}
                className="p-3 border rounded-md flex items-center gap-3 bg-green-50 border-green-200 animate-pulse-twice hover:shadow-md transition-shadow duration-300"
              >
                <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-green-300 flex-shrink-0 animate-bounce-twice">
                  <Car className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    🎒 {child?.name || 'Unknown Child'}
                  </div>
                  <div className="text-xs text-green-600 font-semibold">
                    ✨ Ready for pickup! Head to the pickup area! 🚙
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
