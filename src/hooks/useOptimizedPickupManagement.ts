
import { useState, useEffect, useCallback, useRef } from 'react';
import { getPickupRequestsWithDetailsBatch } from '@/services/pickup/optimizedPickupQueries';
import { updatePickupRequestStatus } from '@/services/pickup';
import { cancelPickupRequest } from '@/services/pickup/cancelPickupRequest';
import { PickupRequestWithDetails } from '@/types/supabase';
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/utils/logger';

export const useOptimizedPickupManagement = (classId?: string, teacherClassIds?: string[]) => {
  const [pendingRequests, setPendingRequests] = useState<PickupRequestWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cancellingRequests, setCancellingRequests] = useState<Set<string>>(new Set());
  const lastFetchRef = useRef<number>(0);
  const subscriptionRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchPendingRequests = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && now - lastFetchRef.current < 1000) {
      return;
    }

    // Don't fetch if classId is null (waiting for teacher classes to load)
    if (classId === null) {
      logger.info('Skipping fetch - classId is null, waiting for teacher classes to load');
      setLoading(false);
      return;
    }

    try {
      logger.info('Fetching optimized pending requests with teacherClassIds:', teacherClassIds);
      const allRequests = await getPickupRequestsWithDetailsBatch(['pending'], teacherClassIds);
      
      let filteredRequests = allRequests;
      // Only apply individual class filter if not already filtered by teacher classes
      if (classId && classId !== 'all' && !teacherClassIds) {
        filteredRequests = allRequests.filter(item => 
          item.child && item.class && String(item.child.classId) === String(classId)
        );
      }

      logger.info(`Found ${filteredRequests.length} pending requests after filtering`);
      setPendingRequests(filteredRequests);
      lastFetchRef.current = now;
    } catch (error) {
      logger.error("Error fetching pending requests:", error);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  }, [classId, teacherClassIds]);

  const markAsCalled = async (requestId: string) => {
    try {
      logger.info(`Optimized: Marking request ${requestId} as called`);
      
      // Optimistically update the local state immediately
      setPendingRequests(prev => {
        const updated = prev.filter(req => req.request.id !== requestId);
        logger.info(`Optimistically removed request ${requestId}, ${updated.length} requests remaining`);
        return updated;
      });
      
      // Update the server
      await updatePickupRequestStatus(requestId, 'called');
      logger.info('Request marked as called successfully');
      
    } catch (error) {
      logger.error("Error marking request as called:", error);
      // Refresh on error to get correct state
      fetchPendingRequests(true);
      throw error;
    }
  };

  const cancelRequest = async (requestId: string) => {
    // Prevent double-cancel
    if (cancellingRequests.has(requestId)) {
      logger.warn(`Cancel already in progress for request ${requestId}`);
      return;
    }

    setCancellingRequests(prev => new Set(prev).add(requestId));
    
    try {
      logger.info(`Cancelling pickup request ${requestId}`);
      
      // Optimistically update the local state immediately
      setPendingRequests(prev => {
        const updated = prev.filter(req => req.request.id !== requestId);
        logger.info(`Optimistically removed cancelled request ${requestId}, ${updated.length} requests remaining`);
        return updated;
      });
      
      // Cancel the request on the server
      await cancelPickupRequest(requestId);
      logger.info('Request cancelled successfully');
      
    } catch (error) {
      logger.error("Error cancelling request:", error);
      // Refresh on error to get correct state
      fetchPendingRequests(true);
      throw error;
    } finally {
      setCancellingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  useEffect(() => {
    fetchPendingRequests(true);

    // Poll periodically in case realtime updates fail (every 20 seconds)
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => fetchPendingRequests(true), 20000);

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
          logger.info('Optimized real-time pickup request change detected:', payload.eventType, payload);
          
          // Handle real-time updates more intelligently
          if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
            // Add new pending request
            logger.info('New pending request detected, refreshing...');
            fetchPendingRequests(true);
          } else if (payload.eventType === 'UPDATE') {
            const affectedId = payload.new?.id;
            const newStatus = payload.new?.status;
            const oldStatus = payload.old?.status;
            
            if (affectedId) {
              if (oldStatus === 'pending' && newStatus !== 'pending') {
                // Request was moved from pending to another status - remove from pending list
                logger.info(`Request ${affectedId} moved from pending to ${newStatus}, removing from list`);
                setPendingRequests(prev => prev.filter(req => req.request.id !== affectedId));
              } else if (newStatus === 'pending' && oldStatus !== 'pending') {
                // Request was moved to pending - refresh to get details
                logger.info(`Request ${affectedId} moved to pending, refreshing...`);
                fetchPendingRequests(true);
              }
            }
          } else if (payload.eventType === 'DELETE') {
            const affectedId = payload.old?.id;
            if (affectedId) {
              logger.info(`Request ${affectedId} deleted, removing from list`);
              setPendingRequests(prev => prev.filter(req => req.request.id !== affectedId));
            }
          }
        }
      )
      .subscribe((status) => {
        logger.info('Optimized pickup management subscription status:', status);
        if (status === 'SUBSCRIBED') {
          logger.info('Successfully subscribed to pickup requests changes');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Subscription failed, falling back to manual refresh');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      logger.info('Cleaning up optimized pickup management subscription');
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
    cancellingRequests,
    markAsCalled,
    cancelRequest,
    refetch: () => fetchPendingRequests(true)
  };
};
