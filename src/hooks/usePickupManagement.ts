
import { useState, useEffect, useCallback, useRef } from 'react';
import { getActivePickupRequests, updatePickupRequestStatus } from '@/services/pickup';
import { getStudentById } from '@/services/studentService';
import { getClassById } from '@/services/classService';
import { getParentById } from '@/services/parentService';
import { PickupRequestWithDetails } from '@/types/supabase';
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/utils/logger'

export const usePickupManagement = (classId?: string) => {
  const [pendingRequests, setPendingRequests] = useState<PickupRequestWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const subscriptionRef = useRef<any>(null);

  const fetchPendingRequests = useCallback(async () => {
    setLoading(true);
    try {
      logger.info('Fetching pending pickup requests...');
      
      const activeRequests = await getActivePickupRequests();
      const pendingOnly = activeRequests.filter(req => req.status === 'pending');
      
      logger.info(`Found ${pendingOnly.length} pending requests`);
      
      const requestsWithDetails = await Promise.all(pendingOnly.map(async (req) => {
        try {
          logger.info(`Fetching details for request ${req.id}`);
          const student = await getStudentById(req.studentId);
          let classInfo = null;
          let parentInfo = null;
          
          if (student && student.classId) {
            try {
              classInfo = await getClassById(student.classId);
            } catch (classError) {
              logger.error(`Error fetching class ${student.classId}:`, classError);
            }
          }

          // Fetch parent information
          if (req.parentId) {
            try {
              parentInfo = await getParentById(req.parentId);
            } catch (parentError) {
              logger.error(`Error fetching parent ${req.parentId}:`, parentError);
            }
          }
          
          return {
            request: req,
            child: student,
            class: classInfo,
            parent: parentInfo
          };
        } catch (error) {
          logger.error(`Error fetching details for request ${req.id}:`, error);
          return {
            request: req,
            child: null,
            class: null,
            parent: null
          };
        }
      }));

      let filteredRequests = requestsWithDetails;
      if (classId && classId !== 'all') {
        filteredRequests = requestsWithDetails.filter(item => 
          item.child && item.class && String(item.child.classId) === String(classId)
        );
      }

      setPendingRequests(filteredRequests);
    } catch (error) {
      logger.error("Error fetching pending requests:", error);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  const markAsCalled = async (requestId: string) => {
    try {
      logger.info(`Marking request ${requestId} as called`);
      
      // Optimistically remove from pending requests immediately
      setPendingRequests(prev => prev.filter(req => req.request.id !== requestId));
      
      await updatePickupRequestStatus(requestId, 'called');
      
      logger.info('Request marked as called. Server will auto-complete after 5 minutes.');
      
      // Force refresh to ensure consistency
      setTimeout(() => {
        fetchPendingRequests();
      }, 100);
      
    } catch (error) {
      logger.error("Error marking request as called:", error);
      // Refresh on error to get correct state
      await fetchPendingRequests();
      throw error;
    }
  };

  useEffect(() => {
    fetchPendingRequests();
    
    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    
    // Set up realtime subscription for pickup_requests table
    const channel = supabase
      .channel('pickup_requests_pending_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests'
        },
        async (payload) => {
          logger.info('Real-time pickup request change detected:', payload.eventType, payload);
          
          // Force refresh after any change to ensure consistency
          fetchPendingRequests();
        }
      )
      .subscribe((status) => {
        logger.info('Pickup management subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      logger.info('Cleaning up pickup management subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [fetchPendingRequests]);

  return {
    pendingRequests,
    loading,
    markAsCalled,
    refetch: fetchPendingRequests
  };
};
