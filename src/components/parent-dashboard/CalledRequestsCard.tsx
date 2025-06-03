
import React from 'react';
import { PickupRequest, Child } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCheck, UserRound } from 'lucide-react';

interface CalledRequestsCardProps {
  calledRequests: PickupRequest[];
  children: Child[];
}

const CalledRequestsCard: React.FC<CalledRequestsCardProps> = ({
  calledRequests,
  children
}) => {
  return (
    <Card className={calledRequests.length > 0 ? "sticky top-4" : ""}>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
          <CheckCheck className="h-5 w-5 text-green-600" />
          On the Way
        </CardTitle>
        <CardDescription className="text-sm sm:text-base">
          Children ready for pickup
        </CardDescription>
      </CardHeader>
      <CardContent>
        {calledRequests.length === 0 ? (
          <div className="text-center py-6 sm:py-8 text-muted-foreground">
            <CheckCheck className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="text-sm sm:text-base">No children called yet</p>
            <p className="text-xs sm:text-sm mt-1">They will appear here when ready</p>
          </div>
        ) : (
          <div className="space-y-3">
            {calledRequests.map((request) => {
              const child = children.find(c => c.id === request.studentId);
              return (
                <div 
                  key={request.id}
                  className="p-3 border rounded-md flex items-center gap-3 bg-green-50 border-green-200 call-animation"
                >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-green-300">
                    <UserRound className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm sm:text-base truncate">
                      {child?.name || 'Unknown Child'}
                    </div>
                    <div className="text-xs sm:text-sm text-green-600 flex items-center gap-1">
                      <CheckCheck className="h-3 w-3" /> 
                      On the way!
                    </div>
                  </div>
                </div>
              );
            })}
            
            <div className="bg-green-100 border border-green-300 rounded-lg p-3 mt-4">
              <p className="text-xs sm:text-sm font-medium text-green-800 text-center">
                🎉 Your child{calledRequests.length > 1 ? 'ren are' : ' is'} on the way! 
                Please proceed to the pickup area.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CalledRequestsCard;
