
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
    [key: string]: any;
  };
  old?: {
    student_id?: string;
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

  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user?.email) return;

    const now = Date.now();
    if (!forceRefresh && now - lastFetchRef.current < 3000) {
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
      
      // Also fetch pickup requests for all children (own + authorized)
      const allChildIds = dashboardData.allChildren.map(child => child.id);
      
      if (allChildIds.length > 0) {
        const { data: allChildRequests, error } = await supabase
          .from('pickup_requests')
          .select('*')
          .in('student_id', allChildIds)
          .in('status', ['pending', 'called']);

        if (!error && allChildRequests) {
          const combinedRequests = [...pickupRequests];
          allChildRequests.forEach(req => {
            if (!combinedRequests.some(existing => existing.id === req.id)) {
              combinedRequests.push({
                id: req.id,
                studentId: req.student_id,
                parentId: req.parent_id,
                requestTime: new Date(req.request_time),
                status: req.status as 'pending' | 'called' | 'completed' | 'cancelled'
              });
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

  useEffect(() => {
    if (user?.email) {
      loadDashboardData(true);
    }
  }, [user?.email, loadDashboardData]);

  useEffect(() => {
    if (!user?.email) return;

    // Enhanced real-time subscription for pickup requests
    const channel = supabase
      .channel('parent_dashboard_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests'
        },
        async (payload: RealtimePayload) => {
          console.log('Real-time pickup request change detected:', payload);
          
          // Check if this change affects any of the parent's children
          const currentChildren = children.map(child => child.id);
          const affectedStudentId = payload.new?.student_id || payload.old?.student_id;
          
          if (affectedStudentId && currentChildren.includes(affectedStudentId)) {
            console.log('Pickup request change affects parent\'s child, refreshing dashboard');
            // Debounce rapid changes
            const now = Date.now();
            if (now - lastFetchRef.current > 1000) {
              setTimeout(() => {
                loadDashboardData(true);
              }, 300);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, children, loadDashboardData]);

  return {
    children,
    activeRequests,
    parentInfo,
    loading,
    refetch: () => loadDashboardData(true)
  };
};
