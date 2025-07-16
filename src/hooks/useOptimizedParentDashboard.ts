
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
    if (!user?.email) {
      console.log('No user email available, skipping data load');
      return;
    }

    const now = Date.now();
    // Prevent excessive requests but allow forced refreshes
    if (!forceRefresh && now - lastFetchRef.current < 500) {
      console.log('Debouncing dashboard data load request');
      return;
    }

    try {
      setLoading(true);
      console.log('Loading parent dashboard data...', { forceRefresh, userEmail: user.email });
      
      // Load both children and pickup requests in parallel
      const [dashboardData, pickupRequests] = await Promise.all([
        getParentDashboardDataOptimized(user.email),
        getActivePickupRequestsForParent()
      ]);

      console.log('Dashboard data loaded:', {
        childrenCount: dashboardData.allChildren.length,
        pickupRequestsCount: pickupRequests.length
      });

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
      console.log('Parent dashboard data loaded successfully', {
        childrenCount: dashboardData.allChildren.length,
        requestsCount: activeRequests.length
      });
    } catch (error) {
      console.error('Error loading parent dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  // Set up real-time subscription for pickup requests (same as admin panel)
  useEffect(() => {
    if (!user?.email) return;

    // Clean up existing subscription
    if (subscriptionRef.current) {
      console.log('Cleaning up existing parent dashboard subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channelName = `parent_dashboard_${user.email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    console.log('Setting up parent dashboard real-time subscription:', channelName);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests'
        },
        async (payload) => {
          console.log('Parent dashboard real-time change detected:', payload.eventType, payload);
          console.log('Payload details:', JSON.stringify(payload, null, 2));
          
          // Handle real-time updates intelligently like admin panel
          if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
            console.log('New pickup request detected, refreshing dashboard...');
            loadDashboardData(true);
          } else if (payload.eventType === 'UPDATE') {
            const newStatus = payload.new?.status;
            const oldStatus = payload.old?.status;
            const studentId = payload.new?.student_id;
            
            console.log(`Status change detected for student ${studentId}: ${oldStatus} -> ${newStatus}`);
            
            // Any status change should trigger a refresh for parent dashboard
            if (newStatus !== oldStatus) {
              console.log(`Pickup request status changed from ${oldStatus} to ${newStatus}, refreshing dashboard...`);
              // Use a longer timeout to ensure the database update is complete
              setTimeout(() => {
                console.log('Executing dashboard refresh now...');
                loadDashboardData(true);
              }, 300);
            }
          } else if (payload.eventType === 'DELETE') {
            console.log('Pickup request deleted, refreshing dashboard...');
            loadDashboardData(true);
          }
        }
      )
      .subscribe((status) => {
        console.log('Parent dashboard subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to pickup_requests changes for parent dashboard');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Failed to subscribe to pickup_requests changes for parent dashboard');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('Cleaning up parent dashboard real-time subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [user?.email, loadDashboardData]);

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
      // Force refresh after submitting requests
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

  // Initial load
  useEffect(() => {
    if (user?.email) {
      console.log('Setting up parent dashboard for user:', user.email);
      loadDashboardData(true);
    }
  }, [user?.email, loadDashboardData]);

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
