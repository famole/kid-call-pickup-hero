
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/auth/AuthProvider';
import { useToast } from '@/hooks/use-toast';
import { supabase } from "@/integrations/supabase/client";
import { 
  getConsolidatedDashboardData, 
  clearParentIdCache,
  ConsolidatedDashboardData,
  SelfCheckoutStudent 
} from '@/services/dashboard/consolidatedDashboardService';
import { createPickupRequest } from '@/services/pickup/createPickupRequest';
import { createPickupRequestForUsernameUser } from '@/services/parent/usernameParentQueries';
import { Child, PickupRequest } from '@/types';

interface ChildWithType extends Child {
  isAuthorized?: boolean;
}

interface ParentInfo {
  id: string;
  name: string;
  email?: string;
}
import { logger } from '@/utils/logger';

export const useConsolidatedDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: consolidatedData, isLoading: loading } = useQuery({
    queryKey: ['consolidated-dashboard', user?.id, user?.email, user?.role],
    queryFn: async (): Promise<ConsolidatedDashboardData> => {
      return await getConsolidatedDashboardData(user!.id, user!.email, user!.role);
    },
    enabled: !!user?.id,
    refetchInterval: 20000,
  });

  const children = (consolidatedData?.children || []) as ChildWithType[];
  const activeRequests = consolidatedData?.activeRequests || [];
  const parentInfo = consolidatedData?.parentInfo || [];
  const selfCheckoutStudents = consolidatedData?.selfCheckoutStudents || [];
  const currentParentId = consolidatedData?.currentParentId;

  // Realtime subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('pickup_requests_consolidated_rq')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pickup_requests' },
        (payload) => {
          const isRelevant = activeRequests.some(req => 
            req.id === (payload.old as any)?.id || req.id === (payload.new as any)?.id
          );
          
          if (isRelevant || payload.eventType === 'INSERT') {
            setTimeout(() => queryClient.invalidateQueries({ queryKey: ['consolidated-dashboard'] }), 1000);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient, activeRequests]);

  // Cleanup on user change
  useEffect(() => {
    return () => { clearParentIdCache(); };
  }, [user?.id]);

  const toggleChildSelection = useCallback((childId: string) => {
    setSelectedChildren(prev => 
      prev.includes(childId) ? prev.filter(id => id !== childId) : [...prev, childId]
    );
  }, []);

  const handleRequestPickup = useCallback(async () => {
    if (selectedChildren.length === 0) {
      toast({ title: "No children selected", description: "Please select at least one child for pickup.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const isEmailUser = Boolean(user?.email);
      await Promise.all(selectedChildren.map(async (studentId) => {
        if (isEmailUser) {
          return await createPickupRequest(studentId);
        } else {
          return await createPickupRequestForUsernameUser(studentId, currentParentId!);
        }
      }));

      toast({
        title: "Pickup requests created",
        description: `Successfully created pickup requests for ${selectedChildren.length} child${selectedChildren.length > 1 ? 'ren' : ''}.`,
      });

      setSelectedChildren([]);
      queryClient.invalidateQueries({ queryKey: ['consolidated-dashboard'] });
    } catch (error) {
      logger.error('Error creating pickup requests:', error);
      toast({ title: "Error creating pickup requests", description: "Failed to create pickup requests.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedChildren, user?.email, currentParentId, toast, queryClient]);

  const pendingRequests = activeRequests.filter(req => req.status === 'pending');
  const calledRequests = activeRequests.filter(req => req.status === 'called');
  const authorizedRequests = activeRequests.filter(req => req.parentId !== currentParentId);

  return {
    children,
    pendingRequests,
    calledRequests,
    authorizedRequests,
    parentInfo,
    selfCheckoutStudents,
    loading,
    selectedChildren,
    isSubmitting,
    currentParentId,
    toggleChildSelection,
    handleRequestPickup,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['consolidated-dashboard'] })
  };
};
