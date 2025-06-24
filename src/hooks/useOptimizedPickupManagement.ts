
import { useState, useEffect, useCallback, useRef } from 'react';
import { getPickupRequestsWithDetailsBatch } from '@/services/pickup/optimizedPickupQueries';
import { updatePickupRequestStatus } from '@/services/pickup';
import { PickupRequestWithDetails } from '@/types/supabase';
import { supabase } from "@/integrations/supabase/client";

export const useOptimizedPickupManagement = (classId?: string) => {
  const [pendingRequests, setPendingRequests] = useState<PickupRequestWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const lastFetchRef = useRef<number>(0);
  const subscriptionRef = useRef<any>(null);

  const fetchPendingRequests = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && now - lastFetchRef.current < 500) {
      return;
    }

    setLoading(true);
    try {
      console.log('Fetching optimized pending requests...');
      const allRequests = await getPickupRequestsWithDetailsBatch(['pending']);
      
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
      
      // Optimistically update the local state immediately
      setPendingRequests(prev => {
        const updated = prev.filter(req => req.request.id !== requestId);
        console.log(`Optimistically removed request ${requestId}, ${updated.length} requests remaining`);
        return updated;
      });
      
      // Update the server
      await updatePickupRequestStatus(requestId, 'called');
      
      console.log('Request marked as called successfully');
      
      // Force refresh to ensure consistency
      setTimeout(() => {
        fetchPendingRequests(true);
      }, 100);
      
    } catch (error) {
      console.error("Error marking request as called:", error);
      // Refresh on error to get correct state
      fetchPendingRequests(true);
      throw error;
    }
  };

  useEffect(() => {
    fetchPendingRequests(true);
    
    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Set up real-time subscription
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
          fetchPendingRequests(true);
        }
      )
      .subscribe((status) => {
        console.log('Optimized pickup management subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('Cleaning up optimized pickup management subscription');
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
    refetch: () => fetchPendingRequests(true)
  };
};
