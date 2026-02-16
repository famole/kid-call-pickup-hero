
import { useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCalledStudentsOptimized } from '@/services/pickup/optimizedPickupQueries';
import { getAllClasses } from '@/services/classService';
import { PickupRequestWithDetails } from '@/types/supabase';
import { Class } from '@/types';
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/utils/logger';
import { useClasses } from '@/hooks/useClasses';

export const useOptimizedCalledStudents = (selectedClass?: string) => {
  const queryClient = useQueryClient();
  const { data: classes = [] } = useClasses();

  const { data: calledChildren = [], isLoading: loading } = useQuery({
    queryKey: ['optimized-called-students', selectedClass],
    queryFn: async (): Promise<PickupRequestWithDetails[]> => {
      return await getCalledStudentsOptimized(selectedClass);
    },
  });

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('called_students_optimized_rq')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pickup_requests', filter: 'status=eq.called' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['optimized-called-students'] });
        }
      )
      .subscribe();
    
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const childrenByClass = useMemo(() => {
    const grouped: Record<string, PickupRequestWithDetails[]> = {};
    calledChildren.forEach(item => {
      if (!item.child || !item.class) return;
      const classId = String(item.class.id);
      if (!grouped[classId]) grouped[classId] = [];
      grouped[classId].push(item);
    });
    return grouped;
  }, [calledChildren]);

  return {
    classes,
    childrenByClass,
    loading,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['optimized-called-students'] })
  };
};
