
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCalledStudentsOptimized } from '@/services/pickup/optimizedPickupQueries';
import { PickupRequestWithDetails } from '@/types/supabase';
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/utils/logger';

export const useCalledStudents = (classId?: string, teacherClassIds?: string[]) => {
  const queryClient = useQueryClient();
  const subscriptionRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const { data: calledStudents = [], isLoading: loading } = useQuery({
    queryKey: ['called-students', classId, teacherClassIds],
    queryFn: async (): Promise<PickupRequestWithDetails[]> => {
      logger.info('Fetching called students with teacherClassIds:', teacherClassIds);
      const result = await getCalledStudentsOptimized(classId, teacherClassIds);
      logger.info(`Found ${result.length} called students`);
      return result;
    },
    enabled: classId !== null,
    refetchInterval: 20000, // Poll every 20 seconds as fallback
  });

  // Group students by class for display
  const childrenByClass = (calledStudents || []).reduce((groups: { [key: string]: PickupRequestWithDetails[] }, item: PickupRequestWithDetails) => {
    const classIdKey = item.child?.classId || 'unknown';
    if (!groups[classIdKey]) {
      groups[classIdKey] = [];
    }
    groups[classIdKey].push(item);
    return groups;
  }, {});

  // Realtime subscription to invalidate cache
  useEffect(() => {
    if (classId === null) return;

    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    
    const channel = supabase
      .channel(`called_students_rq_${Date.now()}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pickup_requests' },
        async (payload) => {
          logger.info('Called students real-time change detected:', payload.eventType);
          
          if (payload.eventType === 'UPDATE') {
            const newStatus = payload.new?.status;
            const oldStatus = payload.old?.status;
            
            if ((newStatus === 'called' && oldStatus !== 'called') || 
                (oldStatus === 'called' && newStatus !== 'called')) {
              queryClient.invalidateQueries({ queryKey: ['called-students'] });
            }
          } else if (payload.eventType === 'DELETE') {
            queryClient.invalidateQueries({ queryKey: ['called-students'] });
          }
        }
      )
      .subscribe((status) => {
        logger.info('Called students subscription status:', status);
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [classId, queryClient]);

  return {
    childrenByClass,
    loading,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['called-students'] })
  };
};
