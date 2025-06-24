
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/auth/AuthProvider';
import { getParentDashboardDataOptimized } from '@/services/parent/optimizedParentQueries';
import { getActivePickupRequestsForParent } from '@/services/pickup';
import { supabase } from '@/integrations/supabase/client';
import { Child, PickupRequest } from '@/types';

interface ChildWithType extends Child {
  isAuthorized?: boolean;
}

interface ParentInfo {
  id: string;
  name: string;
}

// Type for the real-time payload
interface RealtimePayload {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new?: {
    student_id?: string;
    parent_id?: string;
    status?: string;
    [key: string]: any;
  };
  old?: {
    student_id?: string;
    parent_id?: string;
    status?: string;
    [key: string]: any;
  };
}

export const useOptimizedParentDashboard = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildWithType[]>([]);
  const [activeRequests, setActiveRequests] = useState<PickupRequest[]>([]);
  const [parentInfo, setParentInfo] = useState<ParentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef<number>(0);
  const channelRef = useRef<any>(null);

  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user?.email) return;

    const now = Date.now();
    // Increase debounce time to prevent excessive requests
    if (!forceRefresh && now - lastFetchRef.current < 5000) {
      return;
    }

    try {
      setLoading(true);
      
      // Load both children and pickup requests in parallel
      const [dashboardData, pickupRequests] = await Promise.all([
        getParentDashboardDataOptimized(user.email),
        getActivePickupRequestsForParent()
      ]);

      setChildren(dashboardData.allChildren);
      
      // Get all child IDs (both own and authorized)
      const allChildIds = dashboardData.allChildren.map(child => child.id);
      
      if (allChildIds.length > 0) {
        // Fetch all pickup requests for the children (including pending and called)
        const { data: allChildRequests, error } = await supabase
          .from('pickup_requests')
          .select('*')
          .in('student_id', allChildIds)
          .in('status', ['pending', 'called']);

        if (!error && allChildRequests) {
          // Transform and combine requests
          const transformedRequests = allChildRequests.map(req => ({
            id: req.id,
            studentId: req.student_id,
            parentId: req.parent_id,
            requestTime: new Date(req.request_time),
            status: req.status as 'pending' | 'called' | 'completed' | 'cancelled'
          }));

          // Combine with parent's own requests, avoiding duplicates
          const combinedRequests = [...pickupRequests];
          transformedRequests.forEach(req => {
            if (!combinedRequests.some(existing => existing.id === req.id)) {
              combinedRequests.push(req);
            }
          });
          
          setActiveRequests(combinedRequests);

          // Fetch parent information for the requests
          const parentIds = [...new Set(combinedRequests.map(req => req.parentId))];
          if (parentIds.length > 0) {
            const { data: parents, error: parentsError } = await supabase
              .from('parents')
              .select('id, name')
              .in('id', parentIds);

            if (!parentsError && parents) {
              setParentInfo(parents);
            }
          }
        } else {
          setActiveRequests(pickupRequests);
        }
      } else {
        setActiveRequests(pickupRequests);
      }
      
      lastFetchRef.current = now;
    } catch (error) {
      console.error('Error loading parent dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // Initial load and setup
  useEffect(() => {
    if (!user?.email) return;

    loadDashboardData(true);

    // Clean up existing channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Set up real-time subscription with unique channel name
    const channelName = `parent_dashboard_${user.email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests'
        },
        async (payload: RealtimePayload) => {
          console.log('Parent dashboard real-time change:', payload);
          
          // Smart handling of real-time updates
          const studentId = payload.new?.student_id || payload.old?.student_id;
          const currentChildIds = children.map(child => child.id);
          
          // Only refresh if this affects our children
          if (studentId && currentChildIds.includes(studentId)) {
            console.log('Change affects our children, updating...');
            
            if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
              // For inserts and deletes, do a full refresh
              setTimeout(() => loadDashboardData(true), 500);
            } else if (payload.eventType === 'UPDATE') {
              // For updates, handle more intelligently
              const newStatus = payload.new?.status;
              const oldStatus = payload.old?.status;
              
              if (newStatus !== oldStatus) {
                // Status changed, refresh to get accurate data
                setTimeout(() => loadDashboardData(true), 500);
              }
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Parent dashboard subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.email]); // Remove loadDashboardData and children from dependencies to prevent loops

  // Update children dependency for real-time filtering
  useEffect(() => {
    // This effect just updates the filtering logic when children change
    // No need to set up new subscriptions
  }, [children]);

  return {
    children,
    activeRequests,
    parentInfo,
    loading,
    refetch: () => loadDashboardData(true)
  };
};
