import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/auth/AuthProvider';
import { getParentDashboardDataOptimized } from '@/services/parent/optimizedParentQueries';
import { createPickupRequestForUsernameUser } from '@/services/parent/usernameParentQueries';
import { getActivePickupRequestsForParent } from '@/services/pickup';
import { getParentAffectedPickupRequests } from '@/services/pickup/getParentAffectedPickupRequests';
import { createPickupRequest } from '@/services/pickup/createPickupRequest';
import { supabase } from '@/integrations/supabase/client';
import { Child, PickupRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { getCurrentParentId, getParentIdentifierForDashboard } from '@/services/auth/parentIdResolver';

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
  const firstLoadRef = useRef(true);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentParentId, setCurrentParentId] = useState<string | undefined>(undefined);
  const lastFetchRef = useRef<number>(0);
  const subscriptionRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Use refs to maintain stable references for real-time subscription
  const childrenRef = useRef<ChildWithType[]>([]);
  const currentParentIdRef = useRef<string | undefined>(undefined);
  
  // Update refs when values change
  useEffect(() => {
    childrenRef.current = children;
  }, [children]);
  
  useEffect(() => {
    currentParentIdRef.current = currentParentId;
  }, [currentParentId]);

  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) {
      logger.log('No user ID available, skipping data load');
      return;
    }

    const now = Date.now();
    // Prevent excessive requests but allow forced refreshes
    if (!forceRefresh && now - lastFetchRef.current < 500) {
      logger.log('Debouncing dashboard data load request');
      return;
    }

    try {
      setLoading(true);
      
      // Get parent ID using centralized resolver with fallback methods
      const parentId = await getCurrentParentId();
      if (!parentId) {
        logger.error('Failed to get parent ID with all fallback methods');
        setLoading(false);
        return;
      }

      setCurrentParentId(parentId);
      logger.log('Using parent ID for dashboard:', parentId);

      // Get parent identifier for dashboard queries (email for email users, parent ID for username users)
      const parentIdentifier = await getParentIdentifierForDashboard();
      if (!parentIdentifier) {
        logger.error('Failed to get parent identifier for dashboard');
        setLoading(false);
      }

      // Determine user type
      const isEmailUser = Boolean(user.email);

      // Load dashboard data and pickup requests
      const [dashboardData, pickupRequests] = await Promise.all([
        // Use the unified function that handles both email and parent ID
        getParentDashboardDataOptimized(isEmailUser ? user.email! : parentId),
        // Only get requests made by the current parent (not requests made by others)
        getActivePickupRequestsForParent(parentId)
      ]);

      setChildren(dashboardData.allChildren);
      
      // Set parent info based on user type
      if (isEmailUser) {
        setParentInfo([]);
      } else {
        // For username users, get parent info from localStorage
        const sessionData = localStorage.getItem('username_session');
        if (sessionData) {
          const parsedData = JSON.parse(sessionData);
          setParentInfo([{
            id: parsedData.id,
            name: parsedData.name
          }]);
        } else {
          setParentInfo([]);
        }
      }
      
      setActiveRequests(pickupRequests);

      lastFetchRef.current = now;
      logger.log('Parent dashboard data loaded successfully', {
        childrenCount: dashboardData.allChildren.length,
        requestsCount: pickupRequests.length
      });
    } catch (error) {
      logger.error('Error loading parent dashboard data:', error);
    } finally {
      if (firstLoadRef.current) {
        firstLoadRef.current = false;
      }
      setLoading(false);
    }
  }, [user?.email, user?.id]);

  // Set up real-time subscription for pickup requests with enhanced filtering for user's requests
  useEffect(() => {
    if (!user?.id) return;

    // Set up periodic polling as a fallback in case realtime fails (every 20 seconds)
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => loadDashboardData(true), 20000);

    // Clean up existing subscription
    if (subscriptionRef.current) {
      logger.log('Cleaning up existing parent dashboard subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    const channelName = `parent_dashboard_${(user.email || user.username || user.id).replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
    logger.log('Setting up parent dashboard real-time subscription:', channelName);

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
          logger.log('Parent dashboard real-time change detected:', payload.eventType, payload);
          logger.log('Payload details:', JSON.stringify(payload, null, 2));
          
          // For username-only users, check if this pickup request belongs to them
          const requestParentId = (payload.new as any)?.parent_id || (payload.old as any)?.parent_id;
          const isUsersRequest = requestParentId === currentParentIdRef.current || requestParentId === user.id;
          
          // Only process requests made by this user (not requests made by others for their students)
          if (!isUsersRequest) {
            logger.log('Ignoring pickup request change - not made by this user');
            return;
          }

          // Handle real-time updates with notifications
          if (payload.eventType === 'INSERT' && (payload.new as any)?.status === 'pending') {
            logger.log('New pickup request detected, refreshing dashboard...');
            toast({
              title: "Pickup Requested",
              description: "Your pickup request has been submitted successfully.",
            });
            loadDashboardData(true);
          } else if (payload.eventType === 'UPDATE') {
            const newStatus = (payload.new as any)?.status;
            const oldStatus = (payload.old as any)?.status;
            const studentId = (payload.new as any)?.student_id;
            const studentName = childrenRef.current.find(child => child.id === studentId)?.name || 'Student';
            
            logger.log(`Status change detected for student ${studentId}: ${oldStatus} -> ${newStatus}`);
            
            // Show notifications for status changes
            if (newStatus !== oldStatus) {
              if (newStatus === 'called') {
                toast({
                  title: "Pickup Called",
                  description: `${studentName} has been called for pickup. Please proceed to pickup location.`,
                  variant: "default",
                });
              } else if (newStatus === 'completed') {
                toast({
                  title: "Pickup Completed",
                  description: `Pickup for ${studentName} has been completed.`,
                  variant: "default",
                });
              } else if (newStatus === 'cancelled') {
                toast({
                  title: "Pickup Cancelled",
                  description: `Pickup request for ${studentName} has been cancelled.`,
                  variant: "destructive",
                });
              }
              
              logger.log(`Pickup request status changed from ${oldStatus} to ${newStatus}, refreshing dashboard...`);
              // Use a longer timeout to ensure the database update is complete
              setTimeout(() => {
                logger.log('Executing dashboard refresh now...');
                loadDashboardData(true);
              }, 300);
            }
          } else if (payload.eventType === 'DELETE') {
            logger.log('Pickup request deleted, refreshing dashboard...');
            toast({
              title: "Pickup Request Removed",
              description: "A pickup request has been removed.",
              variant: "default",
            });
            loadDashboardData(true);
          }
        }
      )
      .subscribe((status) => {
        logger.log('Parent dashboard subscription status:', status);
        if (status === 'SUBSCRIBED') {
          logger.log('Successfully subscribed to pickup_requests changes for parent dashboard');
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Failed to subscribe to pickup_requests changes for parent dashboard');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      logger.log('Cleaning up parent dashboard real-time subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [user?.id, loadDashboardData]);

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
      // For username-only users, use the secure database function
      if (!user?.email && currentParentId) {
        // Use database function for username-only users with resolved parent ID
        await Promise.all(
          selectedChildren.map(async (studentId) => {
            await createPickupRequestForUsernameUser(studentId, currentParentId);
          })
        );
      } else {
        // Use regular service for email users
        await Promise.all(
          selectedChildren.map(studentId => createPickupRequest(studentId))
        );
      }

      toast({
        title: "Pickup Request Submitted",
        description: `Successfully requested pickup for ${selectedChildren.length} child${selectedChildren.length > 1 ? 'ren' : ''}`,
      });

      setSelectedChildren([]);
      // Force refresh after submitting requests
      await loadDashboardData(true);
    } catch (error) {
      logger.error('Error requesting pickup:', error);
      toast({
        title: "Error",
        description: "Failed to submit pickup request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedChildren, toast, loadDashboardData, user, currentParentId]);

  // Initial load
  useEffect(() => {
    if (user?.id) {
      logger.log('Setting up parent dashboard for user:', user.email || user.username || user.id);
      loadDashboardData(true);
    }
  }, [user?.id, loadDashboardData]);

  // Separate pending and called requests
  const pendingRequests = activeRequests.filter(req => req.status === 'pending');
  const calledRequests = activeRequests.filter(req => req.status === 'called');

  // Only show requests made by the current parent (no authorized requests from others)
  const authorizedRequests: PickupRequest[] = [];

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
    currentParentId,
    toggleChildSelection,
    handleRequestPickup,
    refetch: () => loadDashboardData(true)
  };
};
