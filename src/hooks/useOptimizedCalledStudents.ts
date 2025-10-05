
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { getCalledStudentsOptimized } from '@/services/pickup/optimizedPickupQueries';
import { getAllClasses } from '@/services/classService';
import { PickupRequestWithDetails } from '@/types/supabase';
import { Class } from '@/types';
import { supabase } from "@/integrations/supabase/client";
import { logger } from '@/utils/logger';

export const useOptimizedCalledStudents = (selectedClass?: string) => {
  const [calledChildren, setCalledChildren] = useState<PickupRequestWithDetails[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const lastFetchRef = useRef<number>(0);
  
  // Cache classes data
  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const classData = await getAllClasses();
        setClasses(classData);
      } catch (error) {
        logger.error('Error fetching classes:', error);
      }
    };
    
    fetchClasses();
  }, []);
  
  const fetchCalledChildren = useCallback(async (forceRefresh = false) => {
    const now = Date.now();
    if (!forceRefresh && now - lastFetchRef.current < 1000) {
      return;
    }

    setLoading(true);
    try {
      const data = await getCalledStudentsOptimized(selectedClass);
      setCalledChildren(data);
      lastFetchRef.current = now;
    } catch (error) {
      logger.error("Error fetching called children:", error);
      setCalledChildren([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClass]); // Removed lastFetch from dependencies
  
  useEffect(() => {
    fetchCalledChildren(true);
    
    // Single real-time subscription with intelligent debouncing
    const channel = supabase
      .channel('called_students_optimized')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pickup_requests',
          filter: 'status=eq.called'
        },
        async () => {
          // Debounce rapid changes
          const now = Date.now();
          if (now - lastFetchRef.current > 1000) {
            setTimeout(() => {
              fetchCalledChildren(true);
            }, 300);
          }
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchCalledChildren]);

  // Optimized grouping using useMemo
  const childrenByClass = useMemo(() => {
    const grouped: Record<string, PickupRequestWithDetails[]> = {};
    
    calledChildren.forEach(item => {
      if (!item.child || !item.class) return;
      
      const classId = String(item.class.id);
      if (!grouped[classId]) {
        grouped[classId] = [];
      }
      grouped[classId].push(item);
    });
    
    return grouped;
  }, [calledChildren]);

  return {
    classes,
    childrenByClass,
    loading,
    refetch: () => fetchCalledChildren(true)
  };
};
