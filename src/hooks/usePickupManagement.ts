
import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getActivePickupRequests, updatePickupRequestStatus } from '@/services/pickup';
import { getStudentById } from '@/services/studentService';
import { getClassById } from '@/services/classService';
import { getParentById } from '@/services/parentService';
import { PickupRequestWithDetails } from '@/types/supabase';
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/utils/logger';

export const usePickupManagement = (classId?: string) => {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);

  const { data: pendingRequests = [], isLoading: loading } = useQuery({
    queryKey: ['pickup-management', classId],
    queryFn: async (): Promise<PickupRequestWithDetails[]> => {
      logger.info('Fetching pending pickup requests...');
      const activeRequests = await getActivePickupRequests();
      const pendingOnly = activeRequests.filter(req => req.status === 'pending');
      logger.info(`Found ${pendingOnly.length} pending requests`);
      
      const requestsWithDetails = await Promise.all(pendingOnly.map(async (req) => {
        try {
          const student = await getStudentById(req.studentId);
          let classInfo = null;
          let parentInfo = null;
          
          if (student && student.classId) {
            try { classInfo = await getClassById(student.classId); } catch (e) { logger.error(`Error fetching class:`, e); }
          }
          if (req.parentId) {
            try { parentInfo = await getParentById(req.parentId); } catch (e) { logger.error(`Error fetching parent:`, e); }
          }
          
          return { request: req, child: student, class: classInfo, parent: parentInfo };
        } catch (error) {
          logger.error(`Error fetching details for request ${req.id}:`, error);
          return { request: req, child: null, class: null, parent: null };
        }
      }));

      let filteredRequests = requestsWithDetails;
      if (classId && classId !== 'all') {
        filteredRequests = requestsWithDetails.filter(item => 
          item.child && item.class && String(item.child.classId) === String(classId)
        );
      }

      return filteredRequests;
    },
  });

  const markAsCalled = async (requestId: string) => {
    try {
      logger.info(`Marking request ${requestId} as called`);
      
      // Optimistic update
      queryClient.setQueryData<PickupRequestWithDetails[]>(
        ['pickup-management', classId],
        prev => (prev || []).filter(req => req.request.id !== requestId)
      );
      
      await updatePickupRequestStatus(requestId, 'called');
      logger.info('Request marked as called.');
    } catch (error) {
      logger.error("Error marking request as called:", error);
      queryClient.invalidateQueries({ queryKey: ['pickup-management'] });
      throw error;
    }
  };

  // Realtime subscription
  useEffect(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    
    const channel = supabase
      .channel('pickup_requests_pending_rq')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pickup_requests' },
        () => {
          logger.info('Real-time pickup request change detected, invalidating cache');
          queryClient.invalidateQueries({ queryKey: ['pickup-management'] });
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
  }, [queryClient]);

  return {
    pendingRequests,
    loading,
    markAsCalled,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['pickup-management'] })
  };
};
