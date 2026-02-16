
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPickupRequestsWithDetailsBatch } from '@/services/pickup/optimizedPickupQueries';
import { updatePickupRequestStatus } from '@/services/pickup';
import { cancelPickupRequest } from '@/services/pickup/cancelPickupRequest';
import { PickupRequestWithDetails } from '@/types/supabase';
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/utils/logger';

export const useOptimizedPickupManagement = (classId?: string, teacherClassIds?: string[]) => {
  const queryClient = useQueryClient();
  const [cancellingRequests, setCancellingRequests] = useState<Set<string>>(new Set());
  const subscriptionRef = useRef<any>(null);

  const { data: pendingRequests = [], isLoading: loading } = useQuery({
    queryKey: ['pending-pickup-requests', classId, teacherClassIds],
    queryFn: async (): Promise<PickupRequestWithDetails[]> => {
      logger.info('Fetching optimized pending requests with teacherClassIds:', teacherClassIds);
      const allRequests = await getPickupRequestsWithDetailsBatch(['pending'], teacherClassIds);
      
      let filteredRequests = allRequests;
      if (classId && classId !== 'all' && !teacherClassIds) {
        filteredRequests = allRequests.filter(item => 
          item.child && item.class && String(item.child.classId) === String(classId)
        );
      }

      logger.info(`Found ${filteredRequests.length} pending requests after filtering`);
      return filteredRequests;
    },
    enabled: classId !== null,
    refetchInterval: 20000,
  });

  const markAsCalled = async (requestId: string) => {
    try {
      logger.info(`Optimized: Marking request ${requestId} as called`);
      
      // Optimistic update
      queryClient.setQueryData<PickupRequestWithDetails[]>(
        ['pending-pickup-requests', classId, teacherClassIds],
        prev => (prev || []).filter(req => req.request.id !== requestId)
      );
      
      await updatePickupRequestStatus(requestId, 'called');
      logger.info('Request marked as called successfully');
      
      // Invalidate both pending and called queries
      queryClient.invalidateQueries({ queryKey: ['called-students'] });
    } catch (error) {
      logger.error("Error marking request as called:", error);
      queryClient.invalidateQueries({ queryKey: ['pending-pickup-requests'] });
      throw error;
    }
  };

  const cancelRequest = async (requestId: string) => {
    if (cancellingRequests.has(requestId)) return;

    setCancellingRequests(prev => new Set(prev).add(requestId));
    
    try {
      // Optimistic update
      queryClient.setQueryData<PickupRequestWithDetails[]>(
        ['pending-pickup-requests', classId, teacherClassIds],
        prev => (prev || []).filter(req => req.request.id !== requestId)
      );
      
      await cancelPickupRequest(requestId);
      logger.info('Request cancelled successfully');
    } catch (error) {
      logger.error("Error cancelling request:", error);
      queryClient.invalidateQueries({ queryKey: ['pending-pickup-requests'] });
      throw error;
    } finally {
      setCancellingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  // Realtime subscription
  useEffect(() => {
    if (classId === null) return;

    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channel = supabase
      .channel(`pickup_requests_optimized_rq_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pickup_requests' },
        async (payload) => {
          logger.info('Optimized real-time pickup request change:', payload.eventType);
          
          if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
            queryClient.invalidateQueries({ queryKey: ['pending-pickup-requests'] });
          } else if (payload.eventType === 'UPDATE') {
            const oldStatus = payload.old?.status;
            const newStatus = payload.new?.status;
            if ((oldStatus === 'pending' && newStatus !== 'pending') || 
                (newStatus === 'pending' && oldStatus !== 'pending')) {
              queryClient.invalidateQueries({ queryKey: ['pending-pickup-requests'] });
            }
          } else if (payload.eventType === 'DELETE') {
            queryClient.invalidateQueries({ queryKey: ['pending-pickup-requests'] });
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [classId, queryClient]);

  return {
    pendingRequests,
    loading,
    cancellingRequests,
    markAsCalled,
    cancelRequest,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['pending-pickup-requests'] })
  };
};
