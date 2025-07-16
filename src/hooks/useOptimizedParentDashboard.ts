
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/auth/AuthProvider';
import { getParentDashboardDataOptimized } from '@/services/parent/optimizedParentQueries';
import { getActivePickupRequestsForParent, createPickupRequest } from '@/services/pickup';
import { supabase } from '@/integrations/supabase/client';
import { Child, PickupRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';

interface ChildWithType extends Child {
  isAuthorized?: boolean;
}

interface ParentInfo {
  id: string;
  name: string;
}

export const useOptimizedParentDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [children, setChildren] = useState<ChildWithType[]>([]);
  const [activeRequests, setActiveRequests] = useState<PickupRequest[]>([]);
  const [parentInfo, setParentInfo] = useState<ParentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastFetchRef = useRef<number>(0);
  const subscriptionRef = useRef<any>(null);

  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user?.email) return;

    const now = Date.now();
    // Prevent excessive requests
    if (!forceRefresh && now - lastFetchRef.current < 1000) {
      return;
    }

    try {
      setLoading(true);
      console.log('Loading parent dashboard data...');
      
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
      console.log('Parent dashboard data refreshed successfully');
    } catch (error) {
      console.error('Error loading parent dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // Handle real-time updates - simplified and more reliable
  const handleRealtimeChange = useCallback(async (payload: any) => {
    console.log('Parent dashboard real-time change detected:', payload.eventType, payload);
    
    // Always refresh on any pickup_requests change since we need to ensure data consistency
    // This is simpler and more reliable than trying to filter changes
    setTimeout(() => {
      console.log('Refreshing parent dashboard due to pickup request change');
      loadDashboardData(true);
    }, 200);
  }, [loadDashboardData]);

  // Toggle child selection
  const toggleChildSelection = useCallback((studentId: string) => {
    setSelectedChildren(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  }, []);

  // Handle pickup request
  const handleRequestPickup = useCallback(async () => {
    if (selectedChildren.length === 0) return;

    setIsSubmitting(true);
    try {
      await Promise.all(
        selectedChildren.map(studentId => createPickupRequest(studentId))
      );

      toast({
        title: "Pickup Request Submitted",
        description: `Successfully requested pickup for ${selectedChildren.length} child${selectedChildren.length > 1 ? 'ren' : ''}`,
      });

      setSelectedChildren([]);
      await loadDashboardData(true);
    } catch (error) {
      console.error('Error requesting pickup:', error);
      toast({
        title: "Error",
        description: "Failed to submit pickup request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedChildren, toast, loadDashboardData]);

  // Initial load and setup real-time subscription
  useEffect(() => {
    if (!user?.email) return;

    console.log('Setting up parent dashboard for user:', user.email);
    loadDashboardData(true);

    // Clean up existing subscription
    if (subscriptionRef.current) {
      console.log('Cleaning up existing real-time channel');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Set up real-time subscription with unique channel name
    const channelName = `parent_dashboard_${user.email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    console.log('Creating real-time channel:', channelName);
    
    const channel = supabase
      .channel(channelName)
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
        console.log('Parent dashboard subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to pickup_requests changes');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Subscription failed for pickup_requests');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('Cleaning up parent dashboard subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user?.email, handleRealtimeChange, loadDashboardData]);

  // Separate pending and called requests
  const pendingRequests = activeRequests.filter(req => req.status === 'pending');
  const calledRequests = activeRequests.filter(req => req.status === 'called');

  // Get authorized requests (requests made by others for children you can pick up)
  const authorizedRequests = activeRequests.filter(req => {
    const child = children.find(c => c.id === req.studentId);
    return child?.isAuthorized && req.parentId !== user?.id;
  });

  return {
    children,
    activeRequests,
    pendingRequests,
    calledRequests,
    authorizedRequests,
    parentInfo,
    loading,
    selectedChildren,
    setSelectedChildren,
    isSubmitting,
    toggleChildSelection,
    handleRequestPickup,
    refetch: () => loadDashboardData(true)
  };
};
