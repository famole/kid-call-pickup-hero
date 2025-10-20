
import React, { useState } from 'react';
import { PickupRequest, Child } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Info, Loader2 } from 'lucide-react';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/context/auth/AuthProvider';
import { cancelPickupRequest } from '@/services/pickup';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

interface PendingRequestsCardProps {
  pendingRequests: PickupRequest[];
  children: Child[];
  currentParentId?: string;
  onRequestCancelled?: () => void;
}

const PendingRequestsCard: React.FC<PendingRequestsCardProps> = ({
  pendingRequests,
  children,
  currentParentId,
  onRequestCancelled
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [cancellingRequests, setCancellingRequests] = useState<Set<string>>(new Set());

  const handleCancelRequest = async (requestId: string) => {
    setCancellingRequests(prev => new Set(prev).add(requestId));
    try {
      logger.info('Starting cancel for request:', requestId);
      await cancelPickupRequest(requestId);
      logger.info('Cancel successful, calling onRequestCancelled callback');
      toast(t('dashboard.pickupRequestCancelled'));
      
      // Trigger the refetch callback with a slight delay to ensure DB has been updated
      if (onRequestCancelled) {
        logger.info('Scheduling refetch callback');
        setTimeout(() => {
          logger.info('Executing refetch callback now');
          onRequestCancelled();
        }, 500);
      } else {
        logger.warn('No onRequestCancelled callback provided!');
      }
    } catch (error) {
      logger.error('Error cancelling pickup request:', error);
      toast.error(t('dashboard.errorCancellingRequest'));
    } finally {
      setCancellingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // All requests in this component are already filtered to only show the current parent's requests
  // No additional filtering needed - all pending requests belong to the current parent

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <Card className="w-full">
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
            const isLoading = cancellingRequests.has(request.id);
            
            return (
              <div 
                key={request.id}
                className="p-3 border rounded-md flex items-center gap-3 hover:shadow-md transition-shadow duration-300 bg-orange-50 border-orange-200"
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCancelRequest(request.id)}
                  disabled={isLoading}
                  className="ml-2 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                  {t('dashboard.cancel')}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default PendingRequestsCard;
