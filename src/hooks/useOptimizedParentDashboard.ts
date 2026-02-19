
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth/AuthProvider';
import { secureStudentOperations } from '@/services/encryption/secureStudentClient';
import { createPickupRequestForUsernameUser } from '@/services/parent/usernameParentQueries';
import { createPickupRequest } from '@/services/pickup/createPickupRequest';
import { supabase } from '@/integrations/supabase/client';
import { Child, PickupRequest } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/utils/logger';
import { getCurrentParentId } from '@/services/auth/parentIdResolver';

interface ChildWithType extends Child {
  isAuthorized?: boolean;
  className?: string;
}

interface ParentInfo {
  id: string;
  name: string;
}

export const useOptimizedParentDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const childrenRef = useRef<ChildWithType[]>([]);
  const currentParentIdRef = useRef<string | undefined>(undefined);

  const { data: dashboardData, isLoading: loading } = useQuery({
    queryKey: ['optimized-parent-dashboard', user?.id, user?.email],
    queryFn: async () => {
      const parentId = await getCurrentParentId();
      if (!parentId) {
        logger.error('Failed to get parent ID');
        return null;
      }

      // ── Single unified call: students + class names + pickup requests ──
      const result = await secureStudentOperations.getParentDashboardSecure(parentId);

      if (result.error || !result.data) {
        logger.error('Unified dashboard call failed:', result.error);
        return null;
      }

      const { directChildren, authorizedChildren, activeRequests } = result.data;

      // Build children list
      const allChildrenMap = new Map<string, ChildWithType>();

      directChildren.forEach(student => {
        allChildrenMap.set(student.id, {
          ...student,
          parentIds: [parentId],
          isAuthorized: false,
        });
      });

      authorizedChildren.forEach(student => {
        if (!allChildrenMap.has(student.id)) {
          allChildrenMap.set(student.id, {
            ...student,
            parentIds: [parentId],
            isAuthorized: true,
          });
        }
      });

      const children = Array.from(allChildrenMap.values());

      // Parent info for username users
      let parentInfo: ParentInfo[] = [];
      const isEmailUser = Boolean(user!.email);
      if (!isEmailUser) {
        const sessionData = localStorage.getItem('username_session');
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          parentInfo = [{ id: parsed.id, name: parsed.name }];
        }
      }

      return {
        children,
        activeRequests,
        parentInfo,
        currentParentId: parentId,
      };
    },
    enabled: !!user?.id,
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const children = dashboardData?.children || [];
  const activeRequests = dashboardData?.activeRequests || [];
  const parentInfo = dashboardData?.parentInfo || [];
  const currentParentId = dashboardData?.currentParentId;

  // Update refs
  useEffect(() => { childrenRef.current = children; }, [children]);
  useEffect(() => { currentParentIdRef.current = currentParentId; }, [currentParentId]);

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channelName = `parent_dashboard_rq_${(user.email || user.username || user.id).replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pickup_requests' },
        (payload) => {
          const requestParentId = (payload.new as any)?.parent_id || (payload.old as any)?.parent_id;
          const isUsersRequest = requestParentId === currentParentIdRef.current || requestParentId === user.id;
          if (!isUsersRequest) return;

          if (payload.eventType === 'UPDATE') {
            const newStatus = (payload.new as any)?.status;
            const oldStatus = (payload.old as any)?.status;
            const studentId = (payload.new as any)?.student_id;
            const studentName = childrenRef.current.find(child => child.id === studentId)?.name || 'Student';

            if (newStatus !== oldStatus) {
              if (newStatus === 'called') {
                toast({ title: "Pickup Called", description: `${studentName} has been called for pickup.` });
              } else if (newStatus === 'completed') {
                toast({ title: "Pickup Completed", description: `Pickup for ${studentName} has been completed.` });
              } else if (newStatus === 'cancelled') {
                toast({ title: "Pickup Cancelled", description: `Pickup request for ${studentName} has been cancelled.`, variant: "destructive" });
              }
            }
          }

          setTimeout(() => {
            queryClient.invalidateQueries({ queryKey: ['optimized-parent-dashboard'] });
          }, 300);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient, toast]);

  const toggleChildSelection = useCallback((studentId: string) => {
    setSelectedChildren(prev => prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]);
  }, []);

  const handleRequestPickup = useCallback(async () => {
    if (selectedChildren.length === 0) return;

    setIsSubmitting(true);
    try {
      if (!user?.email && currentParentId) {
        await Promise.all(selectedChildren.map(studentId => createPickupRequestForUsernameUser(studentId, currentParentId)));
      } else {
        await Promise.all(selectedChildren.map(studentId => createPickupRequest(studentId)));
      }

      toast({
        title: "Pickup Request Submitted",
        description: `Successfully requested pickup for ${selectedChildren.length} child${selectedChildren.length > 1 ? 'ren' : ''}`,
      });

      setSelectedChildren([]);
      queryClient.invalidateQueries({ queryKey: ['optimized-parent-dashboard'] });
    } catch (error) {
      logger.error('Error requesting pickup:', error);
      toast({ title: "Error", description: "Failed to submit pickup request.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedChildren, toast, user, currentParentId, queryClient]);

  const pendingRequests = activeRequests.filter(req => req.status === 'pending');
  const calledRequests = activeRequests.filter(req => req.status === 'called');
  const authorizedRequests = activeRequests.filter(req => req.parentId !== currentParentId);

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
    refetch: () => queryClient.invalidateQueries({ queryKey: ['optimized-parent-dashboard'] })
  };
};
