
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/auth/AuthProvider';
import { getParentDashboardDataOptimized } from '@/services/parent/optimizedParentQueries';
import { getActivePickupRequestsForParent } from '@/services/pickup';
import { supabase } from '@/integrations/supabase/client';
import { Child, PickupRequest } from '@/types';

interface ChildWithType extends Child {
  isAuthorized?: boolean;
}

export const useOptimizedParentDashboard = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<ChildWithType[]>([]);
  const [activeRequests, setActiveRequests] = useState<PickupRequest[]>([]);
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
      setActiveRequests(pickupRequests);
      lastFetchRef.current = now;
    } catch (error) {
      console.error('Error loading parent dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]); // Removed lastFetch from dependencies

  useEffect(() => {
    if (user?.email) {
      loadDashboardData(true);
    }
  }, [user?.email, loadDashboardData]);

  useEffect(() => {
    if (!user?.email) return;

    // Single real-time subscription for pickup requests
    const channel = supabase
      .channel('parent_dashboard_optimized')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests'
        },
        async () => {
          // Debounce rapid changes - only refresh if enough time has passed
          const now = Date.now();
          if (now - lastFetchRef.current > 2000) {
            setTimeout(() => {
              loadDashboardData(true);
            }, 500);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.email, loadDashboardData]);

  return {
    children,
    activeRequests,
    loading,
    refetch: () => loadDashboardData(true)
  };
};
