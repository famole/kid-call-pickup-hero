import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/context/auth/AuthProvider';
import { getParentDashboardDataOptimized } from '@/services/parent/optimizedParentQueries';
import { getParentDashboardDataByParentId, createPickupRequestForUsernameUser } from '@/services/parent/usernameParentQueries';
import { getActivePickupRequestsForParent } from '@/services/pickup';
import { supabase } from '@/integrations/supabase/client';
import { Child, PickupRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';

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
      
      // Always attempt to get the actual parent ID from the database
      let parentId = user.id;
      const { data: rpcParentId, error: rpcError } = await supabase.rpc('get_current_parent_id');
      
      console.log('🔍 DEBUG - RPC get_current_parent_id result:', { 
        rpcParentId, 
        rpcError: rpcError?.message,
        userId: user.id,
        userEmail: user.email,
        username: user.username 
      });
      
      if (rpcParentId) {
        parentId = rpcParentId;
      } else if (rpcError) {
        logger.error('Error fetching parent ID via RPC:', rpcError);
      }
    
      setCurrentParentId(parentId);
      logger.log('Using parent ID for dashboard:', parentId);

      // Determine user type once for downstream branching
      const isEmailUser = Boolean(user.email);
      
      console.log('🔍 DEBUG - User type and loading strategy:', {
        isEmailUser,
        parentId,
        strategy: isEmailUser ? 'getParentDashboardDataOptimized' : 'getParentDashboardDataByParentId'
      });

      // Load both children and pickup requests in parallel
      const [dashboardData, pickupRequests] = await Promise.all([
        isEmailUser
          ? getParentDashboardDataOptimized(user.email!)
          : getParentDashboardDataByParentId(parentId),
        getActivePickupRequestsForParent(parentId)
      ]);

      console.log('🔍 DEBUG - Dashboard data results:', {
        childrenCount: dashboardData.allChildren.length,
        pickupRequestsCount: pickupRequests.length,
        children: dashboardData.allChildren.map(c => ({ id: c.id, name: c.name, isAuthorized: c.isAuthorized }))
      });

      console.log('🔍 DEBUG - Raw pickup requests from database:', pickupRequests);

      logger.log('Using parent context:', { parentId, user: { id: user.id, email: user.email, username: user.username } });

      logger.log('Dashboard data loaded:', {
        childrenCount: dashboardData.allChildren.length,
        pickupRequestsCount: pickupRequests.length,
        currentParentId: parentId
      });

      setChildren(dashboardData.allChildren);

  // For username users, use direct queries that bypass RLS
  if (isEmailUser) {
    // Regular optimized queries for email users
    const dashboardData = await getParentDashboardDataOptimized(userId);
    setChildren(dashboardData.allChildren);
    setParentInfo(dashboardData.parentInfo);

    if (dashboardData.allChildren.length > 0) {
      // Fetch all pickup requests for the children (including pending and called)
      const { data: allChildRequests, error } = await supabase
        .from('pickup_requests')
        .select('*')
        .in('student_id', dashboardData.allChildren.map(child => child.id))
        .in('status', ['pending', 'called']);

      logger.log('Fetched pickup requests for children:', {
        allChildIds: dashboardData.allChildren.map(child => child.id),
        requests: allChildRequests?.length || 0,
        error: error?.message
      });

      if (!error && allChildRequests) {
        // Fetch parent information first
        const parentIds = [...new Set(allChildRequests.map(req => req.parent_id))];
        const { data: parentsData } = await supabase
          .from('parents')
          .select('id, name, email')
          .in('id', parentIds);

        const parentsMap = new Map(parentsData?.map(p => [p.id, p]) || []);

        const formattedRequests: PickupRequest[] = allChildRequests.map(req => ({
          id: req.id,
          studentId: req.student_id,
          parentId: req.parent_id,
          requestTime: new Date(req.request_time),
          status: req.status as 'pending' | 'called' | 'completed' | 'cancelled',
          requestingParent: parentsMap.get(req.parent_id) ? {
            id: parentsMap.get(req.parent_id)!.id,
            name: parentsMap.get(req.parent_id)!.name,
            email: parentsMap.get(req.parent_id)!.email
          } : undefined
        }));

        setActiveRequests(formattedRequests);
        logger.log('🔍 DEBUG - Dashboard data results:', {
          childrenCount: dashboardData.allChildren.length,
          pickupRequestsCount: formattedRequests.length,
          children: dashboardData.allChildren.map(child => ({ id: c.id, name: c.name, isAuthorized: c.isAuthorized }))
        });

        logger.log('🔍 DEBUG - Raw pickup requests from database:', allChildRequests);
      }
    }
  } else {
    // For username users, use direct queries with the stored parent ID
    const storedParentId = localStorage.getItem('username_parent_id');
    if (storedParentId) {
      try {
        // Fetch dashboard data using parent ID directly
        const dashboardData = await getParentDashboardDataByParentId(storedParentId);
        setChildren(dashboardData.allChildren);
        
        // Set parent info from localStorage
        const sessionData = localStorage.getItem('username_session');
        if (sessionData) {
          const parsedData = JSON.parse(sessionData);
          setParentInfo({
            id: parsedData.id,
            name: parsedData.name
          });
        }

        // Fetch pickup requests using parent ID directly
        const pickupRequests = await getActivePickupRequestsForParentId(storedParentId);
        setActiveRequests(pickupRequests);
        
        logger.log('🔍 DEBUG - Dashboard data results:', {
          childrenCount: dashboardData.allChildren.length,
          pickupRequestsCount: pickupRequests.length,
          children: dashboardData.allChildren.map(child => ({ id: c.id, name: c.name, isAuthorized: c.isAuthorized }))
        });

        logger.log('🔍 DEBUG - Raw pickup requests from database:', pickupRequests);
      } catch (error) {
        logger.error('Error loading username user data:', error);
      }
    }
            const parentIds = [...new Set(allChildRequests.map(req => req.parent_id))];
            let parentsMap = new Map();

            if (parentIds.length > 0) {
              const { data: parents, error: parentsError } = await supabase
                .from('parents')
                .select('id, name, email')
                .in('id', parentIds);

              if (!parentsError && parents) {
                setParentInfo(parents);
                parentsMap = new Map(parents.map(p => [p.id, p]));
              }
            }

            // Transform requests with parent information
            const transformedRequests = allChildRequests.map(req => ({
              id: req.id,
              studentId: req.student_id,
              parentId: req.parent_id,
              requestTime: new Date(req.request_time),
              status: req.status as 'pending' | 'called' | 'completed' | 'cancelled',
              requestingParent: parentsMap.get(req.parent_id) ? {
                id: parentsMap.get(req.parent_id).id,
                name: parentsMap.get(req.parent_id).name,
                email: parentsMap.get(req.parent_id).email
              } : undefined
            }));

            // Combine with parent's own requests, avoiding duplicates
            const combinedRequests = [...pickupRequests];
            transformedRequests.forEach(req => {
              if (!combinedRequests.some(existing => existing.id === req.id)) {
                combinedRequests.push(req);
              }
            });

            setActiveRequests(combinedRequests);
          } else {
            setActiveRequests(pickupRequests);
          }
        } else {
          setActiveRequests(pickupRequests);
        }
      } else {
        // For username-only users, the service already returns all relevant requests
        setActiveRequests(pickupRequests);
      }
      
      lastFetchRef.current = now;
      logger.log('Parent dashboard data loaded successfully', {
        childrenCount: dashboardData.allChildren.length,
        requestsCount: activeRequests.length
      });
    } catch (error) {
      logger.error('Error loading parent dashboard data:', error);
    } finally {
      if (firstLoadRef.current) {
        firstLoadRef.current = false;
      }
      setLoading(false);
    }
  }, [user?.email]);

  // Set up real-time subscription for pickup requests with enhanced filtering for user's requests
  useEffect(() => {
    if (!user?.id) return;

    // Set up periodic polling as a fallback in case realtime fails
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => loadDashboardData(true), 5000);

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
          
          // Also check if this is for their students (they might be authorized to pick up)
          const requestStudentId = (payload.new as any)?.student_id || (payload.old as any)?.student_id;
          const isForTheirStudent = childrenRef.current.some(child => child.id === requestStudentId);
          
          if (!isUsersRequest && !isForTheirStudent) {
            logger.log('Ignoring pickup request change - not related to this user');
            return;
          }
          
          logger.log('Processing pickup request change for this user:', {
            isUsersRequest,
            isForTheirStudent,
            requestParentId,
            currentParentId,
            requestStudentId
          });

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

  // Get authorized requests (requests made by others for children you can pick up)
  // Only show these notifications to actual parents, not to family/other roles
  const authorizedRequests = activeRequests.filter(req => {
    const child = children.find(c => c.id === req.studentId);
    // Only show to users with 'parent' role, not family/other roles
    return child?.isAuthorized && req.parentId !== user?.id && user?.role === 'parent';
  });

  // Debug logging for authorized requests
  logger.info('🔍 Authorized requests result:', {
    userRole: user?.role,
    totalActiveRequests: activeRequests.length,
    authorizedRequestsCount: authorizedRequests.length,
    authorizedRequests: authorizedRequests.map(req => ({
      id: req.id,
      studentId: req.studentId,
      parentId: req.parentId
    }))
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
    currentParentId,
    toggleChildSelection,
    handleRequestPickup,
    refetch: () => loadDashboardData(true)
  };
};
