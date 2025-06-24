
import { useState, useEffect, useCallback, useRef } from 'react';
import { getPickupRequestsWithDetailsBatch } from '@/services/pickup/optimizedPickupQueries';
import { updatePickupRequestStatus } from '@/services/pickup';
import { PickupRequestWithDetails } from '@/types/supabase';
import { supabase } from "@/integrations/supabase/client";

export const useOptimizedPickupManagement = (classId?: string) => {
  const [pendingRequests, setPendingRequests] = useState<PickupRequestWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const lastFetchRef = useRef<number>(0);
  const isSubscribedRef = useRef<boolean>(false);

  const fetchPendingRequests = useCallback(async (forceRefresh = false) => {
    // Reduce caching time to ensure fresher data
    const now = Date.now();
    if (!forceRefresh && now - lastFetchRef.current < 1000) {
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching optimized pending requests...');
      // Use optimized batch query
      const allRequests = await getPickupRequestsWithDetailsBatch(['pending']);
      
      // Filter by class if specified
      let filteredRequests = allRequests;
      if (classId && classId !== 'all') {
        filteredRequests = allRequests.filter(item => 
          item.child && item.class && String(item.child.classId) === String(classId)
        );
      }

      console.log(`Found ${filteredRequests.length} pending requests after filtering`);
      setPendingRequests(filteredRequests);
      lastFetchRef.current = now;
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  const markAsCalled = async (requestId: string) => {
    try {
      console.log(`Optimized: Marking request ${requestId} as called`);
      await updatePickupRequestStatus(requestId, 'called');
      
      // Optimistically update the local state immediately
      setPendingRequests(prev => {
        const updated = prev.filter(req => req.request.id !== requestId);
        console.log(`Optimistically removed request ${requestId}, ${updated.length} requests remaining`);
        return updated;
      });
      
      console.log('Request marked as called. Server will auto-complete after 5 minutes.');
      
    } catch (error) {
      console.error("Error marking request as called:", error);
      // Refresh on error to get correct state
      fetchPendingRequests(true);
      throw error;
    }
  };

  useEffect(() => {
    fetchPendingRequests(true);
    
    // Prevent duplicate subscriptions
    if (isSubscribedRef.current) {
      return;
    }

    // Set up real-time subscription with improved debouncing
    const channel = supabase
      .channel('pickup_requests_optimized_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests'
        },
        async (payload) => {
          console.log('Optimized real-time pickup request change detected:', payload.eventType, payload);
          
          // Immediate refresh for better responsiveness
          setTimeout(() => {
            fetchPendingRequests(true);
          }, 50);
        }
      )
      .subscribe((status) => {
        console.log('Optimized pickup management subscription status:', status);
        if (status === 'SUBSCRIBED') {
          isSubscribedRef.current = true;
        }
      });

    return () => {
      console.log('Cleaning up optimized pickup management subscription');
      isSubscribedRef.current = false;
      supabase.removeChannel(channel);
    };
  }, [fetchPendingRequests]);

  return {
    pendingRequests,
    loading,
    markAsCalled,
    refetch: () => fetchPendingRequests(true)
  };
};
