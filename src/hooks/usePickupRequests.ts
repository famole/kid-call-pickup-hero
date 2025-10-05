import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { getActivePickupRequestsForParent } from '@/services/pickupService';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentParentIdCached } from '@/services/parent/getCurrentParentId';
import { PickupRequest, Child } from '@/types';
import { logger } from '@/utils/logger'

interface ChildWithType extends Child {
  isAuthorized?: boolean;
}

// Function to check if a string is a valid UUID
const isValidUUID = (id: string): boolean => {
  if (!id) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
};

export const usePickupRequests = (children: ChildWithType[]) => {
  const { user } = useAuth();
  const [activeRequests, setActiveRequests] = useState<PickupRequest[]>([]);
  const childrenIdsRef = useRef<string[]>([]);
  const currentParentIdRef = useRef<string | null>(null);

  // Keep track of children IDs for real-time filtering
  useEffect(() => {
    childrenIdsRef.current = children.map(child => child.id);
  }, [children]);

  const fetchPickupRequests = useCallback(async () => {
    if (!user) return;

    try {
      // Get current parent ID (cached)
      const parentId = await getCurrentParentIdCached();
      if (parentId) {
        currentParentIdRef.current = parentId;
      }

      // Get requests where this parent is the requester
      const parentActiveRequests = await getActivePickupRequestsForParent();
      
      // Get all child IDs that belong to this parent (both own children and authorized children)
      const ownChildIds = children
        .filter(child => !child.isAuthorized)
        .map(child => child.id);
      
      const authorizedChildIds = children
        .filter(child => child.isAuthorized)
        .map(child => child.id);
      
      const allChildIds = [...ownChildIds, ...authorizedChildIds];
      
      // Get requests for children that belong to this parent (regardless of who requested)
      const additionalRequests: PickupRequest[] = [];
      
      if (ownChildIds.length > 0) {
        const { data: ownChildRequests, error: ownChildError } = await supabase
          .from('pickup_requests')
          .select('*')
          .in('student_id', ownChildIds)
          .in('status', ['pending', 'called']);
        
        if (!ownChildError && ownChildRequests) {
          // Filter out requests with invalid IDs and map to our format
          const validOwnChildRequests = ownChildRequests
            .filter(req => isValidUUID(req.student_id) && isValidUUID(req.parent_id))
            .map(req => ({
              id: req.id,
              studentId: req.student_id,
              parentId: req.parent_id,
              requestTime: new Date(req.request_time),
              status: req.status as 'pending' | 'called' | 'completed' | 'cancelled'
            }));
          
          additionalRequests.push(...validOwnChildRequests);
        }
      }
      
      // Also check for called requests for authorized children
      if (authorizedChildIds.length > 0) {
        const { data: calledRequests, error: calledError } = await supabase
          .from('pickup_requests')
          .select('*')
          .in('student_id', authorizedChildIds)
          .eq('status', 'called');
        
        if (!calledError && calledRequests) {
          // Filter out requests with invalid IDs and map to our format
          const validCalledRequests = calledRequests
            .filter(req => isValidUUID(req.student_id) && isValidUUID(req.parent_id))
            .map(req => ({
              id: req.id,
              studentId: req.student_id,
              parentId: req.parent_id,
              requestTime: new Date(req.request_time),
              status: req.status as 'pending' | 'called' | 'completed' | 'cancelled'
            }));
          
          additionalRequests.push(...validCalledRequests);
        }
      }
      
      // Combine all requests, avoiding duplicates
      const combinedRequests = [...parentActiveRequests];
      additionalRequests.forEach(req => {
        if (!combinedRequests.some(existing => existing.id === req.id)) {
          combinedRequests.push(req);
        }
      });
      
      setActiveRequests(combinedRequests);
      logger.info('Pickup requests updated:', combinedRequests.length);
    } catch (error) {
      logger.error('Error fetching pickup requests:', error);
    }
  }, [user, children]);

  // Handle real-time updates
  const handleRealtimeChange = useCallback(async (payload: any) => {
    logger.info('Pickup requests real-time change:', payload);
    
    const studentId = payload.new?.student_id || payload.old?.student_id;
    const parentId = payload.new?.parent_id || payload.old?.parent_id;
    
    // Check if this affects our children or if we're the parent making the request
    const affectsOurChildren = studentId && childrenIdsRef.current.includes(studentId);
    const isOurRequest = parentId && parentId === currentParentIdRef.current;
    
    if (affectsOurChildren || isOurRequest) {
      logger.info('Pickup request change affects us, refreshing...', { 
        studentId, 
        parentId, 
        eventType: payload.eventType,
        status: payload.new?.status || payload.old?.status 
      });
      
      // Small delay to avoid race conditions
      setTimeout(() => {
        fetchPickupRequests();
      }, 200);
    }
  }, [fetchPickupRequests]);

  useEffect(() => {
    fetchPickupRequests();

    // Set up real-time subscription
    const channel = supabase
      .channel('pickup_requests_parent_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests'
        },
        handleRealtimeChange
      )
      .subscribe((status) => {
        logger.info('Pickup requests subscription status:', status);
      });

    return () => {
      logger.info('Cleaning up pickup requests subscription');
      supabase.removeChannel(channel);
    };
  }, [fetchPickupRequests, handleRealtimeChange]);

  return { activeRequests, refreshPickupRequests: fetchPickupRequests };
};
