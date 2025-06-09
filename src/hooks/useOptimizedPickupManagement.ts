
import { useState, useEffect, useCallback } from 'react';
import { getPickupRequestsWithDetailsBatch } from '@/services/pickup/optimizedPickupQueries';
import { updatePickupRequestStatus } from '@/services/pickup';
import { PickupRequestWithDetails } from '@/types/supabase';
import { supabase } from "@/integrations/supabase/client";

export const useOptimizedPickupManagement = (classId?: string) => {
  const [pendingRequests, setPendingRequests] = useState<PickupRequestWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastFetch, setLastFetch] = useState<number>(0);

  const fetchPendingRequests = useCallback(async (forceRefresh = false) => {
    // Implement simple caching - don't fetch if we fetched recently
    const now = Date.now();
    if (!forceRefresh && now - lastFetch < 2000) {
      return;
    }

    setLoading(true);
    try {
      // Use optimized batch query
      const allRequests = await getPickupRequestsWithDetailsBatch(['pending']);
      
      // Filter by class if specified (already filtered at DB level in optimized query)
      let filteredRequests = allRequests;
      if (classId && classId !== 'all') {
        filteredRequests = allRequests.filter(item => 
          item.child && item.class && String(item.child.classId) === String(classId)
        );
      }

      setPendingRequests(filteredRequests);
      setLastFetch(now);
    } catch (error) {
      console.error("Error fetching pending requests:", error);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  }, [classId, lastFetch]);

  const markAsCalled = async (requestId: string) => {
    try {
      await updatePickupRequestStatus(requestId, 'called');
      
      // Optimistically update the local state
      setPendingRequests(prev => prev.filter(req => req.request.id !== requestId));
      
      // Schedule auto-completion
      setTimeout(async () => {
        try {
          await updatePickupRequestStatus(requestId, 'completed');
        } catch (error) {
          console.error(`Error auto-completing request ${requestId}:`, error);
        }
      }, 5 * 60 * 1000);
      
    } catch (error) {
      console.error("Error marking request as called:", error);
      throw error;
    }
  };

  useEffect(() => {
    fetchPendingRequests(true);
    
    // Set up real-time subscription with reduced frequency
    const channel = supabase
      .channel('pickup_requests_optimized')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests',
          filter: 'status=eq.pending'
        },
        async () => {
          // Debounce rapid changes
          setTimeout(() => {
            fetchPendingRequests(true);
          }, 500);
        }
      )
      .subscribe();

    return () => {
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
