
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
  const { toast } = useToast();
  const [children, setChildren] = useState<ChildWithType[]>([]);
  const [activeRequests, setActiveRequests] = useState<PickupRequest[]>([]);
  const [parentInfo, setParentInfo] = useState<ParentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const firstLoadRef = useRef(true);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lastFetchRef = useRef<number>(0);
  const channelRef = useRef<any>(null);
  const childrenIdsRef = useRef<string[]>([]);

  // Keep track of children IDs for real-time filtering
  useEffect(() => {
    childrenIdsRef.current = children.map(child => child.id);
  }, [children]);

  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user?.email) return;

    const now = Date.now();
    // Prevent excessive requests
    if (!forceRefresh && now - lastFetchRef.current < 2000) {
      return;
    }

    try {
      if (firstLoadRef.current) {
        setLoading(true);
      }
      
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
      console.log('Dashboard data refreshed successfully');
    } catch (error) {
      console.error('Error loading parent dashboard data:', error);
    } finally {
      if (firstLoadRef.current) {
        firstLoadRef.current = false;
        setLoading(false);
      }
    }
  }, [user?.email]);

  // Handle real-time updates efficiently
  const handleRealtimeChange = useCallback(async (payload: RealtimePayload) => {
    console.log('Parent dashboard real-time change:', payload);
    
    const studentId = payload.new?.student_id || payload.old?.student_id;
    
    // Only refresh if this affects our children
    if (studentId && childrenIdsRef.current.includes(studentId)) {
      console.log('Change affects our children, updating...', { studentId, eventType: payload.eventType });
      
      // For any change that affects our children, refresh the data
      // Use a small delay to avoid race conditions
      setTimeout(() => {
        loadDashboardData(true);
      }, 100);
    } else {
      console.log('Change does not affect our children, ignoring...', { studentId, ourChildren: childrenIdsRef.current });
    }
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

  // Initial load and setup
  useEffect(() => {
    if (!user?.email) return;

    console.log('Setting up parent dashboard for user:', user.email);
    loadDashboardData(true);

    // Clean up existing channel
    if (channelRef.current) {
      console.log('Cleaning up existing real-time channel');
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
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

    channelRef.current = channel;

    return () => {
      console.log('Cleaning up parent dashboard subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user?.email, handleRealtimeChange]);

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
