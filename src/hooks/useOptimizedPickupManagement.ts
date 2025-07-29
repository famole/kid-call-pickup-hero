
import { useState, useEffect, useCallback, useRef } from 'react';
import { getPickupRequestsWithDetailsBatch } from '@/services/pickup/optimizedPickupQueries';
import { updatePickupRequestStatus } from '@/services/pickup';
import { PickupRequestWithDetails } from '@/types/supabase';
import { supabase } from "@/integrations/supabase/client";

export const useOptimizedPickupManagement = (classId?: string, teacherClassIds?: string[]) => {
  const [pendingRequests, setPendingRequests] = useState<PickupRequestWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const lastFetchRef = useRef<number>(0);
  const subscriptionRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPendingRequests = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && now - lastFetchRef.current < 1000) {
      return;
    }

    try {
      console.log('Fetching optimized pending requests...');
      const allRequests = await getPickupRequestsWithDetailsBatch(['pending'], teacherClassIds);
      
      let filteredRequests = allRequests;
      // Only apply individual class filter if not already filtered by teacher classes
      if (classId && classId !== 'all' && !teacherClassIds) {
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
  }, [classId, teacherClassIds]);

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
      
    } catch (error) {
      console.error("Error marking request as called:", error);
      // Refresh on error to get correct state
      fetchPendingRequests(true);
      throw error;
    }
  };

  useEffect(() => {
    fetchPendingRequests(true);

    // Poll periodically in case realtime updates fail
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => fetchPendingRequests(true), 5000);

    // Clean up existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Set up real-time subscription with better error handling
    const channel = supabase
      .channel(`pickup_requests_optimized_${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests'
        },
        async (payload) => {
          console.log('Optimized real-time pickup request change detected:', payload.eventType, payload);
          
          // Handle real-time updates more intelligently
          if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
            // Add new pending request
            console.log('New pending request detected, refreshing...');
            fetchPendingRequests(true);
          } else if (payload.eventType === 'UPDATE') {
            const affectedId = payload.new?.id;
            const newStatus = payload.new?.status;
            const oldStatus = payload.old?.status;
            
            if (affectedId) {
              if (oldStatus === 'pending' && newStatus !== 'pending') {
                // Request was moved from pending to another status - remove from pending list
                console.log(`Request ${affectedId} moved from pending to ${newStatus}, removing from list`);
                setPendingRequests(prev => prev.filter(req => req.request.id !== affectedId));
              } else if (newStatus === 'pending' && oldStatus !== 'pending') {
                // Request was moved to pending - refresh to get details
                console.log(`Request ${affectedId} moved to pending, refreshing...`);
                fetchPendingRequests(true);
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const affectedId = payload.old?.id;
            if (affectedId) {
              console.log(`Request ${affectedId} deleted, removing from list`);
              setPendingRequests(prev => prev.filter(req => req.request.id !== affectedId));
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Optimized pickup management subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to pickup requests changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Subscription failed, falling back to manual refresh');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('Cleaning up optimized pickup management subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
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
