import { useState, useEffect, useCallback, useRef } from 'react';
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

// Define types locally to match consolidated service
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
  
  // State management
  const [children, setChildren] = useState<ChildWithType[]>([]);
  const [activeRequests, setActiveRequests] = useState<PickupRequest[]>([]);
  const [parentInfo, setParentInfo] = useState<ParentInfo[]>([]);
  const [selfCheckoutStudents, setSelfCheckoutStudents] = useState<SelfCheckoutStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChildren, setSelectedChildren] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentParentId, setCurrentParentId] = useState<string | undefined>(undefined);
  
  // Refs for optimization
  const firstLoadRef = useRef(true);
  const lastFetchRef = useRef<number>(0);
  const subscriptionRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced data loading function
  const loadDashboardData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) {
      logger.log('No user ID available, skipping data load');
      return;
    }

    const now = Date.now();
    // Prevent excessive requests but allow forced refreshes
    if (!forceRefresh && now - lastFetchRef.current < 500) {
      logger.log('Debouncing consolidated dashboard data load request');
      return;
    }

    try {
      setLoading(true);
      
      // Use consolidated service to fetch all data in optimized batches
      const consolidatedData: ConsolidatedDashboardData = await getConsolidatedDashboardData(
        user.id,
        user.email,
        user.role
      );

      // Update all state at once
      setChildren(consolidatedData.children);
      setActiveRequests(consolidatedData.activeRequests);
      setParentInfo(consolidatedData.parentInfo);
      setSelfCheckoutStudents(consolidatedData.selfCheckoutStudents);
      setCurrentParentId(consolidatedData.currentParentId);

      lastFetchRef.current = now;
      logger.log('Consolidated dashboard data loaded successfully', {
        childrenCount: consolidatedData.children.length,
        requestsCount: consolidatedData.activeRequests.length,
        selfCheckoutCount: consolidatedData.selfCheckoutStudents.length
      });

    } catch (error) {
      logger.error('Error loading consolidated dashboard data:', error);
      toast({
        title: "Error loading dashboard",
        description: "Failed to load dashboard data. Please try refreshing.",
        variant: "destructive",
      });
    } finally {
      if (firstLoadRef.current) {
        firstLoadRef.current = false;
      }
      setLoading(false);
    }
  }, [user?.email, user?.id, user?.role, toast]);

  // Setup real-time subscription (optimized to avoid duplicate polling)
  const setupRealtimeSubscription = useCallback(() => {
    if (!user?.id || subscriptionRef.current) return;

    logger.log('Setting up real-time subscription for pickup requests');
    
    subscriptionRef.current = supabase
      .channel('pickup_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests'
        },
        (payload) => {
          logger.log('Real-time pickup request change detected:', payload);
          
          // Only refresh if this affects the current user
          const isRelevant = activeRequests.some(req => 
            req.id === (payload.old as any)?.id || req.id === (payload.new as any)?.id
          );
          
          if (isRelevant || payload.eventType === 'INSERT') {
            // Debounced refresh to avoid excessive updates
            setTimeout(() => loadDashboardData(true), 1000);
          }
        }
      )
      .subscribe((status) => {
        logger.log('Real-time subscription status:', status);
      });

    // Reduced polling frequency since we have real-time updates (every 20 seconds)
    intervalRef.current = setInterval(() => {
      loadDashboardData(true);
    }, 20000); // Every 20 seconds instead of 60

  }, [user?.id, activeRequests, loadDashboardData]);

  // Cleanup subscriptions
  const cleanupSubscriptions = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initial load and subscription setup
  useEffect(() => {
    loadDashboardData();
    setupRealtimeSubscription();

    return cleanupSubscriptions;
  }, [loadDashboardData, setupRealtimeSubscription, cleanupSubscriptions]);

  // Cleanup on user change
  useEffect(() => {
    return () => {
      cleanupSubscriptions();
      clearParentIdCache(); // Clear cache when user changes
    };
  }, [user?.id, cleanupSubscriptions]);

  // Child selection management
  const toggleChildSelection = useCallback((childId: string) => {
    setSelectedChildren(prev => 
      prev.includes(childId) 
        ? prev.filter(id => id !== childId)
        : [...prev, childId]
    );
  }, []);

  // Optimized pickup request creation
  const handleRequestPickup = useCallback(async () => {
    if (selectedChildren.length === 0) {
      toast({
        title: "No children selected",
        description: "Please select at least one child for pickup.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const isEmailUser = Boolean(user?.email);
      
      // Create pickup requests for all selected children
      const requests = selectedChildren.map(async (studentId) => {
        if (isEmailUser) {
          return await createPickupRequest(studentId);
        } else {
          return await createPickupRequestForUsernameUser(studentId, currentParentId!);
        }
      });

      await Promise.all(requests);

      toast({
        title: "Pickup requests created",
        description: `Successfully created pickup requests for ${selectedChildren.length} child${selectedChildren.length > 1 ? 'ren' : ''}.`,
      });

      // Clear selections and refresh data
      setSelectedChildren([]);
      await loadDashboardData(true);

    } catch (error) {
      logger.error('Error creating pickup requests:', error);
      toast({
        title: "Error creating pickup requests",
        description: "Failed to create pickup requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedChildren, user?.email, currentParentId, toast, loadDashboardData]);

  // Computed values for dashboard display
  const pendingRequests = activeRequests.filter(req => req.status === 'pending');
  const calledRequests = activeRequests.filter(req => req.status === 'called');
  const authorizedRequests = activeRequests.filter(req => req.parentId !== currentParentId);

  // Manual refresh function
  const refetch = useCallback(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  return {
    // Data
    children,
    pendingRequests,
    calledRequests,
    authorizedRequests,
    parentInfo,
    selfCheckoutStudents,
    
    // State
    loading,
    selectedChildren,
    isSubmitting,
    currentParentId,
    
    // Actions
    toggleChildSelection,
    handleRequestPickup,
    refetch
  };
};
